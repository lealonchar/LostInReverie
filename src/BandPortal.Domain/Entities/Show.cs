namespace BandPortal.Domain.Entities;

public sealed class Show
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = "";

    public string Venue { get; set; } = "";

    public string City { get; set; } = "";

    public DateTimeOffset StartsAt { get; set; }

    public string? TicketUrl { get; set; }

    public string Notes { get; set; } = "";

    public bool IsSoldOut { get; set; }
}
