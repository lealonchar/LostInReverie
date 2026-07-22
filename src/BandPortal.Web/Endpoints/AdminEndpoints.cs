using BandPortal.Domain.Entities;
using BandPortal.Service.Models;
using BandPortal.Service.Services;
using BandPortal.Web.Dtos;
using BandPortal.Web.Requests;

namespace BandPortal.Web.Endpoints;

public static class AdminEndpoints
{
    private const long MaxImageBytes = 5 * 1024 * 1024;
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif"
    };

    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/api/admin");
        admin.AddEndpointFilter(RequireAdminToken);

        admin.MapPost("/shows", async (
            CreateShowRequest request,
            ShowsService showsService,
            CancellationToken cancellationToken) =>
        {
            var result = await showsService.CreateAsync(new ShowDraft(
                request.Title,
                request.Venue,
                request.City,
                request.StartsAt,
                request.TicketUrl,
                request.Notes,
                request.IsSoldOut), cancellationToken);

            return result.IsSuccess && result.Value is not null
                ? Results.Created($"/api/shows/{result.Value.Id}", result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        admin.MapDelete("/shows/{id:guid}", async (
            Guid id,
            ShowsService showsService,
            CancellationToken cancellationToken) =>
        {
            var removed = await showsService.DeleteAsync(id, cancellationToken);
            return removed ? Results.NoContent() : Results.NotFound();
        });

        admin.MapPost("/news", async (
            CreateNewsPostRequest request,
            NewsService newsService,
            CancellationToken cancellationToken) =>
        {
            var result = await newsService.CreateAsync(new NewsPostDraft(
                request.Title,
                request.Category,
                request.Body,
                request.IsPinned), cancellationToken);

            return result.IsSuccess && result.Value is not null
                ? Results.Created($"/api/news/{result.Value.Id}", result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        admin.MapDelete("/news/{id:guid}", async (
            Guid id,
            NewsService newsService,
            CancellationToken cancellationToken) =>
        {
            var removed = await newsService.DeleteAsync(id, cancellationToken);
            return removed ? Results.NoContent() : Results.NotFound();
        });

        admin.MapGet("/music", async (
            MusicService musicService,
            CancellationToken cancellationToken) =>
        {
            var releases = await musicService.GetAllAsync(cancellationToken);
            return releases.Select(release => release.ToDto()).ToList();
        });

        admin.MapPost("/music", async (
            CreateMusicReleaseRequest request,
            MusicService musicService,
            CancellationToken cancellationToken) =>
        {
            var result = await musicService.CreateAsync(new MusicReleaseDraft(
                request.Title,
                request.ReleaseType,
                request.ReleaseYear,
                request.CoverImageUrl,
                request.ListenUrl,
                request.EmbedUrl,
                request.IsPublished,
                request.Links?
                    .Select(link => new MusicPlatformLinkDraft(link.Platform, link.Url))
                    .ToList() ?? []), cancellationToken);

            return result.IsSuccess && result.Value is not null
                ? Results.Created($"/api/music/{result.Value.Id}", result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        admin.MapDelete("/music/{id:guid}", async (
            Guid id,
            MusicService musicService,
            CancellationToken cancellationToken) =>
        {
            var removed = await musicService.DeleteAsync(id, cancellationToken);
            return removed ? Results.NoContent() : Results.NotFound();
        });

        admin.MapGet("/merch", async (
            MerchService merchService,
            CancellationToken cancellationToken) =>
        {
            var merch = await merchService.GetAllAsync(cancellationToken);
            return merch.Select(item => item.ToDto()).ToList();
        });

        admin.MapPost("/merch", async (
            UpsertMerchItemRequest request,
            MerchService merchService,
            CancellationToken cancellationToken) =>
        {
            var result = await merchService.CreateAsync(ToDraft(request), cancellationToken);
            return result.IsSuccess && result.Value is not null
                ? Results.Created($"/api/merch/{result.Value.Id}", result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        admin.MapPut("/merch/{id:guid}", async (
            Guid id,
            UpsertMerchItemRequest request,
            MerchService merchService,
            CancellationToken cancellationToken) =>
        {
            var result = await merchService.UpdateAsync(id, ToDraft(request), cancellationToken);
            return result.IsSuccess && result.Value is not null
                ? Results.Ok(result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        admin.MapDelete("/merch/{id:guid}", async (
            Guid id,
            MerchService merchService,
            CancellationToken cancellationToken) =>
        {
            var removed = await merchService.DeleteAsync(id, cancellationToken);
            return removed ? Results.NoContent() : Results.NotFound();
        });

        admin.MapPut("/merch/{itemId:guid}/variants/{variantId:guid}/stock", async (
            Guid itemId,
            Guid variantId,
            SetStockRequest request,
            MerchService merchService,
            CancellationToken cancellationToken) =>
        {
            var result = await merchService.SetStockAsync(itemId, variantId, request.Stock, cancellationToken);
            return result.IsSuccess && result.Value is not null
                ? Results.Ok(result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        admin.MapPost("/uploads/images", async (
            HttpRequest request,
            IWebHostEnvironment environment,
            CancellationToken cancellationToken) =>
        {
            if (!request.HasFormContentType)
            {
                return Results.BadRequest("Upload an image file.");
            }

            var form = await request.ReadFormAsync(cancellationToken);
            var file = form.Files.GetFile("file");

            if (file is null || file.Length == 0)
            {
                return Results.BadRequest("Choose an image file.");
            }

            if (file.Length > MaxImageBytes)
            {
                return Results.BadRequest("Image must be 5 MB or smaller.");
            }

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedImageExtensions.Contains(extension))
            {
                return Results.BadRequest("Use a JPG, PNG, WEBP, or GIF image.");
            }

            var uploadsDirectory = Path.Combine(environment.ContentRootPath, "App_Data", "uploads", "merch");
            Directory.CreateDirectory(uploadsDirectory);

            var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var filePath = Path.Combine(uploadsDirectory, fileName);

            await using var stream = File.Create(filePath);
            await file.CopyToAsync(stream, cancellationToken);

            var imageUrl = $"{request.Scheme}://{request.Host}/uploads/merch/{fileName}";
            return Results.Ok(new { imageUrl });
        });

        admin.MapGet("/orders", async (
            OrdersService ordersService,
            CancellationToken cancellationToken) =>
        {
            var orders = await ordersService.GetAllAsync(cancellationToken);
            return orders.Select(order => order.ToDto()).ToList();
        });

        admin.MapPatch("/orders/{id:guid}/complete", async (
            Guid id,
            OrdersService ordersService,
            CancellationToken cancellationToken) =>
        {
            var result = await ordersService.CompleteAsync(id, cancellationToken);
            return result.IsSuccess && result.Value is not null
                ? Results.Ok(result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        admin.MapDelete("/orders/{id:guid}", async (
            Guid id,
            OrdersService ordersService,
            CancellationToken cancellationToken) =>
        {
            var removed = await ordersService.DeleteAsync(id, cancellationToken);
            return removed ? Results.NoContent() : Results.NotFound();
        });

        return app;
    }

    private static async ValueTask<object?> RequireAdminToken(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var expectedToken = configuration["LostInReverie:AdminToken"];
        var suppliedToken = context.HttpContext.Request.Headers["X-Admin-Token"].ToString();

        if (string.IsNullOrWhiteSpace(expectedToken) ||
            expectedToken == "change-this-admin-token" &&
            !context.HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
        {
            return Results.Problem(
                "Configure LostInReverie:AdminToken before enabling admin actions.",
                statusCode: StatusCodes.Status500InternalServerError);
        }

        if (!string.Equals(expectedToken, suppliedToken, StringComparison.Ordinal))
        {
            return Results.Unauthorized();
        }

        return await next(context);
    }

    private static MerchItemDraft ToDraft(UpsertMerchItemRequest request)
    {
        return new MerchItemDraft(
            request.Name,
            request.Description,
            request.Price,
            request.ImageUrl,
            request.ImageUrls ?? [],
            request.IsActive,
            (request.Variants ?? new List<UpsertMerchVariantRequest>())
                .Select(variant => new MerchVariantDraft(
                    variant.Id,
                    variant.Label,
                    variant.Sku,
                    variant.Stock))
                .ToList());
    }
}
