namespace BandPortal.Domain.Entities;

public sealed class AboutContent
{
    public string Body { get; set; } = "";

    public List<AboutImage> Images { get; set; } = [];

    public ContactInfo Contact { get; set; } = new();
}

public sealed class AboutImage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string ImageUrl { get; set; } = "";
}

public sealed class ContactInfo
{
    public string Phone { get; set; } = "";

    public string Email { get; set; } = "";

    public string InstagramUrl { get; set; } = "";

    public string YouTubeUrl { get; set; } = "";

    public string SpotifyUrl { get; set; } = "";
}
