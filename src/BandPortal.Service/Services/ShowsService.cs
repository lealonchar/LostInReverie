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
        if (string.IsNullOrWhiteSpace(draft.Venue))
        {
            return Task.FromResult(ServiceResult<Show>.Failure("A show needs a location."));
        }

        var show = new Show
        {
            Title = draft.Title?.Trim() ?? "",
            Venue = draft.Venue.Trim(),
            City = draft.City.Trim(),
            StartsAt = draft.StartsAt,
            TicketUrl = string.IsNullOrWhiteSpace(draft.TicketUrl) ? null : draft.TicketUrl.Trim(),
            Notes = draft.Notes.Trim(),
            IsSoldOut = draft.IsSoldOut
        };

        return repository.UpdateAsync(database =>
        {
            database.Shows.Add(show);
            return ServiceResult<Show>.Success(show);
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
}
