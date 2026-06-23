using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using BookSearchApp.Data;
using BookSearchApp.Models;
using BookSearchApp.Services;

var builder = WebApplication.CreateBuilder(args);

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string connectionString;
if (!string.IsNullOrWhiteSpace(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}
else
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=books.db";
}

var usePostgres = !string.IsNullOrWhiteSpace(databaseUrl)
    || (builder.Configuration.GetValue<bool>("UseGoogleCloudSQL")
        && !string.IsNullOrWhiteSpace(connectionString)
        && !connectionString.Contains("YOUR_PROJECT_ID"));

SqliteConnection? sqliteConn = null;

if (!usePostgres)
{
    // Share a single SQLite connection: EF Core 10 + SQLite opens separate connections
    // that cannot see tables created on a different connection in the same process.
    sqliteConn = new SqliteConnection(connectionString);
    sqliteConn.Open();
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (usePostgres)
        options.UseNpgsql(connectionString)
               .ConfigureWarnings(w => w.Ignore(
                   Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    else
        options.UseSqlite(sqliteConn!);
});

builder.Services.AddSingleton<SmartSearchEngine>();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .AllowAnyOrigin()
    .WithMethods("GET", "POST", "PUT", "DELETE")
    .WithHeaders("Content-Type", "X-Api-Key")));

// ── App ───────────────────────────────────────────────────────────────────────

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var engine = scope.ServiceProvider.GetRequiredService<SmartSearchEngine>();

    if (usePostgres)
    {
        db.Database.Migrate();

        db.Database.ExecuteSqlRaw(@"
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='Books_Id_seq') THEN
                    CREATE SEQUENCE ""Books_Id_seq"" START 1;
                    ALTER TABLE ""Books"" ALTER COLUMN ""Id"" SET DEFAULT nextval('""Books_Id_seq""');
                    ALTER SEQUENCE ""Books_Id_seq"" OWNED BY ""Books"".""Id"";
                END IF;
            END $$;
        ");

        db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Books"" ADD COLUMN IF NOT EXISTS ""PdfUrl"" text");

        db.Database.ExecuteSqlRaw(@"
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='Users_Id_seq') THEN
                    CREATE SEQUENCE ""Users_Id_seq"" START 1;
                    ALTER TABLE ""Users"" ALTER COLUMN ""Id"" SET DEFAULT nextval('""Users_Id_seq""');
                    ALTER SEQUENCE ""Users_Id_seq"" OWNED BY ""Users"".""Id"";
                END IF;
            END $$;
        ");

        db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Email"" text NOT NULL DEFAULT ''");

        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""ActivityLogs"" (
                ""Id""        SERIAL PRIMARY KEY,
                ""Type""      text NOT NULL,
                ""Username""  text,
                ""Email""     text,
                ""IpAddress"" text,
                ""UserAgent"" text,
                ""Page""      text,
                ""CreatedAt"" timestamptz NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ""IX_ActivityLogs_CreatedAt"" ON ""ActivityLogs""(""CreatedAt"" DESC);
            ALTER TABLE ""ActivityLogs"" ADD COLUMN IF NOT EXISTS ""Email"" text;
        ");
    }
    else
    {
        db.Database.EnsureCreated();

        using var checkCol = sqliteConn!.CreateCommand();
        checkCol.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Books') WHERE name = 'PdfUrl'";
        if ((long)checkCol.ExecuteScalar()! == 0)
        {
            using var alterCmd = sqliteConn.CreateCommand();
            alterCmd.CommandText = @"ALTER TABLE ""Books"" ADD COLUMN ""PdfUrl"" TEXT";
            alterCmd.ExecuteNonQuery();
        }

        using var checkEmailCol = sqliteConn!.CreateCommand();
        checkEmailCol.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Users') WHERE name = 'Email'";
        if ((long)checkEmailCol.ExecuteScalar()! == 0)
        {
            using var alterEmailCmd = sqliteConn.CreateCommand();
            alterEmailCmd.CommandText = @"ALTER TABLE ""Users"" ADD COLUMN ""Email"" TEXT NOT NULL DEFAULT ''";
            alterEmailCmd.ExecuteNonQuery();
        }
    }

    SeedData.Initialize(db);
    AuthorUpdater.UpdateAuthors(db);
    PdfUrlSeeder.UpdateBooks(db);
    engine.BuildModel(db.Books.ToList());
}

app.UseHttpsRedirection();
app.UseCors();

app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.Append("X-Frame-Options",           "DENY");
    ctx.Response.Headers.Append("X-Content-Type-Options",    "nosniff");
    ctx.Response.Headers.Append("Referrer-Policy",           "strict-origin-when-cross-origin");
    ctx.Response.Headers.Append("Permissions-Policy",        "camera=(), microphone=(), geolocation=(), payment=()");
    ctx.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    ctx.Response.Headers.Append("Cross-Origin-Opener-Policy",   "same-origin");
    ctx.Response.Headers.Append("Cross-Origin-Resource-Policy", "same-origin");
    ctx.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https://books.google.com https://books.googleusercontent.com https://encrypted-tbn0.gstatic.com; " +
        "connect-src 'self' https://www.googleapis.com; " +
        "frame-src 'none'; object-src 'none'; base-uri 'self'; " +
        "upgrade-insecure-requests;");
    ctx.Response.Headers.Remove("Server");
    ctx.Response.Headers.Remove("X-Powered-By");
    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles();

