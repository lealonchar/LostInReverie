using BandPortal.Domain.Entities;
using BandPortal.Repository;
using BandPortal.Service.Models;

namespace BandPortal.Service.Services;

public sealed class MerchService(IBandRepository repository)
{
    public async Task<IReadOnlyList<MerchItem>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var merch = await repository.GetMerchAsync(cancellationToken);
        return merch.Where(item => item.IsActive).ToList();
    }

    public async Task<IReadOnlyList<MerchItem>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var merch = await repository.GetMerchAsync(cancellationToken);
        return merch.OrderBy(item => item.Name).ToList();
    }

    public Task<ServiceResult<MerchItem>> CreateAsync(
        MerchItemDraft draft,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<MerchItem>.Failure(validationError));
        }

        var item = Map(new MerchItem(), draft);

        return repository.UpdateAsync(database =>
        {
            database.Merch.Add(item);
            return ServiceResult<MerchItem>.Success(item);
        }, cancellationToken);
    }

    public Task<ServiceResult<MerchItem>> UpdateAsync(
        Guid id,
        MerchItemDraft draft,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<MerchItem>.Failure(validationError));
        }

        return repository.UpdateAsync(database =>
        {
            var item = database.Merch.FirstOrDefault(item => item.Id == id);
            return item is null
                ? ServiceResult<MerchItem>.Failure("Merch item was not found.")
                : ServiceResult<MerchItem>.Success(Map(item, draft));
        }, cancellationToken);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return repository.UpdateAsync(database =>
        {
            var item = database.Merch.FirstOrDefault(item => item.Id == id);
            return item is not null && database.Merch.Remove(item);
        }, cancellationToken);
    }

    public Task<ServiceResult<MerchVariant>> SetStockAsync(
        Guid itemId,
        Guid variantId,
        int stock,
        CancellationToken cancellationToken = default)
    {
        if (stock < 0)
        {
            return Task.FromResult(ServiceResult<MerchVariant>.Failure("Stock cannot be negative."));
        }

        return repository.UpdateAsync(database =>
        {
            var item = database.Merch.FirstOrDefault(item => item.Id == itemId);
            var variant = item?.Variants.FirstOrDefault(variant => variant.Id == variantId);

            if (variant is null)
            {
                return ServiceResult<MerchVariant>.Failure("Stock variant was not found.");
            }

            variant.Stock = stock;
            return ServiceResult<MerchVariant>.Success(variant);
        }, cancellationToken);
    }

    private static MerchItem Map(MerchItem item, MerchItemDraft draft)
    {
        item.Name = draft.Name.Trim();
        item.Description = draft.Description.Trim();
        item.Price = draft.Price;
        item.ImageUrls = NormalizeImageUrls(draft.ImageUrl, draft.ImageUrls);
        item.ImageUrl = item.ImageUrls.FirstOrDefault() ?? "";
        item.IsActive = draft.IsActive;
        item.Variants = draft.Variants
            .Select(variant => new MerchVariant
            {
                Id = variant.Id ?? Guid.NewGuid(),
                Label = variant.Label.Trim(),
                Sku = variant.Sku.Trim(),
                Stock = Math.Max(0, variant.Stock)
            })
            .ToList();

        return item;
    }

    private static List<string> NormalizeImageUrls(
        string imageUrl,
        IEnumerable<string> imageUrls)
    {
        var urls = new[] { imageUrl }
            .Concat(imageUrls)
            .Select(url => url.Trim())
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return urls;
    }

    private static string? Validate(MerchItemDraft draft)
    {
        if (string.IsNullOrWhiteSpace(draft.Name))
        {
            return "A merch item needs a name.";
        }

        if (draft.Price < 0)
        {
            return "Price cannot be negative.";
        }

        if (draft.Variants.Count == 0)
        {
            return "Add at least one stock variant.";
        }

        if (draft.Variants.Any(variant => string.IsNullOrWhiteSpace(variant.Label)))
        {
            return "Every stock variant needs a label.";
        }

        if (draft.Variants.Any(variant => variant.Stock < 0))
        {
            return "Stock cannot be negative.";
        }

        return null;
    }
}
