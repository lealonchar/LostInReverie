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
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<NewsPost>.Failure(validationError));
        }

        var post = Map(new NewsPost(), draft);
        post.PublishedAt = DateTimeOffset.UtcNow;

        return repository.UpdateAsync(database =>
        {
            database.News.Add(post);
            return ServiceResult<NewsPost>.Success(post);
        }, cancellationToken);
    }

    public Task<ServiceResult<NewsPost>> UpdateAsync(
        Guid id,
        NewsPostDraft draft,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<NewsPost>.Failure(validationError));
        }

        return repository.UpdateAsync(database =>
        {
            var post = database.News.FirstOrDefault(post => post.Id == id);
            return post is null
                ? ServiceResult<NewsPost>.Failure("Post was not found.")
                : ServiceResult<NewsPost>.Success(Map(post, draft));
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

    private static NewsPost Map(NewsPost post, NewsPostDraft draft)
    {
        post.Title = draft.Title.Trim();
        post.Category = string.IsNullOrWhiteSpace(draft.Category) ? "News" : draft.Category.Trim();
        post.Body = draft.Body.Trim();
        post.LinkUrl = NormalizeLinkUrl(draft.LinkUrl);
        post.IsPinned = draft.IsPinned;

        return post;
    }

    private static string? Validate(NewsPostDraft draft)
    {
        return string.IsNullOrWhiteSpace(draft.Title) || string.IsNullOrWhiteSpace(draft.Body)
            ? "A post needs a title and body."
            : null;
    }

    private static string? NormalizeLinkUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                ? trimmed
                : $"https://{trimmed}";
    }
}
