import { useEffect, useState } from "react";
import { getMusic } from "../api/client";
import type { MusicRelease } from "../types";

function embedUrlFor(release: MusicRelease) {
  const rawUrl = release.embedUrl || release.listenUrl;

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

  return release.embedUrl ?? "";
}

export default function MusicPage() {
  const [releases, setReleases] = useState<MusicRelease[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<MusicRelease | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMusic().then(setReleases).catch((err: Error) => setError(err.message));
  }, []);

  const playerUrl = selectedRelease ? embedUrlFor(selectedRelease) : "";

  return (
    <section className="page-grid">
      <div className="section-heading">
        <p className="eyebrow">Music</p>
        <h2>Albums & EPs</h2>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="music-grid">
        {releases.length === 0 && <p className="empty-state">No releases yet.</p>}
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
              <div className="music-detail__player">
                {playerUrl ? (
                  <iframe
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    src={playerUrl}
                    title={`${selectedRelease.title} player`}
                  />
                ) : selectedRelease.listenUrl ? (
                  <a className="button-link" href={selectedRelease.listenUrl}>
                    Listen
                  </a>
                ) : (
                  <p className="empty-state">No listening link added yet.</p>
                )}
              </div>
            </div>

            <div className="platform-links">
              {selectedRelease.listenUrl && (
                <a href={selectedRelease.listenUrl}>Listen</a>
              )}
              {selectedRelease.links.map((link) => (
                <a href={link.url} key={link.id}>
                  {link.platform}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