app.Use(async (ctx, next) =>
{
    await next();
    if (ctx.Request.Method == "GET"
        && ctx.Response.StatusCode == 200
        && !ctx.Request.Path.StartsWithSegments("/api")
        && !ctx.Request.Path.Value!.Contains('.'))
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var logDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ip = ctx.Connection.RemoteIpAddress?.ToString()
                     ?? ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? "unknown";
            var ua = ctx.Request.Headers["User-Agent"].ToString();
            logDb.ActivityLogs.Add(new ActivityLog
            {
                Type      = "visit",
                IpAddress = ip.Length > 50 ? ip[..50] : ip,
                UserAgent = ua.Length > 500 ? ua[..500] : ua,
                Page      = ctx.Request.Path.Value,
                CreatedAt = DateTime.UtcNow
            });
            await logDb.SaveChangesAsync();
        }
        catch { }
    }
});

var loginAttempts = new System.Collections.Concurrent.ConcurrentDictionary<string, (int count, DateTime reset)>();

bool IsRateLimited(string ip)
{
    var now = DateTime.UtcNow;
    var entry = loginAttempts.GetOrAdd(ip, _ => (0, now.AddMinutes(5)));
    if (now > entry.reset) entry = (0, now.AddMinutes(5));
    entry = (entry.count + 1, entry.reset);
    loginAttempts[ip] = entry;
    return entry.count > 10;
}

app.MapPost("/api/auth/login", async (LoginRequest req, AppDbContext db, IConfiguration config, HttpContext http) =>
{
    var ip = http.Request.Headers["X-Forwarded-For"].FirstOrDefault()
             ?? http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var ua = http.Request.Headers["User-Agent"].ToString();

    if (IsRateLimited(ip))
        return Results.StatusCode(429);

    var configuredUser = config["Admin:Username"];
    var configuredPass = config["Admin:Password"];

    if (string.IsNullOrEmpty(configuredUser) || string.IsNullOrEmpty(configuredPass))
        return Results.Problem("Admin credentials not configured.", statusCode: 500);

    if (!string.Equals(req.Username?.Trim(), configuredUser, StringComparison.OrdinalIgnoreCase) ||
        !string.Equals(req.Password, configuredPass, StringComparison.Ordinal))
    {
        try { db.ActivityLogs.Add(new ActivityLog { Type="admin_login_fail", Username=req.Username, IpAddress=ip[..Math.Min(ip.Length,50)], UserAgent=ua[..Math.Min(ua.Length,500)], CreatedAt=DateTime.UtcNow }); await db.SaveChangesAsync(); } catch { }
        return Results.Unauthorized();
    }

    try { db.ActivityLogs.Add(new ActivityLog { Type="admin_login", Username=configuredUser, IpAddress=ip[..Math.Min(ip.Length,50)], UserAgent=ua[..Math.Min(ua.Length,500)], CreatedAt=DateTime.UtcNow }); await db.SaveChangesAsync(); } catch { }

    return Results.Ok(new { token = config["ApiKey"], username = configuredUser });
});

app.MapPost("/api/auth/register", async (RegisterRequest req, AppDbContext db, IConfiguration config, HttpContext ctx) =>
{
    var username = req.Username?.Trim() ?? "";
    var email    = req.Email?.Trim().ToLower() ?? "";
    var password = req.Password ?? "";

    if (username.Length < 3 || password.Length < 6)
        return Results.BadRequest(new { error = "اسم المستخدم 3 أحرف على الأقل وكلمة المرور 6 على الأقل" });

    if (string.IsNullOrWhiteSpace(email) || !email.EndsWith("@gmail.com"))
        return Results.BadRequest(new { error = "يجب استخدام بريد Gmail (@gmail.com)" });

    if (await db.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower()))
        return Results.Conflict(new { error = "اسم المستخدم مستخدم بالفعل" });

    if (await db.Users.AnyAsync(u => u.Email == email))
        return Results.Conflict(new { error = "هذا البريد الإلكتروني مسجّل بالفعل" });

    var user = new User
    {
        Username     = username,
        Email        = email,
        PasswordHash = HashPassword(password),
        Token        = GenerateToken()
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();

    var ip2 = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault()
              ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var ua2 = ctx.Request.Headers["User-Agent"].ToString();
    try { db.ActivityLogs.Add(new ActivityLog { Type="register", Username=username, Email=email, IpAddress=ip2[..Math.Min(ip2.Length,50)], UserAgent=ua2[..Math.Min(ua2.Length,500)], CreatedAt=DateTime.UtcNow }); await db.SaveChangesAsync(); } catch { }

    await SendWelcomeEmail(email, username, config);

    return Results.Ok(new { token = user.Token, username = user.Username });
});

