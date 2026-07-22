namespace BandPortal.Domain.Entities;

public sealed class MusicRelease
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = "";

    public string ReleaseType { get; set; } = "Album";

    public int ReleaseYear { get; set; }

    public string CoverImageUrl { get; set; } = "";

    public string ListenUrl { get; set; } = "";

    public string? EmbedUrl { get; set; }

    public bool IsPublished { get; set; } = true;

    public List<MusicPlatformLink> Links { get; set; } = [];
}

public sealed class MusicPlatformLink
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Platform { get; set; } = "";

    public string Url { get; set; } = "";
}
