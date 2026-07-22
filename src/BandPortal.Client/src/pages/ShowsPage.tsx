import { useEffect, useState } from "react";
import { getShows } from "../api/client";
import { formatDate } from "../format";
import type { Show } from "../types";

function showLocation(show: Show) {
  return [show.venue, show.city].filter(Boolean).join(" - ");
}

function showHeading(show: Show) {
  return show.title.trim() || showLocation(show);
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getShows().then(setShows).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="page-grid">
      <div className="section-heading">
        <p className="eyebrow">Tour</p>
        <h2>Upcoming Shows</h2>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="list-stack">
        {shows.length === 0 && <p className="empty-state">No upcoming shows yet.</p>}
        {shows.map((show) => (
          <article className="show-card" key={show.id}>
            <div>
              <p className="date-chip">{formatDate(show.startsAt)}</p>
              <h3>{showHeading(show)}</h3>
              {show.title.trim() && <p className="muted">{showLocation(show)}</p>}
              {show.notes && <p>{show.notes}</p>}
            </div>
            <div className="show-card__actions">
              {show.isSoldOut ? (
                <span className="status-pill">Sold out</span>
              ) : show.ticketUrl ? (
                <a className="button-link" href={show.ticketUrl}>
                  Tickets
                </a>
              ) : (
                <span className="status-pill status-pill--soft">Door only</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