app.MapPost("/api/auth/user-login", async (LoginRequest req, AppDbContext db, HttpContext http) =>
{
    var ip = http.Request.Headers["X-Forwarded-For"].FirstOrDefault()
             ?? http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var ua = http.Request.Headers["User-Agent"].ToString();

    if (IsRateLimited(ip))
        return Results.StatusCode(429);

    var username = req.Username?.Trim() ?? "";
    if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(req.Password))
        return Results.BadRequest(new { error = "البيانات ناقصة" });

    var user = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
    if (user is null || !VerifyPassword(req.Password, user.PasswordHash))
    {
        try { db.ActivityLogs.Add(new ActivityLog { Type="login_fail", Username=username, IpAddress=ip[..Math.Min(ip.Length,50)], UserAgent=ua[..Math.Min(ua.Length,500)], CreatedAt=DateTime.UtcNow }); await db.SaveChangesAsync(); } catch { }
        return Results.Unauthorized();
    }

    user.Token = GenerateToken();
    if (!user.PasswordHash.StartsWith("$2"))
        user.PasswordHash = HashPassword(req.Password);
    try { db.ActivityLogs.Add(new ActivityLog { Type="login", Username=user.Username, Email=user.Email, IpAddress=ip[..Math.Min(ip.Length,50)], UserAgent=ua[..Math.Min(ua.Length,500)], CreatedAt=DateTime.UtcNow }); await db.SaveChangesAsync(); } catch { }

    return Results.Ok(new { token = user.Token, username = user.Username });
});

app.MapGet("/api/status", () => Results.Ok(new
{
    database    = usePostgres ? "Cloud SQL (PostgreSQL)" : "SQLite (Local)",
    environment = usePostgres ? "Cloud" : "Local",
    time        = DateTime.UtcNow.AddHours(3).ToString("yyyy-MM-dd HH:mm:ss")
}));

app.MapGet("/api/books", async (AppDbContext db) =>
    Results.Ok(await db.Books.ToListAsync()));

app.MapGet("/api/books/{id:int}", async (int id, AppDbContext db) =>
    await db.Books.FindAsync(id) is { } book
        ? Results.Ok(book)
        : Results.NotFound());

app.MapGet("/api/books/search", async (string? title, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(title))
        return Results.BadRequest("title is required.");

    var books = await db.Books
        .Where(b => b.Title.ToLower().Contains(title.ToLower()))
        .ToListAsync();

    return Results.Ok(books);
});

app.MapGet("/api/books/smart-search", async (string? q, AppDbContext db, SmartSearchEngine engine) =>
{
    var books = await db.Books.ToListAsync();
    return Results.Ok(engine.SmartSearch(q ?? "", books));
});

app.MapPost("/api/books", async (Book book, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(book.Title))  return Results.BadRequest("Title is required.");
    if (string.IsNullOrWhiteSpace(book.Author)) return Results.BadRequest("Author is required.");

    var title  = book.Title.Trim();
    var author = book.Author.Trim();

    if (await db.Books.AnyAsync(b => b.Title == title && b.Author == author))
        return Results.Conflict("Book already exists.");

    book.Id     = 0;
    book.Title  = title;
    book.Author = author;

    db.Books.Add(book);
    await db.SaveChangesAsync();
    return Results.Created($"/api/books/{book.Id}", book);
}).RequireApiKey(app.Configuration);

app.MapPut("/api/books/{id:int}", async (int id, Book updated, AppDbContext db) =>
{
    var book = await db.Books.FindAsync(id);
    if (book is null) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(updated.Title))  return Results.BadRequest("Title is required.");
    if (string.IsNullOrWhiteSpace(updated.Author)) return Results.BadRequest("Author is required.");
    book.Title  = updated.Title.Trim();
    book.Author = updated.Author.Trim();
    book.Year   = updated.Year;
    book.PdfUrl = string.IsNullOrWhiteSpace(updated.PdfUrl) ? null : updated.PdfUrl.Trim();
    await db.SaveChangesAsync();
    return Results.Ok(book);
}).RequireApiKey(app.Configuration);

app.MapDelete("/api/books/{id:int}", async (int id, AppDbContext db) =>
{
    var book = await db.Books.FindAsync(id);
    if (book is null) return Results.NotFound();
    db.Books.Remove(book);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = $"Deleted '{book.Title}'." });
}).RequireApiKey(app.Configuration);

app.MapGet("/api/admin/stats", async (AppDbContext db) =>
{
    var books = await db.Books.CountAsync();
    var users = await db.Users.CountAsync();
    var pdfs  = await db.Books.CountAsync(b => b.PdfUrl != null && b.PdfUrl != "");
    return Results.Ok(new { books, users, pdfs });
}).RequireApiKey(app.Configuration);

app.MapGet("/api/admin/users", async (AppDbContext db) =>
{
    var users = await db.Users
        .Select(u => new { u.Id, u.Username, u.Email })
        .OrderBy(u => u.Id)
        .ToListAsync();
    return Results.Ok(users);
}).RequireApiKey(app.Configuration);

