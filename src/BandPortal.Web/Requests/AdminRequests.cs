namespace BandPortal.Web.Requests;

public sealed record CreateShowRequest(
    string? Title,
    string Venue,
    string City,
    DateTimeOffset StartsAt,
    string? TicketUrl,
    string Notes,
    bool IsSoldOut);

public sealed record CreateNewsPostRequest(
    string Title,
    string Category,
    string Body,
    bool IsPinned);

public sealed record CreateMusicReleaseRequest(
    string Title,
    string ReleaseType,
    int ReleaseYear,
    string CoverImageUrl,
    string ListenUrl,
    string? EmbedUrl,
    bool IsPublished,
    List<CreateMusicPlatformLinkRequest>? Links);

public sealed record CreateMusicPlatformLinkRequest(
    string Platform,
    string Url);

public sealed record UpsertMerchItemRequest(
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    List<string>? ImageUrls,
    bool IsActive,
    List<UpsertMerchVariantRequest>? Variants);

public sealed record UpsertMerchVariantRequest(
    Guid? Id,
    string Label,
    string Sku,
    int Stock);

public sealed record SetStockRequest(int Stock);
