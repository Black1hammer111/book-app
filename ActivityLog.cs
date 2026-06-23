namespace BookSearchApp.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty; // visit | login | login_fail | register | admin_login | admin_login_fail
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Page { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
