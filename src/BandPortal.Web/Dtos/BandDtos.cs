namespace BandPortal.Web.Dtos;

public sealed record ShowDto(
    Guid Id,
    string Title,
    string Venue,
    string City,
    DateTimeOffset StartsAt,
    string? TicketUrl,
    string Notes,
    bool IsSoldOut);

public sealed record NewsPostDto(
    Guid Id,
    string Title,
    string Category,
    string Body,
    DateTimeOffset PublishedAt,
    bool IsPinned);

public sealed record MusicReleaseDto(
    Guid Id,
    string Title,
    string ReleaseType,
    int ReleaseYear,
    string CoverImageUrl,
    string ListenUrl,
    string? EmbedUrl,
    bool IsPublished,
    IReadOnlyList<MusicPlatformLinkDto> Links);

public sealed record MusicPlatformLinkDto(
    Guid Id,
    string Platform,
    string Url);

public sealed record MerchItemDto(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    IReadOnlyList<string> ImageUrls,
    bool IsActive,
    IReadOnlyList<MerchVariantDto> Variants);

public sealed record MerchVariantDto(
    Guid Id,
    string Label,
    string Sku,
    int Stock);

public sealed record OrderRequestDto(
    Guid Id,
    string CustomerName,
    string Email,
    string PhoneNumber,
    string? InstagramHandle,
    string? Notes,
    DateTimeOffset CreatedAt,
    string Status,
    IReadOnlyList<OrderLineDto> Lines,
    decimal Total);

public sealed record OrderLineDto(
    Guid ItemId,
    Guid VariantId,
    string ItemName,
    string ImageUrl,
    string VariantLabel,
    int Quantity,
    decimal UnitPrice);
