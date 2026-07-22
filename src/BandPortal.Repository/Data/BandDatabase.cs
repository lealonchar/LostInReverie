using BandPortal.Domain.Entities;

namespace BandPortal.Repository.Data;

public sealed class BandDatabase
{
    public List<Show> Shows { get; set; } = [];

    public List<NewsPost> News { get; set; } = [];

    public List<MusicRelease> Music { get; set; } = [];

    public List<MerchItem> Merch { get; set; } = [];

    public List<OrderRequest> Orders { get; set; } = [];
}
