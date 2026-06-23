using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookSearchApp.Migrations
{
    public partial class AddPdfUrlToBook : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PdfUrl",
                table: "Books",
                type: "TEXT",
                maxLength: 1000,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PdfUrl",
                table: "Books");
        }
    }
}
