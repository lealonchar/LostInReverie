using BandPortal.Domain.Entities;
using BandPortal.Repository;
using BandPortal.Service.Models;

namespace BandPortal.Service.Services;

public sealed class NewsService(IBandRepository repository)
{
    public async Task<IReadOnlyList<NewsPost>> GetPublishedAsync(CancellationToken cancellationToken = default)
    {
        var posts = await repository.GetNewsAsync(cancellationToken);
        return posts
            .OrderByDescending(post => post.IsPinned)
            .ThenByDescending(post => post.PublishedAt)
            .ToList();
    }

    public Task<ServiceResult<NewsPost>> CreateAsync(
        NewsPostDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(draft.Title) || string.IsNullOrWhiteSpace(draft.Body))
        {
            return Task.FromResult(ServiceResult<NewsPost>.Failure("A post needs a title and body."));
        }

        var post = new NewsPost
        {
            Title = draft.Title.Trim(),
            Category = string.IsNullOrWhiteSpace(draft.Category) ? "News" : draft.Category.Trim(),
            Body = draft.Body.Trim(),
            IsPinned = draft.IsPinned,
            PublishedAt = DateTimeOffset.UtcNow
        };

        return repository.UpdateAsync(database =>
        {
            database.News.Add(post);
            return ServiceResult<NewsPost>.Success(post);
        }, cancellationToken);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return repository.UpdateAsync(database =>
        {
            var post = database.News.FirstOrDefault(post => post.Id == id);
            return post is not null && database.News.Remove(post);
        }, cancellationToken);
    }
}
