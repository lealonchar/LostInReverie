namespace BandPortal.Domain.Entities;

public sealed class MerchItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = "";

    public string Description { get; set; } = "";

    public decimal Price { get; set; }

    public string ImageUrl { get; set; } = "";

    public List<string> ImageUrls { get; set; } = [];

    public bool IsActive { get; set; } = true;

    public List<MerchVariant> Variants { get; set; } = [];
}

public sealed class MerchVariant
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Label { get; set; } = "";

    public string Sku { get; set; } = "";

    public int Stock { get; set; }
}