app.MapGet("/api/admin/analytics", async (AppDbContext db) =>
{
    var now = DateTime.UtcNow.AddHours(3);
    var from14 = now.AddDays(-13).Date;

    var logs14 = await db.ActivityLogs
        .Where(a => a.CreatedAt >= from14)
        .ToListAsync();

    var days = Enumerable.Range(0, 14)
        .Select(i => from14.AddDays(i))
        .ToList();

    var dailyVisits   = days.Select(d => logs14.Count(a => a.CreatedAt.AddHours(3).Date == d && a.Type == "visit")).ToList();
    var dailyLogins   = days.Select(d => logs14.Count(a => a.CreatedAt.AddHours(3).Date == d && a.Type == "login")).ToList();
    var dailyRegs     = days.Select(d => logs14.Count(a => a.CreatedAt.AddHours(3).Date == d && a.Type == "register")).ToList();
    var labels        = days.Select(d => d.ToString("MM/dd")).ToList();

    var allLogs = await db.ActivityLogs.ToListAsync();
    var breakdown = new {
        visits   = allLogs.Count(a => a.Type == "visit"),
        logins   = allLogs.Count(a => a.Type == "login"),
        regs     = allLogs.Count(a => a.Type == "register"),
        fails    = allLogs.Count(a => a.Type == "login_fail" || a.Type == "admin_login_fail"),
        admins   = allLogs.Count(a => a.Type == "admin_login"),
    };

    var browsers = allLogs
        .Where(a => a.UserAgent != null)
        .GroupBy(a =>
            a.UserAgent!.Contains("Mobile") ? "Mobile" :
            a.UserAgent.Contains("Chrome")  ? "Chrome" :
            a.UserAgent.Contains("Firefox") ? "Firefox" :
            a.UserAgent.Contains("Safari")  ? "Safari" :
            a.UserAgent.Contains("Edge")    ? "Edge" : "Other")
        .Select(g => new { browser = g.Key, count = g.Count() })
        .OrderByDescending(g => g.count)
        .ToList();

    var totalVisits = allLogs.Count(a => a.Type == "visit");
    var todayVisits = allLogs.Count(a => a.CreatedAt.AddHours(3).Date == now.Date);
    var totalUsers  = await db.Users.CountAsync();
    var totalBooks  = await db.Books.CountAsync();

    return Results.Ok(new {
        labels, dailyVisits, dailyLogins, dailyRegs,
        breakdown, browsers,
        totalVisits, todayVisits, totalUsers, totalBooks
    });
}).RequireApiKey(app.Configuration);

app.MapGet("/api/admin/activity", async (AppDbContext db, int limit = 200) =>
{
    var logs = await db.ActivityLogs
        .OrderByDescending(a => a.CreatedAt)
        .Take(Math.Min(limit, 500))
        .Select(a => new {
            a.Id, a.Type, a.Username, a.Email,
            a.IpAddress, a.UserAgent, a.Page,
            CreatedAt = a.CreatedAt.AddHours(3).ToString("yyyy-MM-dd HH:mm:ss")
        })
        .ToListAsync();
    return Results.Ok(logs);
}).RequireApiKey(app.Configuration);

app.MapGet("/admin/users", async (HttpContext http, AppDbContext db, IConfiguration config) =>
{
    var key = http.Request.Headers["X-Api-Key"].ToString();
    if (!string.Equals(key, config["ApiKey"], StringComparison.Ordinal))
    {
        http.Response.StatusCode = 401;
        await http.Response.WriteAsync("غير مصرح");
        return;
    }
    var users = await db.Users.OrderBy(u => u.Id).ToListAsync();
    var rows = string.Join("", users.Select(u =>
        $"<tr><td>{u.Id}</td><td>{System.Net.WebUtility.HtmlEncode(u.Username)}</td><td>{System.Net.WebUtility.HtmlEncode(string.IsNullOrEmpty(u.Email) ? "—" : u.Email)}</td></tr>"));
    var html = $$"""
    <!DOCTYPE html><html lang="ar" dir="rtl">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>قائمة المستخدمين</title>
    <style>
      body{font-family:Arial,sans-serif;background:#001e32;color:#fff;padding:30px;direction:rtl}
      h2{color:#00C8E8;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;background:rgba(255,255,255,.05);border-radius:12px;overflow:hidden}
      th{background:rgba(0,119,182,.4);padding:12px 16px;text-align:right;color:#00C8E8;font-size:.9rem}
      td{padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.07);font-size:.88rem}
      tr:hover td{background:rgba(255,255,255,.04)}
      .badge{background:rgba(0,150,199,.3);color:#00C8E8;border-radius:99px;padding:2px 10px;font-size:.78rem}
    </style></head>
    <body>
      <h2>👥 المستخدمون المسجّلون ({{users.Count}})</h2>
      <table><thead><tr><th>#</th><th>اسم المستخدم</th><th>البريد الإلكتروني</th></tr></thead>
      <tbody>{{rows}}</tbody></table>
    </body></html>
    """;
    http.Response.ContentType = "text/html; charset=utf-8";
    await http.Response.WriteAsync(html);
});

app.MapDelete("/api/admin/users/{id:int}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();
    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = $"Deleted user '{user.Username}'." });
}).RequireApiKey(app.Configuration);

