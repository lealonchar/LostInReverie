import { useEffect, useState } from "react";
import { getMusic } from "../api/client";
import type { MusicRelease } from "../types";

type PlatformKind =
  | "spotify"
  | "youtube"
  | "apple"
  | "bandcamp"
  | "soundcloud"
  | "deezer"
  | "tidal"
  | "listen";

const platformDetails: Record<PlatformKind, { label: string }> = {
  spotify: { label: "Spotify" },
  youtube: { label: "YouTube Music" },
  apple: { label: "Apple Music" },
  bandcamp: { label: "Bandcamp" },
  soundcloud: { label: "SoundCloud" },
  deezer: { label: "Deezer" },
  tidal: { label: "Tidal" },
  listen: { label: "Listen" }
};

function PlatformMark({ kind }: { kind: PlatformKind }) {
  if (kind === "spotify") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M7 9.1c3.7-1.1 7.4-.8 10.3.9" />
        <path d="M7.8 12.2c2.9-.8 5.8-.5 8.1.8" />
        <path d="M8.6 15.1c2-.5 4-.3 5.8.7" />
      </svg>
    );
  }

  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.4" />
        <path d="M11 9.7v4.6l3.5-2.3z" />
      </svg>
    );
  }

  if (kind === "apple") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 17.5a2.6 2.6 0 1 1-1.3-2.2V6.5l9-1.7v9.6a2.6 2.6 0 1 1-1.3-2.2V8.6L9 9.8z" />
      </svg>
    );
  }

  if (kind === "bandcamp") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.6 7h12.2l-3.4 10H4.2z" />
      </svg>
    );
  }

  if (kind === "soundcloud") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 13.7v3.1" />
        <path d="M7.3 11.7v5.1" />
        <path d="M9.6 9.8v7" />
        <path d="M11.9 8.9v7.9" />
        <path d="M14.1 16.8h3.4a3 3 0 0 0 .4-6 4.7 4.7 0 0 0-8.3-1.9" />
      </svg>
    );
  }

  if (kind === "deezer") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 14h3v4H4z" />
        <path d="M8.5 11h3v7h-3z" />
        <path d="M13 8h3v10h-3z" />
        <path d="M17.5 5h3v13h-3z" />
      </svg>
    );
  }

  if (kind === "tidal") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 4 3.2 3.2L12 10.4 8.8 7.2z" />
        <path d="m6.4 9.6 3.2 3.2L6.4 16 3.2 12.8z" />
        <path d="m17.6 9.6 3.2 3.2-3.2 3.2-3.2-3.2z" />
        <path d="m12 15.2 3.2 3.2L12 21.6l-3.2-3.2z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l5.3-3.5z" />
    </svg>
  );
}

function extractUrl(value = "") {
  return value.match(/https?:\/\/\S+/)?.[0] ?? value.trim();
}

function platformKindFromUrl(value: string): PlatformKind {
  try {
    const url = new URL(extractUrl(value));
    const host = url.hostname.toLowerCase();

    if (host.includes("spotify")) {
      return "spotify";
    }

    if (host.includes("youtube") || host.includes("youtu.be")) {
      return "youtube";
    }

    if (host.includes("music.apple") || host.includes("itunes.apple")) {
      return "apple";
    }

    if (host.includes("bandcamp")) {
      return "bandcamp";
    }

    if (host.includes("soundcloud")) {
      return "soundcloud";
    }

    if (host.includes("deezer")) {
      return "deezer";
    }

    if (host.includes("tidal")) {
      return "tidal";
    }
  } catch {
    return "listen";
  }

  return "listen";
}

function platformKindFromName(value: string): PlatformKind | null {
  const name = value.toLowerCase();

  if (name.includes("spotify")) return "spotify";
  if (name.includes("youtube")) return "youtube";
  if (name.includes("apple")) return "apple";
  if (name.includes("bandcamp")) return "bandcamp";
  if (name.includes("soundcloud")) return "soundcloud";
  if (name.includes("deezer")) return "deezer";
  if (name.includes("tidal")) return "tidal";

  return null;
}

