import { FormEvent, useEffect, useMemo, useState } from "react";
import { createOrder, getMerch } from "../api/client";
import { formatMoney } from "../format";
import type { MerchItem } from "../types";

type CustomerForm = {
  customerName: string;
  email: string;
  phoneNumber: string;
  instagramHandle: string;
  notes: string;
};

function getMerchImages(item: MerchItem) {
  return [item.imageUrl, ...(item.imageUrls ?? [])]
    .map((url) => url.trim())
    .filter(Boolean)
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

export default function MerchPage() {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerForm>({
    customerName: "",
    email: "",
    phoneNumber: "",
    instagramHandle: "",
    notes: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const selectedImages = useMemo(
    () => (selectedItem ? getMerchImages(selectedItem) : []),
    [selectedItem]
  );
  const selectedVariant = useMemo(
    () =>
      selectedItem
        ? selectedItem.variants.find((variant) => variant.id === selectedVariantId) ?? null
        : null,
    [selectedItem, selectedVariantId]
  );
  const hasAvailableSize = useMemo(
    () => selectedItem?.variants.some((variant) => variant.stock > 0) ?? false,
    [selectedItem]
  );
  const canRequestOrder = Boolean(selectedVariant && selectedVariant.stock > 0);
  const total = selectedItem?.price ?? 0;

  function loadMerch() {
    getMerch().then(setItems).catch((err: Error) => setError(err.message));
  }

  useEffect(loadMerch, []);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedItemId]);

  useEffect(() => {
    if (selectedImages.length > 0 && activeImageIndex >= selectedImages.length) {
      setActiveImageIndex(selectedImages.length - 1);
    }
  }, [activeImageIndex, selectedImages.length]);

  function openItem(item: MerchItem) {
    setSelectedItemId(item.id);
    setSelectedVariantId("");
    setActiveImageIndex(0);
    setIsOrderModalOpen(false);
  }

  function closeItem() {
    setSelectedItemId(null);
    setSelectedVariantId("");
    setActiveImageIndex(0);
    setIsOrderModalOpen(false);
  }

  function showPreviousImage() {
    setActiveImageIndex((current) =>
      current === 0 ? selectedImages.length - 1 : current - 1
    );
  }

  function showNextImage() {
    setActiveImageIndex((current) =>
      current === selectedImages.length - 1 ? 0 : current + 1
    );
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedItem || !selectedVariant || selectedVariant.stock <= 0) {
      setError("Choose an available size first.");
      return;
    }

    if (
      !customer.email.trim() &&
      !customer.phoneNumber.trim() &&
      !customer.instagramHandle.trim()
    ) {
      setError("Add an email, phone number, or Instagram handle.");
      return;
    }

    try {
      const order = await createOrder({
        ...customer,
        lines: [
          {
            itemId: selectedItem.id,
            variantId: selectedVariant.id,
            quantity: 1
          }
        ]
      });

      setMessage(`Order request received: ${order.id.slice(0, 8)}`);
      setSelectedVariantId("");
      setCustomer({
        customerName: "",
        email: "",
        phoneNumber: "",
        instagramHandle: "",
        notes: ""
      });
      setIsOrderModalOpen(false);
      loadMerch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send order.");
    }
  }

  return (
    <section className="page-grid merch-page">
      {!selectedItem && (
        <div className="section-heading">
          <p className="eyebrow">Distro</p>
          <h2>Merch</h2>
        </div>
      )}

      {message && <p className="success">{message}</p>}
      {error && <p className="alert">{error}</p>}

      {!selectedItem && (
        <div className="merch-grid merch-grid--catalog">
          {items.length === 0 && <p className="empty-state">No merch available yet.</p>}
          {items.map((item) => {
            const coverImageUrl = getMerchImages(item)[0];

            return (
              <article className="merch-card merch-card--catalog" key={item.id}>
                <button
                  className="merch-card__button"
                  onClick={() => openItem(item)}
                  type="button"
                >
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt={item.name} />
                  ) : (
                    <div className="merch-placeholder" aria-hidden="true" />
                  )}
                  <div className="merch-card__body">
                    <h3>{item.name}</h3>
                    <div className="merch-card__meta">
                      <span className="price">{formatMoney(item.price)}</span>
                      <span className="muted">
                        {item.variants.reduce((sum, variant) => sum + variant.stock, 0)} in stock
                      </span>
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <article className="merch-detail">
          <div className="merch-detail__media">
            {selectedImages.length > 0 ? (
              <div className="merch-carousel" aria-label={`${selectedItem.name} images`}>
                <div
                  className="merch-carousel__track"
                  style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
                >
                  {selectedImages.map((imageUrl, index) => (
                    <img
                      src={imageUrl}
                      alt={`${selectedItem.name} ${index + 1}`}
                      key={imageUrl}
                    />
                  ))}
                </div>
                {selectedImages.length > 1 && (
                  <>
                    <button
                      aria-label="Previous image"
                      className="merch-carousel__nav merch-carousel__nav--previous"
                      onClick={showPreviousImage}
                      type="button"
                    >
                      {"<"}
                    </button>
                    <button
                      aria-label="Next image"
                      className="merch-carousel__nav merch-carousel__nav--next"
                      onClick={showNextImage}
                      type="button"
                    >
                      {">"}
                    </button>
                    <div className="merch-carousel__dots" aria-label="Image position">
                      {selectedImages.map((imageUrl, index) => (
                        <button
                          aria-label={`Show image ${index + 1}`}
                          className={
                            index === activeImageIndex
                              ? "merch-carousel__dot merch-carousel__dot--active"
                              : "merch-carousel__dot"
                          }
                          key={imageUrl}
                          onClick={() => setActiveImageIndex(index)}
                          type="button"
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="merch-placeholder" aria-hidden="true" />
            )}
          </div>
          <div className="merch-detail__body">
            <div className="merch-detail__top">
              <div className="section-heading section-heading--compact">
                <p className="eyebrow">Merch</p>
                <h2>{selectedItem.name}</h2>
              </div>
              <button className="secondary-button" onClick={closeItem} type="button">
                Back
              </button>
            </div>
            {selectedItem.description && <p>{selectedItem.description}</p>}
            <p className="price">{formatMoney(selectedItem.price)}</p>
            <label className="merch-size-picker">
              Size
              <select
                disabled={!hasAvailableSize}
                value={selectedVariantId}
                onChange={(event) => {
                  setSelectedVariantId(event.target.value);
                  setError("");
                }}
              >
                <option value="">
                  {hasAvailableSize ? "Choose size" : "No sizes in stock"}
                </option>
                {selectedItem.variants.map((variant) => (
                  <option
                    disabled={variant.stock <= 0}
                    key={variant.id}
                    value={variant.id}
                  >
                    {variant.label} - {variant.stock > 0 ? `${variant.stock} left` : "out of stock"}
                  </option>
                ))}
              </select>
            </label>
            {selectedVariant && (
              <p className="muted">Selected size: {selectedVariant.label}</p>
            )}
            <button
              className="primary-button"
              disabled={!canRequestOrder}
              onClick={() => {
                setError("");
                setIsOrderModalOpen(true);
              }}
              type="button"
            >
              Order Request
            </button>
          </div>
        </article>
      )}

      {isOrderModalOpen && selectedItem && selectedVariant && (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="order-request-title"
            aria-modal="true"
            className="modal order-modal"
            onSubmit={submitOrder}
            role="dialog"
          >
            <div className="modal__top">
              <div className="section-heading section-heading--compact">
                <p className="eyebrow">Request</p>
                <h2 id="order-request-title">Order Request</h2>
              </div>
              <button
                className="secondary-button"
                onClick={() => setIsOrderModalOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="single-order-line">
              <div>
                <strong>{selectedItem.name}</strong>
                <p className="muted">Size {selectedVariant.label}</p>
              </div>
              <span className="price">{formatMoney(selectedItem.price)}</span>
            </div>
            <p className="price">Total: {formatMoney(total)}</p>
            <div className="form-grid">
              <label>
                Name
                <input
                  required
                  value={customer.customerName}
                  onChange={(event) =>
                    setCustomer({ ...customer, customerName: event.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={customer.email}
                  onChange={(event) =>
                    setCustomer({ ...customer, email: event.target.value })
                  }
                />
              </label>
              <label>
                Phone
                <input
                  value={customer.phoneNumber}
                  onChange={(event) =>
                    setCustomer({ ...customer, phoneNumber: event.target.value })
                  }
                />
              </label>
              <label>
                Instagram
                <input
                  value={customer.instagramHandle}
                  onChange={(event) =>
                    setCustomer({ ...customer, instagramHandle: event.target.value })
                  }
                />
              </label>
              <label className="span-2">
                Notes
                <textarea
                  value={customer.notes}
                  onChange={(event) =>
                    setCustomer({ ...customer, notes: event.target.value })
                  }
                />
              </label>
            </div>
            <button className="primary-button">Send Order Request</button>
          </form>
        </div>
      )}
    </section>
  );
}