app.MapDelete("/api/books/duplicates", async (AppDbContext db) =>
{
    var duplicates = (await db.Books.ToListAsync())
        .GroupBy(b => (b.Title.ToLower().Trim(), b.Author.ToLower().Trim()))
        .Where(g => g.Count() > 1)
        .SelectMany(g => g.OrderBy(b => b.Id).Skip(1))
        .ToList();

    if (duplicates.Count == 0)
        return Results.Ok(new { message = "No duplicates found.", deletedCount = 0 });

    db.Books.RemoveRange(duplicates);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = $"Deleted {duplicates.Count} duplicates.", deletedCount = duplicates.Count });
}).RequireApiKey(app.Configuration);

app.Lifetime.ApplicationStopped.Register(() => sqliteConn?.Dispose());

app.Run();

static string HashPassword(string password)
    => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

static bool VerifyPassword(string password, string hash)
{
    if (hash.StartsWith("$2"))
        return BCrypt.Net.BCrypt.Verify(password, hash);
    using var sha = System.Security.Cryptography.SHA256.Create();
    var legacy = Convert.ToHexString(sha.ComputeHash(
        System.Text.Encoding.UTF8.GetBytes(password + "_مكتبة_المياه_2026")
    )).ToLower();
    return legacy == hash;
}

static string GenerateToken()
    => Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24)).ToLower();