function platformLinksFor(release: MusicRelease) {
  const links = [
    ...release.links,
    ...(release.listenUrl
      ? [{ id: "listen", platform: "", url: release.listenUrl }]
      : [])
  ];
  const seenUrls = new Set<string>();

  return links
    .map((link) => {
      const url = extractUrl(link.url || link.platform);
      const kind =
        platformKindFromName(link.platform) ?? platformKindFromUrl(url);

      return {
        id: link.id,
        url,
        kind,
        ...platformDetails[kind]
      };
    })
    .filter((link) => {
      if (!link.url || seenUrls.has(link.url)) {
        return false;
      }

      seenUrls.add(link.url);
      return true;
    });
}

function playerUrlFor(release: MusicRelease) {
  const rawUrl = extractUrl(release.listenUrl);

  try {
    const url = new URL(rawUrl);

    if (url.hostname.includes("spotify.com")) {
      const parts = url.pathname.split("/").filter(Boolean);

      if (parts[0] === "embed") {
        return rawUrl;
      }

      if (parts.length >= 2) {
        return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
      }
    }

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : rawUrl;
    }

    if (url.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${url.pathname.replace("/", "")}`;
    }
  } catch {
    return "";
  }

  return "";
}

export default function MusicPage() {
  const [releases, setReleases] = useState<MusicRelease[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<MusicRelease | null>(null);
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMusic()
      .then(setReleases)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setIsPlayerLoaded(false);
  }, [selectedRelease?.id]);

  const playerUrl = selectedRelease ? playerUrlFor(selectedRelease) : "";
  const platformLinks = selectedRelease ? platformLinksFor(selectedRelease) : [];

  return (
    <section className="page-grid">
      <div className="section-heading">
        <p className="eyebrow">Music</p>
        <h2>Albums & EPs</h2>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="music-grid">
        {isLoading && <p className="loading-state">Loading music...</p>}
        {!isLoading && releases.length === 0 && <p className="empty-state">No releases yet.</p>}
        {releases.map((release) => (
          <button
            className="music-card"
            key={release.id}
            onClick={() => setSelectedRelease(release)}
            type="button"
          >
            <div className="music-card__cover">
              {release.coverImageUrl ? (
                <img src={release.coverImageUrl} alt={release.title} />
              ) : (
                <div className="merch-placeholder" aria-hidden="true" />
              )}
            </div>
            <span>{release.releaseType}</span>
            <strong>{release.title}</strong>
            <small>{release.releaseYear}</small>
          </button>
        ))}
      </div>

      {selectedRelease && (
        <div className="modal-backdrop" role="presentation">
          <div
            aria-labelledby="music-detail-title"
            aria-modal="true"
            className="modal music-modal"
            role="dialog"
          >
            <div className="modal__top">
              <div className="section-heading section-heading--compact">
                <p className="eyebrow">
                  {selectedRelease.releaseType} - {selectedRelease.releaseYear}
                </p>
                <h2 id="music-detail-title">{selectedRelease.title}</h2>
              </div>
              <button
                className="secondary-button"
                onClick={() => setSelectedRelease(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="music-detail">
              <div className="music-detail__cover">
                {selectedRelease.coverImageUrl ? (
                  <img src={selectedRelease.coverImageUrl} alt={selectedRelease.title} />
                ) : (
                  <div className="merch-placeholder" aria-hidden="true" />
                )}
              </div>
              {playerUrl && (
                <div className="music-detail__player">
                  {!isPlayerLoaded && (
                    <p className="music-player-loading">Loading preview songs...</p>
                  )}
                  <iframe
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    onLoad={() => setIsPlayerLoaded(true)}
                    src={playerUrl}
                    title={`${selectedRelease.title} preview`}
                  />
                </div>
              )}
            </div>

            <div className="platform-links" aria-label="Listening platforms">
              {platformLinks.map((link) => (
                <a
                  className={`platform-logo platform-logo--${link.kind}`}
                  href={link.url}
                  key={`${link.id}-${link.url}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="platform-logo__mark">
                    <PlatformMark kind={link.kind} />
                  </span>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
