using System.Text.Json.Serialization;
using BandPortal.Repository;
using BandPortal.Service.Services;
using BandPortal.Web.Endpoints;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IBandRepository>(_ =>
{
    var connectionString = builder.Configuration.GetConnectionString("Default");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        return new PostgresBandRepository(connectionString);
    }

    var dataDirectory = Path.Combine(builder.Environment.ContentRootPath, "App_Data");
    var databasePath = Path.Combine(dataDirectory, "band-db.json");
    return new JsonBandRepository(databasePath);
});
builder.Services.AddScoped<ShowsService>();
builder.Services.AddScoped<NewsService>();
builder.Services.AddScoped<MusicService>();
builder.Services.AddScoped<MerchService>();
builder.Services.AddScoped<OrdersService>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "https://localhost:5173",
                "https://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("frontend");

var uploadsDirectory = Path.Combine(app.Environment.ContentRootPath, "App_Data", "uploads");
Directory.CreateDirectory(uploadsDirectory);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsDirectory),
    RequestPath = "/uploads"
});

app.MapGet("/", () => Results.Ok(new
{
    name = "Lost In Reverie API",
    health = "online"
}));

app.MapPublicEndpoints();
app.MapAdminEndpoints();

app.Run();
