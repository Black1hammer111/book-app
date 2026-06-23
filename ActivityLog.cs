namespace BookSearchApp.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Page { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
