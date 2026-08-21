namespace BandPortal.Web.Requests;

public sealed record UpdateAboutContentRequest(
    string Body,
    List<UpdateAboutImageRequest>? Images,
    UpdateContactInfoRequest? Contact);

public sealed record UpdateAboutImageRequest(
    Guid? Id,
    string ImageUrl);

public sealed record UpdateContactInfoRequest(
    string? Phone,
    string? Email,
    string? InstagramUrl,
    string? YouTubeUrl,
    string? SpotifyUrl);

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
    string? LinkUrl,
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
    bool HasSizes,
    List<UpsertMerchVariantRequest>? Variants);

public sealed record UpsertMerchVariantRequest(
    Guid? Id,
    string Label,
    string Sku,
    int Stock);

public sealed record SetStockRequest(int Stock);
