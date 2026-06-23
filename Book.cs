namespace BookSearchApp.Models;

// [مقابلة] Model / Entity — كلاس يمثل جدول في قاعدة البيانات (POCO: Plain Old CLR Object)
// EF Core يحوّل هذا الكلاس تلقائياً إلى جدول SQL
public class Book
{
    // [مقابلة] Primary Key — EF Core يعرف أن Id هو المفتاح الأساسي بالاتفاقية (Convention)
    public int Id { get; set; }

    // [مقابلة] = string.Empty — قيمة افتراضية لتفادي null reference (Nullable Reference Types مُفعّل)
    public string Title  { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public int    Year   { get; set; }

    // [مقابلة] ? بعد النوع = Nullable — هذا العمود اختياري، قيمته ممكن تكون null في قاعدة البيانات
    public string? PdfUrl { get; set; }
}
