using BandPortal.Domain.Entities;

namespace BandPortal.Service.Models;

public sealed record ShowDraft(
    string? Title,
    string Venue,
    string City,
    DateTimeOffset StartsAt,
    string? TicketUrl,
    string Notes,
    bool IsSoldOut);

public sealed record NewsPostDraft(
    string Title,
    string Category,
    string Body,
    bool IsPinned);

public sealed record MusicReleaseDraft(
    string Title,
    string ReleaseType,
    int ReleaseYear,
    string CoverImageUrl,
    string ListenUrl,
    string? EmbedUrl,
    bool IsPublished,
    IReadOnlyList<MusicPlatformLinkDraft> Links);

public sealed record MusicPlatformLinkDraft(
    string Platform,
    string Url);

public sealed record MerchItemDraft(
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    IReadOnlyList<string> ImageUrls,
    bool IsActive,
    IReadOnlyList<MerchVariantDraft> Variants);

public sealed record MerchVariantDraft(
    Guid? Id,
    string Label,
    string Sku,
    int Stock);

public sealed record OrderDraft(
    string CustomerName,
    string Email,
    string? PhoneNumber,
    string? InstagramHandle,
    string? Notes,
    IReadOnlyList<OrderLineDraft> Lines);

public sealed record OrderLineDraft(
    Guid ItemId,
    Guid VariantId,
    int Quantity);
