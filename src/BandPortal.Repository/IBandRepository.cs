using BandPortal.Domain.Entities;
using BandPortal.Repository.Data;

namespace BandPortal.Repository;

public interface IBandRepository
{
    Task<IReadOnlyList<Show>> GetShowsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<NewsPost>> GetNewsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MusicRelease>> GetMusicAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MerchItem>> GetMerchAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrderRequest>> GetOrdersAsync(CancellationToken cancellationToken = default);

    Task<T> UpdateAsync<T>(
        Func<BandDatabase, T> update,
        CancellationToken cancellationToken = default);
}
