using Microsoft.EntityFrameworkCore;
using BookSearchApp.Models;

namespace BookSearchApp.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Book> Books => Set<Book>();
    public DbSet<User> Users => Set<User>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Book>(entity =>
        {
            entity.ToTable("Books");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Title).IsRequired().HasMaxLength(300);
            entity.Property(b => b.Author).IsRequired().HasMaxLength(200);
            entity.Property(b => b.Year).IsRequired();
            entity.Property(b => b.PdfUrl).HasMaxLength(1000);
            entity.HasIndex(b => b.Title);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Username).IsRequired().HasMaxLength(100);
            entity.Property(u => u.Email).HasMaxLength(200);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Token).HasMaxLength(64);
            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.ToTable("ActivityLogs");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Type).IsRequired().HasMaxLength(50);
            entity.Property(a => a.Username).HasMaxLength(100);
            entity.Property(a => a.Email).HasMaxLength(200);
            entity.Property(a => a.IpAddress).HasMaxLength(50);
            entity.Property(a => a.UserAgent).HasMaxLength(500);
            entity.Property(a => a.Page).HasMaxLength(200);
            entity.HasIndex(a => a.CreatedAt);
        });
    }
}
