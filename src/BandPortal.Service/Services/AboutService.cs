using BandPortal.Domain.Entities;
using BandPortal.Repository;
using BandPortal.Service.Models;

namespace BandPortal.Service.Services;

public sealed class AboutService(IBandRepository repository)
{
    public Task<AboutContent> GetAsync(CancellationToken cancellationToken = default)
    {
        return repository.GetAboutAsync(cancellationToken);
    }

    public Task<ServiceResult<AboutContent>> UpdateAsync(
        AboutContentDraft draft,
        CancellationToken cancellationToken = default)
    {
        return repository.UpdateAsync(database =>
        {
            database.About = new AboutContent
            {
                Body = draft.Body.Trim(),
                Images = draft.Images
                    .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                    .Select(image => new AboutImage
                    {
                        Id = image.Id ?? Guid.NewGuid(),
                        ImageUrl = image.ImageUrl.Trim()
                    })
                    .ToList(),
                Contact = new ContactInfo
                {
                    Phone = draft.Contact.Phone?.Trim() ?? "",
                    Email = draft.Contact.Email?.Trim() ?? "",
                    InstagramUrl = draft.Contact.InstagramUrl?.Trim() ?? "",
                    YouTubeUrl = draft.Contact.YouTubeUrl?.Trim() ?? "",
                    SpotifyUrl = draft.Contact.SpotifyUrl?.Trim() ?? ""
                }
            };

            return ServiceResult<AboutContent>.Success(database.About);
        }, cancellationToken);
    }
}
