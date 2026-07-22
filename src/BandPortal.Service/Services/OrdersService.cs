using BandPortal.Domain.Entities;
using BandPortal.Repository;
using BandPortal.Service.Models;

namespace BandPortal.Service.Services;

public sealed class OrdersService(IBandRepository repository)
{
    public async Task<IReadOnlyList<OrderRequest>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var orders = await repository.GetOrdersAsync(cancellationToken);
        return orders.OrderByDescending(order => order.CreatedAt).ToList();
    }

    public Task<ServiceResult<OrderRequest>> CreateAsync(
        OrderDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(draft.CustomerName) ||
            (string.IsNullOrWhiteSpace(draft.Email) &&
             string.IsNullOrWhiteSpace(draft.PhoneNumber) &&
             string.IsNullOrWhiteSpace(draft.InstagramHandle)) ||
            draft.Lines.Count == 0)
        {
            return Task.FromResult(ServiceResult<OrderRequest>.Failure("Name, one contact method, and an item are required."));
        }

        return repository.UpdateAsync(database =>
        {
            var requestedLines = draft.Lines
                .Where(line => line.Quantity > 0)
                .GroupBy(line => new { line.ItemId, line.VariantId })
                .Select(group => new OrderLineDraft(
                    group.Key.ItemId,
                    group.Key.VariantId,
                    group.Sum(line => line.Quantity)))
                .ToList();

            if (requestedLines.Count == 0)
            {
                return ServiceResult<OrderRequest>.Failure("Choose at least one item quantity.");
            }

            var orderLines = new List<OrderLine>();

            foreach (var requestedLine in requestedLines)
            {
                var item = database.Merch.FirstOrDefault(item => item.Id == requestedLine.ItemId && item.IsActive);
                var variant = item?.Variants.FirstOrDefault(variant => variant.Id == requestedLine.VariantId);

                if (item is null || variant is null)
                {
                    return ServiceResult<OrderRequest>.Failure("One of the requested items no longer exists.");
                }

                if (variant.Stock < requestedLine.Quantity)
                {
                    return ServiceResult<OrderRequest>.Failure($"{item.Name} / {variant.Label} only has {variant.Stock} left.");
                }

                orderLines.Add(new OrderLine
                {
                    ItemId = item.Id,
                    VariantId = variant.Id,
                    ItemName = item.Name,
                    ImageUrl = item.ImageUrls.FirstOrDefault() ?? item.ImageUrl,
                    VariantLabel = variant.Label,
                    Quantity = requestedLine.Quantity,
                    UnitPrice = item.Price
                });
            }

            var order = new OrderRequest
            {
                CustomerName = draft.CustomerName.Trim(),
                Email = draft.Email?.Trim() ?? "",
                PhoneNumber = string.IsNullOrWhiteSpace(draft.PhoneNumber)
                    ? ""
                    : draft.PhoneNumber.Trim(),
                InstagramHandle = string.IsNullOrWhiteSpace(draft.InstagramHandle)
                    ? null
                    : draft.InstagramHandle.Trim(),
                Notes = string.IsNullOrWhiteSpace(draft.Notes) ? null : draft.Notes.Trim(),
                Lines = orderLines,
                Total = orderLines.Sum(line => line.UnitPrice * line.Quantity)
            };

            database.Orders.Add(order);
            return ServiceResult<OrderRequest>.Success(order);
        }, cancellationToken);
    }

    public Task<ServiceResult<OrderRequest>> CompleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return repository.UpdateAsync(database =>
        {
            var order = database.Orders.FirstOrDefault(order => order.Id == id);
            if (order is null)
            {
                return ServiceResult<OrderRequest>.Failure("Order was not found.");
            }

            if (order.Status == OrderStatus.Completed)
            {
                return ServiceResult<OrderRequest>.Success(order);
            }

            foreach (var line in order.Lines)
            {
                var item = database.Merch.FirstOrDefault(item => item.Id == line.ItemId);
                var variant = item?.Variants.FirstOrDefault(variant => variant.Id == line.VariantId);

                if (item is null || variant is null)
                {
                    return ServiceResult<OrderRequest>.Failure("One of the ordered items no longer exists.");
                }

                if (variant.Stock < line.Quantity)
                {
                    return ServiceResult<OrderRequest>.Failure($"{line.ItemName} / {line.VariantLabel} only has {variant.Stock} left.");
                }
            }

            foreach (var line in order.Lines)
            {
                var variant = database.Merch
                    .First(item => item.Id == line.ItemId)
                    .Variants
                    .First(variant => variant.Id == line.VariantId);

                variant.Stock -= line.Quantity;
            }

            order.Status = OrderStatus.Completed;
            return ServiceResult<OrderRequest>.Success(order);
        }, cancellationToken);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return repository.UpdateAsync(database =>
        {
            var order = database.Orders.FirstOrDefault(order => order.Id == id);
            return order is not null && database.Orders.Remove(order);
        }, cancellationToken);
    }
}
