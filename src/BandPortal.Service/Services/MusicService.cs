using BandPortal.Domain.Entities;
using BandPortal.Repository;
using BandPortal.Service.Models;

namespace BandPortal.Service.Services;

public sealed class MusicService(IBandRepository repository)
{
    public async Task<IReadOnlyList<MusicRelease>> GetPublishedAsync(CancellationToken cancellationToken = default)
    {
        var releases = await repository.GetMusicAsync(cancellationToken);
        return releases
            .Where(release => release.IsPublished)
            .OrderByDescending(release => release.ReleaseYear)
            .ThenBy(release => release.Title)
            .ToList();
    }

    public async Task<IReadOnlyList<MusicRelease>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var releases = await repository.GetMusicAsync(cancellationToken);
        return releases
            .OrderByDescending(release => release.ReleaseYear)
            .ThenBy(release => release.Title)
            .ToList();
    }

    public Task<ServiceResult<MusicRelease>> CreateAsync(
        MusicReleaseDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(draft.Title))
        {
            return Task.FromResult(ServiceResult<MusicRelease>.Failure("A release needs a name."));
        }

        if (draft.ReleaseYear < 1900 || draft.ReleaseYear > DateTimeOffset.UtcNow.Year + 1)
        {
            return Task.FromResult(ServiceResult<MusicRelease>.Failure("Use a valid release year."));
        }

        var release = new MusicRelease
        {
            Title = draft.Title.Trim(),
            ReleaseType = string.IsNullOrWhiteSpace(draft.ReleaseType) ? "Album" : draft.ReleaseType.Trim(),
            ReleaseYear = draft.ReleaseYear,
            CoverImageUrl = draft.CoverImageUrl.Trim(),
            ListenUrl = draft.ListenUrl.Trim(),
            EmbedUrl = string.IsNullOrWhiteSpace(draft.EmbedUrl) ? null : draft.EmbedUrl.Trim(),
            IsPublished = draft.IsPublished,
            Links = draft.Links
                .Where(link => !string.IsNullOrWhiteSpace(link.Platform) && !string.IsNullOrWhiteSpace(link.Url))
                .Select(link => new MusicPlatformLink
                {
                    Platform = link.Platform.Trim(),
                    Url = link.Url.Trim()
                })
                .ToList()
        };

        return repository.UpdateAsync(database =>
        {
            database.Music.Add(release);
            return ServiceResult<MusicRelease>.Success(release);
        }, cancellationToken);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return repository.UpdateAsync(database =>
        {
            var release = database.Music.FirstOrDefault(release => release.Id == id);
            return release is not null && database.Music.Remove(release);
        }, cancellationToken);
    }
}
