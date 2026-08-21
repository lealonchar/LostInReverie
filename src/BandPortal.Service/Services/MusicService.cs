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
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<MusicRelease>.Failure(validationError));
        }

        var release = Map(new MusicRelease(), draft);

        return repository.UpdateAsync(database =>
        {
            database.Music.Add(release);
            return ServiceResult<MusicRelease>.Success(release);
        }, cancellationToken);
    }

    public Task<ServiceResult<MusicRelease>> UpdateAsync(
        Guid id,
        MusicReleaseDraft draft,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<MusicRelease>.Failure(validationError));
        }

        return repository.UpdateAsync(database =>
        {
            var release = database.Music.FirstOrDefault(release => release.Id == id);
            return release is null
                ? ServiceResult<MusicRelease>.Failure("Music release was not found.")
                : ServiceResult<MusicRelease>.Success(Map(release, draft));
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

    private static MusicRelease Map(MusicRelease release, MusicReleaseDraft draft)
    {
        release.Title = draft.Title.Trim();
        release.ReleaseType = string.IsNullOrWhiteSpace(draft.ReleaseType) ? "Album" : draft.ReleaseType.Trim();
        release.ReleaseYear = draft.ReleaseYear;
        release.CoverImageUrl = draft.CoverImageUrl.Trim();
        release.ListenUrl = draft.ListenUrl.Trim();
        release.EmbedUrl = string.IsNullOrWhiteSpace(draft.EmbedUrl) ? null : draft.EmbedUrl.Trim();
        release.IsPublished = draft.IsPublished;
        release.Links = draft.Links
            .Where(link => !string.IsNullOrWhiteSpace(link.Platform) && !string.IsNullOrWhiteSpace(link.Url))
            .Select(link => new MusicPlatformLink
            {
                Platform = link.Platform.Trim(),
                Url = link.Url.Trim()
            })
            .ToList();

        return release;
    }

    private static string? Validate(MusicReleaseDraft draft)
    {
        if (string.IsNullOrWhiteSpace(draft.Title))
        {
            return "A release needs a name.";
        }

        if (string.IsNullOrWhiteSpace(draft.ListenUrl))
        {
            return "Spotify link is required.";
        }

        if (draft.ReleaseYear < 1900 || draft.ReleaseYear > DateTimeOffset.UtcNow.Year + 1)
        {
            return "Use a valid release year.";
        }

        return null;
    }
}
