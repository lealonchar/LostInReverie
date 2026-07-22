using BandPortal.Service.Models;
using BandPortal.Service.Services;
using BandPortal.Web.Dtos;
using BandPortal.Web.Requests;

namespace BandPortal.Web.Endpoints;

public static class PublicEndpoints
{
    public static IEndpointRouteBuilder MapPublicEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");

        api.MapGet("/shows", async (
            ShowsService showsService,
            CancellationToken cancellationToken) =>
        {
            var shows = await showsService.GetUpcomingAsync(cancellationToken);
            return shows.Select(show => show.ToDto()).ToList();
        });

        api.MapGet("/news", async (
            NewsService newsService,
            CancellationToken cancellationToken) =>
        {
            var posts = await newsService.GetPublishedAsync(cancellationToken);
            return posts.Select(post => post.ToDto()).ToList();
        });

        api.MapGet("/music", async (
            MusicService musicService,
            CancellationToken cancellationToken) =>
        {
            var releases = await musicService.GetPublishedAsync(cancellationToken);
            return releases.Select(release => release.ToDto()).ToList();
        });

        api.MapGet("/merch", async (
            MerchService merchService,
            CancellationToken cancellationToken) =>
        {
            var merch = await merchService.GetActiveAsync(cancellationToken);
            return merch.Select(item => item.ToDto()).ToList();
        });

        api.MapPost("/orders", async (
            CreateOrderRequest request,
            OrdersService ordersService,
            CancellationToken cancellationToken) =>
        {
            var result = await ordersService.CreateAsync(new OrderDraft(
                request.CustomerName,
                request.Email,
                request.PhoneNumber,
                request.InstagramHandle,
                request.Notes,
                request.Lines
                    .Select(line => new OrderLineDraft(line.ItemId, line.VariantId, line.Quantity))
                    .ToList()), cancellationToken);

            return result.IsSuccess && result.Value is not null
                ? Results.Created($"/api/orders/{result.Value.Id}", result.Value.ToDto())
                : Results.BadRequest(result.Error);
        });

        return app;
    }
}
