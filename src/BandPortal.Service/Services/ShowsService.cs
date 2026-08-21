using BandPortal.Domain.Entities;
using BandPortal.Repository;
using BandPortal.Service.Models;

namespace BandPortal.Service.Services;

public sealed class ShowsService(IBandRepository repository)
{
    public async Task<IReadOnlyList<Show>> GetUpcomingAsync(CancellationToken cancellationToken = default)
    {
        var shows = await repository.GetShowsAsync(cancellationToken);
        return shows.OrderBy(show => show.StartsAt).ToList();
    }

    public Task<ServiceResult<Show>> CreateAsync(
        ShowDraft draft,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<Show>.Failure(validationError));
        }

        var show = Map(new Show(), draft);

        return repository.UpdateAsync(database =>
        {
            database.Shows.Add(show);
            return ServiceResult<Show>.Success(show);
        }, cancellationToken);
    }

    public Task<ServiceResult<Show>> UpdateAsync(
        Guid id,
        ShowDraft draft,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(draft);
        if (validationError is not null)
        {
            return Task.FromResult(ServiceResult<Show>.Failure(validationError));
        }

        return repository.UpdateAsync(database =>
        {
            var show = database.Shows.FirstOrDefault(show => show.Id == id);
            return show is null
                ? ServiceResult<Show>.Failure("Show was not found.")
                : ServiceResult<Show>.Success(Map(show, draft));
        }, cancellationToken);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return repository.UpdateAsync(database =>
        {
            var show = database.Shows.FirstOrDefault(show => show.Id == id);
            return show is not null && database.Shows.Remove(show);
        }, cancellationToken);
    }

    private static Show Map(Show show, ShowDraft draft)
    {
        show.Title = draft.Title?.Trim() ?? "";
        show.Venue = draft.Venue.Trim();
        show.City = draft.City.Trim();
        show.StartsAt = draft.StartsAt;
        show.TicketUrl = string.IsNullOrWhiteSpace(draft.TicketUrl) ? null : draft.TicketUrl.Trim();
        show.Notes = draft.Notes.Trim();
        show.IsSoldOut = draft.IsSoldOut;

        return show;
    }

    private static string? Validate(ShowDraft draft)
    {
        return string.IsNullOrWhiteSpace(draft.Venue)
            ? "A show needs a location."
            : null;
    }
}
