namespace BandPortal.Domain.Entities;

public sealed class NewsPost
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = "";

    public string Category { get; set; } = "News";

    public string Body { get; set; } = "";

    public DateTimeOffset PublishedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsPinned { get; set; }
}