static async Task SendWelcomeEmail(string to, string username, IConfiguration config)
{
    Console.WriteLine($"[EMAIL] Starting send to: {to}");
    try
    {
        var from = config["Gmail:From"] ?? config["Gmail__From"] ?? "omar5567j@gmail.com";
        var pass = config["Gmail:AppPassword"] ?? config["Gmail__AppPassword"];
        if (string.IsNullOrWhiteSpace(pass)) { Console.WriteLine("[EMAIL] FAILED: pass is null"); return; }

        var html = $"""
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a1929">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1929;padding:30px 0">
            <tr><td align="center">
              <table width="540" cellpadding="0" cellspacing="0" style="background:#0d2137;border-radius:20px;overflow:hidden;border:1px solid #1e4060">
                <tr><td style="background:linear-gradient(135deg,#001830 0%,#003B5C 50%,#0077B6 100%);padding:40px 32px;text-align:center">
                  <div style="margin-bottom:16px">
                    <svg viewBox="0 0 64 80" width="56" height="70" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 16px rgba(0,180,216,.5))">
                      <defs>
                        <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#00D4F0"/>
                          <stop offset="100%" stop-color="#0077B6"/>
                        </linearGradient>
                      </defs>
                      <path d="M32 2C32 2 4 34 4 52C4 67.5 16.5 80 32 80C47.5 80 60 67.5 60 52C60 34 32 2 32 2Z" fill="url(#dg)"/>
                      <path d="M44 52C44 58.6 38.6 64 32 64" stroke="rgba(255,255,255,0.55)" stroke-width="5" stroke-linecap="round" fill="none"/>
                    </svg>
                  </div>
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;letter-spacing:1px">مكتبة المياه</h1>
                  <p style="color:rgba(255,255,255,.65);margin:6px 0 0;font-size:13px;letter-spacing:2px">WATER LIBRARY</p>
                </td></tr>
                <tr><td style="padding:32px 36px">
                  <h2 style="color:#00C8E8;margin:0 0 16px;font-size:20px">أهلاً بك بمكتبة المياه الرقمية 💧</h2>
                  <p style="color:#b0cce0;line-height:1.85;margin:0 0 20px;font-size:15px">
                    مرحباً <b style="color:#fff">{System.Net.WebUtility.HtmlEncode(username)}</b>،<br>
                    يسعدنا انضمامك إلى <b style="color:#fff">مكتبة المياه الرقمية</b>.<br>
                    حسابك الآن جاهز — استمتع بتصفح أكثر من 30 كتاباً في علوم المياه والبيئة والحضارة، كلها مجانية!
                  </p>
                  <div style="background:#0a2740;border:1px solid #1e4060;border-radius:12px;padding:18px 22px;margin-bottom:24px">
                    <div style="color:#7ab8d8;font-size:13px;margin-bottom:6px">📧 البريد المسجّل</div>
                    <div style="color:#fff;font-size:14px;font-weight:700">{System.Net.WebUtility.HtmlEncode(to)}</div>
                    <div style="height:1px;background:#1e4060;margin:12px 0"></div>
                    <div style="color:#7ab8d8;font-size:13px;margin-bottom:6px">👤 اسم المستخدم</div>
                    <div style="color:#fff;font-size:14px;font-weight:700">{System.Net.WebUtility.HtmlEncode(username)}</div>
                  </div>
                  <div style="text-align:center">
                    <a href="https://book-app-1014107810225.us-west1.run.app"
                       style="display:inline-block;background:linear-gradient(135deg,#0077B6,#00a8e8);color:#fff;text-decoration:none;padding:13px 32px;border-radius:99px;font-weight:700;font-size:15px">
                      زيارة المكتبة ←
                    </a>
                  </div>
                </td></tr>
                <tr><td style="background:#081a2d;padding:18px 36px;text-align:center;border-top:1px solid #1e4060">
                  <p style="color:#4a7a9b;font-size:12px;margin:0">© 2026 مكتبة المياه — جميع الحقوق محفوظة</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

        var message = new MimeKit.MimeMessage();
        message.From.Add(new MimeKit.MailboxAddress("مكتبة المياه", from));
        message.To.Add(new MimeKit.MailboxAddress(username, to));
        message.Subject = "أهلاً بك بمكتبة المياه الرقمية 💧";
        message.Body = new MimeKit.TextPart(MimeKit.Text.TextFormat.Html) { Text = html };

        using var smtp = new MailKit.Net.Smtp.SmtpClient();
        await smtp.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(from, pass);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
        Console.WriteLine($"[EMAIL] SUCCESS: sent to {to}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[EMAIL] ERROR {ex.GetType().Name}: {ex.Message}");
    }
}

record LoginRequest(string? Username, string? Password);
record RegisterRequest(string? Username, string? Email, string? Password);

static class SeedData
{
    public static void Initialize(AppDbContext db)
    {
        if (db.Books.Any()) return;

        db.Books.AddRange(
            new Book { Title = "الماء والغذاء: مستقبل البشرية",          Author = "د. سليم أحمد",             Year = 2021 },
            new Book { Title = "البحار والمحيطات: عجائب أسرار الأعماق",  Author = "عمر الفاروق",               Year = 2019 },
            new Book { Title = "تحلية المياه: تقنيات المستقبل",           Author = "م. خالد المنصور",           Year = 2022 },
            new Book { Title = "أسرار جزيء الماء: المعجزة الحيوية",       Author = "د. كمال الراشدي",           Year = 2015 },
            new Book { Title = "تاريخ المياه: كيف شكلت الحضارة",          Author = "د. سلطان المنصوري",         Year = 2010 },
            new Book { Title = "حروب المياه: الصراع القادم",              Author = "د. محمد العمري",            Year = 2018 },
            new Book { Title = "ترشيد استهلاك المياه: دليل عملي",         Author = "جمعية المياه السعودية",     Year = 2020 },
            new Book { Title = "دورة المياه في الطبيعة",                  Author = "د. نادية حسن",              Year = 2017 },
            new Book { Title = "المياه الجوفية: الكنوز المخفية",           Author = "م. فيصل العتيبي",           Year = 2016 },
            new Book { Title = "تلوث المياه وطرق معالجتها",               Author = "د. أحمد خليل",              Year = 2019 },
            new Book { Title = "أنهار العالم: شريان الحياة",               Author = "د. جمال الرشيدي",           Year = 2012 },
            new Book { Title = "إدارة الموارد المائية المستدامة",           Author = "هيئة المياه والبيئة",       Year = 2023 },
            new Book { Title = "الماء في القرآن والسنة",                   Author = "د. سليمان النجار",          Year = 2008 },
            new Book { Title = "المياه الإقليمية والقانون الدولي",          Author = "د. طارق الغامدي",           Year = 2014 },
            new Book { Title = "الجليد والمناخ العالمي",                   Author = "د. ليلى عبد الحميد",        Year = 2021 },
            new Book { Title = "الكائنات المائية وسلاسل الغذاء",           Author = "د. فوزي الشمري",            Year = 2018 },
            new Book { Title = "تكنولوجيا معالجة مياه الصرف",             Author = "م. ياسر القحطاني",          Year = 2020 },
            new Book { Title = "الحصاد المائي والأمن الغذائي",             Author = "د. سميرة إبراهيم",          Year = 2022 },
            new Book { Title = "الفيضانات وتدابير الحماية",                Author = "الهيئة العامة للأرصاد",    Year = 2019 },
            new Book { Title = "الجفاف والتصحر: دليل المواجهة",            Author = "د. مصطفى الشهري",           Year = 2017 },
            new Book { Title = "المحيطات والتغير المناخي",                  Author = "معهد الكويت للأبحاث العلمية", Year = 2023 },
            new Book { Title = "اقتصاديات المياه وسعر اللتر",              Author = "د. رانيا يوسف",             Year = 2022 },
            new Book { Title = "الماء والصحة: دليل الترطيب المثالي",       Author = "د. سارة فهد",               Year = 2020 },
            new Book { Title = "الحياة المائية في البحيرات العذبة",         Author = "د. أمجد هلال",              Year = 2015 },
            new Book { Title = "نظام الري الذكي في الزراعة",               Author = "م. علي الزهراني",           Year = 2021 },
            new Book { Title = "الهندسة المائية: السدود والجسور",           Author = "د. حسن الرفاعي",            Year = 2016 },
            new Book { Title = "الماء والطاقة: الترابط الحيوي",             Author = "م. سعيد العجلان",           Year = 2023 },
            new Book { Title = "عجائب المخلوقات المائية في الأعماق",        Author = "د. زكريا دهيم",             Year = 2018 },
            new Book { Title = "الأمطار والحياة الفطرية",                   Author = "د. منى الحربي",             Year = 2019 },
            new Book { Title = "رطوبة الجو والغيوم",                       Author = "د. منصور عبيد",             Year = 2017 }
        );

        db.SaveChanges();
    }
}

static class PdfUrlSeeder
{
    private static readonly Dictionary<string, string> PdfLinks = new()
    {
        ["الماء في القرآن والسنة"]              = "https://archive.org/download/3_20240714_202407_mktbhazzaen/%D9%83%D8%AA%D8%A7%D8%A8%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D8%AC1.pdf",
        ["تلوث المياه وطرق معالجتها"]           = "https://archive.org/download/moalaja_myah_alsarf_alsihy/moalaja_myah_alsarf_alsihy.pdf",
        ["تكنولوجيا معالجة مياه الصرف"]         = "https://archive.org/download/moalaja_myah_alsarf_alsihy/moalaja_myah_alsarf_alsihy.pdf",
        ["أسرار جزيء الماء: المعجزة الحيوية"]  = "https://archive.org/download/20211027_20211027_0803/%D9%85%D8%AF%D8%AE%D9%84%20%D8%A7%D9%84%D9%89%20%D9%83%D9%8A%D9%85%D9%8A%D8%A7%D8%A1%20%D8%A7%D9%84%D9%85%D9%8A%D8%A7%D9%87%20%D8%AF.%D9%86%D8%B5%D8%B1%20%D8%A7%D9%84%D8%AD%D8%A7%D9%8A%D9%83.pdf",
        ["تاريخ المياه: كيف شكلت الحضارة"]     = "https://archive.org/download/Tokyo.Elektro_20170910/%D8%A7%D9%84%D9%85%D9%8A%D8%A7%D9%87%20%D9%88%D8%AF%D9%88%D8%B1%D9%87%D8%A7%20%D8%A7%D9%84%D8%AD%D8%B6%D8%A7%D8%B1%D9%8A%20%D9%81%D9%8A%20%D8%A8%D9%84%D8%A7%D8%AF%20%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8.pdf",
        ["أنهار العالم: شريان الحياة"]          = "https://archive.org/download/kaoikaprophe_20180521/%D9%84%D8%BA%D8%B2%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A3%D9%86%D8%AF%D9%84%D8%B3.pdf",
        ["دورة المياه في الطبيعة"]              = "https://www.usgs.gov/media/files/water-cycle-arabic-pdf",
        ["إدارة الموارد المائية المستدامة"]     = "https://www.fao.org/fileadmin/user_upload/rome2007/docs/Water_Arab_World_full.pdf",
        ["الماء والصحة: دليل الترطيب المثالي"] = "https://archive.org/download/03_20220901_20220901_1724/01_.pdf",
        ["حروب المياه: الصراع القادم"]          = "https://www.unescwa.org/sites/default/files/event/materials/8-%20Water%20challenges%20in%20the%20Arab%20region%202400690E.pdf",
        ["البحار والمحيطات: عجائب أسرار الأعماق"] = "https://archive.org/download/3_20240714_202407_mktbhazzaen/%D9%83%D8%AA%D8%A7%D8%A8%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D8%AC2.pdf",
        ["المياه الجوفية: الكنوز المخفية"]      = "https://archive.org/download/3_20240714_202407_mktbhazzaen/%D9%83%D8%AA%D8%A7%D8%A8%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D8%AC3.pdf",
        ["الماء والغذاء: مستقبل البشرية"]        = "https://www.fao.org/fileadmin/user_upload/rome2007/docs/Water_Arab_World_full.pdf",
        ["تحلية المياه: تقنيات المستقبل"]         = "https://archive.org/download/3_20240714_202407_mktbhazzaen/%D9%83%D8%AA%D8%A7%D8%A8%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D8%AC1.pdf",
        ["ترشيد استهلاك المياه: دليل عملي"]       = "https://www.unescwa.org/sites/default/files/event/materials/8-%20Water%20challenges%20in%20the%20Arab%20region%202400690E.pdf",
        ["المياه الإقليمية والقانون الدولي"]       = "https://archive.org/download/3_20240714_202407_mktbhazzaen/%D9%83%D8%AA%D8%A7%D8%A8%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D8%AC3.pdf",
        ["الجليد والمناخ العالمي"]                = "https://www.usgs.gov/media/files/water-cycle-arabic-pdf",
        ["الكائنات المائية وسلاسل الغذاء"]        = "https://archive.org/download/20211027_20211027_0803/%D9%85%D8%AF%D8%AE%D9%84%20%D8%A7%D9%84%D9%89%20%D9%83%D9%8A%D9%85%D9%8A%D8%A7%D8%A1%20%D8%A7%D9%84%D9%85%D9%8A%D8%A7%D9%87%20%D8%AF.%D9%86%D8%B5%D8%B1%20%D8%A7%D9%84%D8%AD%D8%A7%D9%8A%D9%83.pdf",
        ["الحصاد المائي والأمن الغذائي"]          = "https://www.fao.org/fileadmin/user_upload/rome2007/docs/Water_Arab_World_full.pdf",
        ["الفيضانات وتدابير الحماية"]              = "https://www.unescwa.org/sites/default/files/event/materials/8-%20Water%20challenges%20in%20the%20Arab%20region%202400690E.pdf",
        ["الجفاف والتصحر: دليل المواجهة"]         = "https://archive.org/download/3_20240714_202407_mktbhazzaen/%D9%83%D8%AA%D8%A7%D8%A8%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D8%AC2.pdf",
        ["المحيطات والتغير المناخي"]               = "https://archive.org/download/Tokyo.Elektro_20170910/%D8%A7%D9%84%D9%85%D9%8A%D8%A7%D9%87%20%D9%88%D8%AF%D9%88%D8%B1%D9%87%D8%A7%20%D8%A7%D9%84%D8%AD%D8%B6%D8%A7%D8%B1%D9%8A%20%D9%81%D9%8A%20%D8%A8%D9%84%D8%A7%D8%AF%20%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8.pdf",
        ["اقتصاديات المياه وسعر اللتر"]            = "https://www.unescwa.org/sites/default/files/event/materials/8-%20Water%20challenges%20in%20the%20Arab%20region%202400690E.pdf",
        ["الحياة المائية في البحيرات العذبة"]      = "https://archive.org/download/kaoikaprophe_20180521/%D9%84%D8%BA%D8%B2%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A3%D9%86%D8%AF%D9%84%D8%B3.pdf",
        ["نظام الري الذكي في الزراعة"]             = "https://www.fao.org/fileadmin/user_upload/rome2007/docs/Water_Arab_World_full.pdf",
        ["الهندسة المائية: السدود والجسور"]        = "https://archive.org/download/3_20240714_202407_mktbhazzaen/%D9%83%D8%AA%D8%A7%D8%A8%20%D8%A7%D9%84%D9%85%D8%A7%D8%A1%20%D8%AC1.pdf",
        ["الماء والطاقة: الترابط الحيوي"]          = "https://www.unescwa.org/sites/default/files/event/materials/8-%20Water%20challenges%20in%20the%20Arab%20region%202400690E.pdf",
        ["عجائب المخلوقات المائية في الأعماق"]     = "https://archive.org/download/20211027_20211027_0803/%D9%85%D8%AF%D8%AE%D9%84%20%D8%A7%D9%84%D9%89%20%D9%83%D9%8A%D9%85%D9%8A%D8%A7%D8%A1%20%D8%A7%D9%84%D9%85%D9%8A%D8%A7%D9%87%20%D8%AF.%D9%86%D8%B5%D8%B1%20%D8%A7%D9%84%D8%AD%D8%A7%D9%8A%D9%83.pdf",
        ["الأمطار والحياة الفطرية"]                = "https://www.usgs.gov/media/files/water-cycle-arabic-pdf",
        ["رطوبة الجو والغيوم"]                     = "https://archive.org/download/03_20220901_20220901_1724/01_.pdf",
    };

    public static void UpdateBooks(AppDbContext db)
    {
        bool changed = false;
        foreach (var (title, url) in PdfLinks)
        {
            var book = db.Books.FirstOrDefault(b => b.Title == title);
            if (book is not null && string.IsNullOrEmpty(book.PdfUrl))
            {
                book.PdfUrl = url;
                changed = true;
            }
        }
        if (changed) db.SaveChanges();
    }
}

static class AuthorUpdater
{
    private static readonly Dictionary<string, string> AuthorMap = new()
    {
        ["د. كمال الجيلاني"]      = "د. كمال الراشدي",
        ["ستيفن سولومون"]         = "د. سلطان المنصوري",
        ["جون بولت"]              = "د. محمد العمري",
        ["الجمعية العربية للمياه"] = "جمعية المياه السعودية",
        ["د. جمال حمدان"]         = "د. جمال الرشيدي",
        ["منظمة الفاو"]           = "هيئة المياه والبيئة",
        ["د. زغلول النجار"]       = "د. سليمان النجار",
        ["د. طارق البشري"]        = "د. طارق الغامدي",
        ["د. مصطفى كمال"]         = "د. مصطفى الشهري",
        ["معهد أبحاث البحار"]     = "معهد الكويت للأبحاث العلمية",
    };

    public static void UpdateAuthors(AppDbContext db)
    {
        bool changed = false;
        foreach (var (oldAuthor, newAuthor) in AuthorMap)
        {
            var books = db.Books.Where(b => b.Author == oldAuthor).ToList();
            foreach (var book in books) { book.Author = newAuthor; changed = true; }
        }
        if (changed) db.SaveChanges();
    }
}

static class ApiKeyEndpointExtensions
{
    public static RouteHandlerBuilder RequireApiKey(this RouteHandlerBuilder builder, IConfiguration config)
    {
        return builder.AddEndpointFilter(async (ctx, next) =>
        {
            var configured = config["ApiKey"];
            if (string.IsNullOrWhiteSpace(configured))
                return Results.Problem("ApiKey is not configured on the server.", statusCode: 500);

            var provided = ctx.HttpContext.Request.Headers["X-Api-Key"].ToString();
            if (!string.Equals(provided, configured, StringComparison.Ordinal))
                return Results.Unauthorized();

            return await next(ctx);
        });
    }
}
