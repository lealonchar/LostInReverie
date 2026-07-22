namespace BandPortal.Domain.Entities;

public sealed class OrderRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string CustomerName { get; set; } = "";

    public string Email { get; set; } = "";

    public string PhoneNumber { get; set; } = "";

    public string? InstagramHandle { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public List<OrderLine> Lines { get; set; } = [];

    public decimal Total { get; set; }
}

public sealed class OrderLine
{
    public Guid ItemId { get; set; }

    public Guid VariantId { get; set; }

    public string ItemName { get; set; } = "";

    public string ImageUrl { get; set; } = "";

    public string VariantLabel { get; set; } = "";

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }
}

public enum OrderStatus
{
    Pending,
    Completed
}
