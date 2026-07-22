using BandPortal.Domain.Entities;

namespace BandPortal.Web.Dtos;

public static class BandDtoMapper
{
    public static ShowDto ToDto(this Show show)
    {
        return new ShowDto(
            show.Id,
            show.Title,
            show.Venue,
            show.City,
            show.StartsAt,
            show.TicketUrl,
            show.Notes,
            show.IsSoldOut);
    }

    public static NewsPostDto ToDto(this NewsPost post)
    {
        return new NewsPostDto(
            post.Id,
            post.Title,
            post.Category,
            post.Body,
            post.PublishedAt,
            post.IsPinned);
    }

    public static MusicReleaseDto ToDto(this MusicRelease release)
    {
        return new MusicReleaseDto(
            release.Id,
            release.Title,
            release.ReleaseType,
            release.ReleaseYear,
            release.CoverImageUrl,
            release.ListenUrl,
            release.EmbedUrl,
            release.IsPublished,
            release.Links.Select(link => link.ToDto()).ToList());
    }

    public static MusicPlatformLinkDto ToDto(this MusicPlatformLink link)
    {
        return new MusicPlatformLinkDto(
            link.Id,
            link.Platform,
            link.Url);
    }

    public static MerchItemDto ToDto(this MerchItem item)
    {
        var imageUrls = item.ImageUrls.Count > 0
            ? item.ImageUrls
            : string.IsNullOrWhiteSpace(item.ImageUrl)
                ? []
                : [item.ImageUrl];

        return new MerchItemDto(
            item.Id,
            item.Name,
            item.Description,
            item.Price,
            item.ImageUrl,
            imageUrls,
            item.IsActive,
            item.Variants.Select(variant => variant.ToDto()).ToList());
    }

    public static MerchVariantDto ToDto(this MerchVariant variant)
    {
        return new MerchVariantDto(
            variant.Id,
            variant.Label,
            variant.Sku,
            variant.Stock);
    }

    public static OrderRequestDto ToDto(this OrderRequest order)
    {
        return new OrderRequestDto(
            order.Id,
            order.CustomerName,
            order.Email,
            order.PhoneNumber,
            order.InstagramHandle,
            order.Notes,
            order.CreatedAt,
            order.Status.ToString(),
            order.Lines.Select(line => line.ToDto()).ToList(),
            order.Total);
    }

    public static OrderLineDto ToDto(this OrderLine line)
    {
        return new OrderLineDto(
            line.ItemId,
            line.VariantId,
            line.ItemName,
            line.ImageUrl,
            line.VariantLabel,
            line.Quantity,
            line.UnitPrice);
    }
}
