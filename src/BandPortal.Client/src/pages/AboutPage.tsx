import { useEffect, useState } from "react";
import { getAbout } from "../api/client";
import type { AboutContent } from "../types";

export default function AboutPage() {
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAbout()
      .then(setAbout)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const images = about?.images ?? [];
  const contactDetails = about
    ? [
        about.contact.phone ? { label: "Phone", value: about.contact.phone } : null,
        about.contact.email ? { label: "Email", value: about.contact.email } : null
      ].filter((item): item is { label: string; value: string } => Boolean(item))
    : [];
  const socialLinks = about
    ? [
        about.contact.instagramUrl
          ? { label: "Instagram", href: about.contact.instagramUrl }
          : null,
        about.contact.youTubeUrl
          ? { label: "YouTube", href: about.contact.youTubeUrl }
          : null,
        about.contact.spotifyUrl
          ? { label: "Spotify", href: about.contact.spotifyUrl }
          : null
      ].filter((link): link is { label: string; href: string } => Boolean(link))
    : [];

  useEffect(() => {
    if (activeImage >= images.length) {
      setActiveImage(0);
    }
  }, [activeImage, images.length]);

  function showImage(direction: number) {
    if (images.length === 0) {
      return;
    }

    setActiveImage((current) => (current + direction + images.length) % images.length);
  }

  return (
    <section className="page-grid">
      <div className="section-heading">
        <p className="eyebrow">About</p>
        <h2>Lost In Reverie</h2>
      </div>

      {error && <p className="alert">{error}</p>}

      <div className="about-page">
        {isLoading ? (
          <p className="loading-state">Loading about...</p>
        ) : (
          <>
            <div className="about-carousel">
              {images.length > 0 ? (
                <div
                  className="about-carousel__track"
                  style={{ transform: `translateX(-${activeImage * 100}%)` }}
                >
                  {images.map((image, index) => (
                    <img
                      src={image.imageUrl}
                      alt={`Lost In Reverie ${index + 1}`}
                      key={image.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="merch-placeholder" aria-hidden="true" />
              )}
              {images.length > 1 && (
                <>
                  <button
                    aria-label="Previous image"
                    className="merch-carousel__nav merch-carousel__nav--previous"
                    onClick={() => showImage(-1)}
                    type="button"
                  >
                    {"<"}
                  </button>
                  <button
                    aria-label="Next image"
                    className="merch-carousel__nav merch-carousel__nav--next"
                    onClick={() => showImage(1)}
                    type="button"
                  >
                    {">"}
                  </button>
                  <div className="merch-carousel__dots" aria-label="Image position">
                    {images.map((image, index) => (
                      <button
                        aria-label={`Show image ${index + 1}`}
                        className={
                          index === activeImage
                            ? "merch-carousel__dot merch-carousel__dot--active"
                            : "merch-carousel__dot"
                        }
                        key={image.id}
                        onClick={() => setActiveImage(index)}
                        type="button"
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="about-body">
              {about?.body ? (
                about.body.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ))
              ) : (
                <p className="empty-state">No about text added yet.</p>
              )}
            </div>

            <div className="about-contact">
              <div className="section-heading section-heading--compact">
                <p className="eyebrow">Contact</p>
                <h2>Get in touch</h2>
              </div>
              {contactDetails.length || socialLinks.length ? (
                <div className="contact-grid">
                  {contactDetails.length > 0 && (
                    <div className="contact-details">
                      {contactDetails.map((item) => (
                        <p key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </p>
                      ))}
                    </div>
                  )}
                  {socialLinks.length > 0 && (
                    <div className="contact-list">
                      {socialLinks.map((link) => (
                        <a
                          className="contact-link"
                          href={link.href}
                          key={link.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="empty-state">No contact details added yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
