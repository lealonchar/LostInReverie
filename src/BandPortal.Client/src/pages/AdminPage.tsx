import { DragEvent, FormEvent, useEffect, useState } from "react";
import {
  completeOrder,
  createMerchItem,
  createMusicRelease,
  createNewsPost,
  createShow,
  deleteMerchItem,
  deleteMusicRelease,
  deleteNewsPost,
  deleteOrder,
  deleteShow,
  getAdminMerch,
  getAdminMusic,
  getAdminOrders,
  getNews,
  getShows,
  uploadMerchImage,
  updateMerchItem,
  type MerchInput,
  type MusicInput
} from "../api/client";
import { formatDate, formatMoney } from "../format";
import type { MerchItem, MusicRelease, NewsPost, OrderLine, OrderRequest, Show } from "../types";

type AdminTab = "shows" | "posts" | "music" | "merch" | "orders";

type MerchVariantDraft = {
  id?: string;
  label: string;
  sku: string;
  stock: string;
};

type MerchDraft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  imageUrls: string[];
  isActive: boolean;
  variants: MerchVariantDraft[];
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "shows", label: "Shows" },
  { id: "posts", label: "Posts" },
  { id: "music", label: "Music" },
  { id: "merch", label: "Merch" },
  { id: "orders", label: "Orders" }
];

const merchSizes = ["S", "M", "L", "XL", "XXL"];

type AdminPageProps = {
  adminToken: string;
  onAuthorizationLost?: (message?: string) => void;
  onBack: () => void;
};

function normalizeMerchVariants(
  variants: MerchVariantDraft[] = []
): MerchVariantDraft[] {
  const variantsBySize = new Map(
    variants.map((variant) => [variant.label.trim().toUpperCase(), variant])
  );

  return merchSizes.map((size) => {
    const variant = variantsBySize.get(size);

    return {
      id: variant?.id,
      label: size,
      sku: variant?.sku ?? "",
      stock: variant?.stock ?? "0"
    };
  });
}

function merchSku(name: string, size: string) {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "MERCH"}-${size}`;
}

function normalizeImageUrls(imageUrl: string, imageUrls: string[] = []) {
  return [imageUrl, ...imageUrls]
    .map((url) => url.trim())
    .filter(Boolean)
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function emptyMerchDraft(): MerchDraft {
  return {
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    imageUrls: [],
    isActive: true,
    variants: normalizeMerchVariants()
  };
}

function draftFromItem(item: MerchItem): MerchDraft {
  const imageUrls = normalizeImageUrls(item.imageUrl, item.imageUrls ?? []);

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: String(item.price),
    imageUrl: imageUrls[0] ?? "",
    imageUrls,
    isActive: item.isActive,
    variants: normalizeMerchVariants(
      item.variants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        sku: variant.sku,
        stock: String(variant.stock)
      }))
    )
  };
}

function payloadFromDraft(draft: MerchDraft): MerchInput {
  const imageUrls = normalizeImageUrls(draft.imageUrl, draft.imageUrls);

  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    price: Number(draft.price || 0),
    imageUrl: imageUrls[0] ?? "",
    imageUrls,
    isActive: draft.isActive,
    variants: normalizeMerchVariants(draft.variants).map((variant) => ({
      id: variant.id,
      label: variant.label.trim(),
      sku: variant.sku.trim() || merchSku(draft.name, variant.label),
      stock: Math.max(0, Number(variant.stock || 0))
    }))
  };
}

function merchStockSummary(item: MerchItem) {
  return normalizeMerchVariants(
    item.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      sku: variant.sku,
      stock: String(variant.stock)
    }))
  )
    .map((variant) => `${variant.label}: ${variant.stock}`)
    .join(", ");
}

function merchCoverImage(item: MerchItem) {
  return normalizeImageUrls(item.imageUrl, item.imageUrls ?? [])[0];
}

function primaryOrderLine(order: OrderRequest): OrderLine | null {
  return order.lines[0] ?? null;
}

function showLocation(show: Show) {
  return [show.venue, show.city].filter(Boolean).join(" - ");
}

function showHeading(show: Show) {
  return show.title.trim() || showLocation(show);
}

function musicLinksFromText(value: string): MusicInput["links"] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [platform, ...urlParts] = line.split("|").map((part) => part.trim());
      const url = urlParts.join("|");

      return {
        platform: platform || "Link",
        url: url || platform
      };
    })
    .filter((link) => link.url);
}

export default function AdminPage({
  adminToken,
  onAuthorizationLost,
  onBack
}: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("shows");
  const [shows, setShows] = useState<Show[]>([]);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [music, setMusic] = useState<MusicRelease[]>([]);
  const [merch, setMerch] = useState<MerchItem[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [merchToRemove, setMerchToRemove] = useState<MerchItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState({
    title: "",
    venue: "",
    city: "",
    startsAt: "",
    ticketUrl: "",
    notes: "",
    isSoldOut: false
  });
  const [postForm, setPostForm] = useState({
    title: "",
    category: "News",
    body: "",
    isPinned: false
  });
  const [musicForm, setMusicForm] = useState({
    title: "",
    releaseType: "Album",
    releaseYear: new Date().getFullYear().toString(),
    coverImageUrl: "",
    listenUrl: "",
    embedUrl: "",
    linksText: "",
    isPublished: true
  });
  const [merchDraft, setMerchDraft] = useState<MerchDraft>(emptyMerchDraft);

  const editingMerch = Boolean(merchDraft.id);

  async function refreshPublicData() {
    const [nextShows, nextPosts] = await Promise.all([getShows(), getNews()]);
    setShows(nextShows);
    setPosts(nextPosts);
  }

  async function refreshAdminData(currentToken = adminToken) {
    const nextToken = currentToken.trim();

    const [nextMusic, nextMerch, nextOrders] = await Promise.all([
      getAdminMusic(nextToken),
      getAdminMerch(nextToken),
      getAdminOrders(nextToken)
    ]);
    setMusic(nextMusic);
    setMerch(nextMerch);
    setOrders(nextOrders);
  }

  function handleAdminError(err: unknown, fallback: string) {
    const message = err instanceof Error && err.message ? err.message : fallback;

    if (message.toLowerCase().includes("unauthorized")) {
      onAuthorizationLost?.("Authorization failed. Check the token and try again.");
      return;
    }

    setError(message);
  }

  async function refreshAll(currentToken = adminToken) {
    const nextToken = currentToken.trim();
    setError("");

    try {
      await refreshPublicData();
      await refreshAdminData(nextToken);
    } catch (err) {
      handleAdminError(err, "Could not load admin data.");
    }
  }

  useEffect(() => {
    void refreshAll(adminToken);
  }, [adminToken]);

  async function submitShow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await createShow(adminToken.trim(), {
        ...showForm,
        startsAt: new Date(showForm.startsAt).toISOString()
      });
      setShowForm({
        title: "",
        venue: "",
        city: "",
        startsAt: "",
        ticketUrl: "",
        notes: "",
        isSoldOut: false
      });
      setMessage("Show added.");
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not add show.");
    }
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await createNewsPost(adminToken.trim(), postForm);
      setPostForm({
        title: "",
        category: "News",
        body: "",
        isPinned: false
      });
      setMessage("Post added.");
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not add post.");
    }
  }

  async function submitMusic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await createMusicRelease(adminToken.trim(), {
        title: musicForm.title.trim(),
        releaseType: musicForm.releaseType,
        releaseYear: Number(musicForm.releaseYear),
        coverImageUrl: musicForm.coverImageUrl.trim(),
        listenUrl: musicForm.listenUrl.trim(),
        embedUrl: musicForm.embedUrl.trim(),
        isPublished: musicForm.isPublished,
        links: musicLinksFromText(musicForm.linksText)
      });
      setMusicForm({
        title: "",
        releaseType: "Album",
        releaseYear: new Date().getFullYear().toString(),
        coverImageUrl: "",
        listenUrl: "",
        embedUrl: "",
        linksText: "",
        isPublished: true
      });
      setMessage("Music release added.");
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not add music release.");
    }
  }

  async function submitMerch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = payloadFromDraft(merchDraft);

      if (merchDraft.id) {
        await updateMerchItem(adminToken.trim(), merchDraft.id, payload);
        setMessage("Merch item saved.");
      } else {
        await createMerchItem(adminToken.trim(), payload);
        setMessage("Merch item added.");
      }

      setMerchDraft(emptyMerchDraft());
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not save merch item.");
    }
  }

  async function removeShow(id: string) {
    try {
      await deleteShow(adminToken.trim(), id);
      setMessage("Show removed.");
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not remove show.");
    }
  }

  async function removePost(id: string) {
    try {
      await deleteNewsPost(adminToken.trim(), id);
      setMessage("Post removed.");
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not remove post.");
    }
  }

  async function removeMusic(id: string) {
    try {
      await deleteMusicRelease(adminToken.trim(), id);
      setMessage("Music release removed.");
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not remove music release.");
    }
  }

  async function removeMerch(id: string) {
    try {
      await deleteMerchItem(adminToken.trim(), id);
      setMessage("Merch item removed.");
      setMerchDraft(emptyMerchDraft());
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not remove merch item.");
    }
  }

  async function completeAdminOrder(id: string, showDetails = false) {
    try {
      const order = await completeOrder(adminToken.trim(), id);
      setMessage("Order completed.");
      setSelectedOrder(showDetails ? order : null);
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not complete order.");
    }
  }

  async function removeOrder(id: string) {
    if (!window.confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      await deleteOrder(adminToken.trim(), id);
      setMessage("Order deleted.");
      setSelectedOrder((current) => (current?.id === id ? null : current));
      await refreshAdminData();
    } catch (err) {
      handleAdminError(err, "Could not delete order.");
    }
  }

  async function uploadMusicCover(files?: FileList | File[]) {
    const [file] = Array.from(files ?? []);

    if (!file) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const upload = await uploadMerchImage(adminToken.trim(), file);
      setMusicForm((current) => ({
        ...current,
        coverImageUrl: upload.imageUrl
      }));
      setMessage("Cover uploaded.");
    } catch (err) {
      handleAdminError(err, "Could not upload cover.");
    }
  }

  function updateMerchVariant(
    index: number,
    changes: Partial<MerchVariantDraft>
  ) {
    setMerchDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...changes } : variant
      )
    }));
  }

  async function uploadImageFiles(files?: FileList | File[]) {
    const imageFiles = Array.from(files ?? []);

    if (imageFiles.length === 0) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const uploads = await Promise.all(
        imageFiles.map((file) => uploadMerchImage(adminToken.trim(), file))
      );

      setMerchDraft((current) => {
        const imageUrls = normalizeImageUrls(
          current.imageUrl,
          current.imageUrls.concat(uploads.map((upload) => upload.imageUrl))
        );

        return {
          ...current,
          imageUrl: imageUrls[0] ?? "",
          imageUrls
        };
      });
      setMessage(
        uploads.length === 1 ? "Image uploaded." : `${uploads.length} images uploaded.`
      );
    } catch (err) {
      handleAdminError(err, "Could not upload images.");
    }
  }

  function removeMerchImage(index: number) {
    setMerchDraft((current) => {
      const imageUrls = current.imageUrls.filter((_, imageIndex) => imageIndex !== index);

      return {
        ...current,
        imageUrl: imageUrls[0] ?? "",
        imageUrls
      };
    });
  }

  function reorderMerchImage(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      return;
    }

    setMerchDraft((current) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.imageUrls.length ||
        toIndex >= current.imageUrls.length
      ) {
        return current;
      }

      const imageUrls = [...current.imageUrls];
      const [movedImageUrl] = imageUrls.splice(fromIndex, 1);
      imageUrls.splice(toIndex, 0, movedImageUrl);

      return {
        ...current,
        imageUrl: imageUrls[0] ?? "",
        imageUrls
      };
    });
  }

  function handlePreviewDrop(
    event: DragEvent<HTMLDivElement>,
    targetIndex: number
  ) {
    event.preventDefault();
    event.stopPropagation();

    const transferredIndex = Number(event.dataTransfer.getData("text/plain"));
    const fromIndex = draggingImageIndex ?? transferredIndex;

    if (Number.isInteger(fromIndex)) {
      reorderMerchImage(fromIndex, targetIndex);
    }

    setDraggingImageIndex(null);
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void uploadImageFiles(event.dataTransfer.files);
  }

  return (
    <section className="admin-workspace">
      <div className="admin-header">
        <div className="section-heading">
          <p className="eyebrow">Admin</p>
          <h2>Management Panel</h2>
        </div>
        <button className="secondary-button" onClick={onBack} type="button">
          Back to Site
        </button>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="alert">{error}</p>}

      <div className="admin-tabs" aria-label="Admin tabs">
        {adminTabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "mini-tab mini-tab--active" : "mini-tab"}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "shows" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={submitShow}>
            <h3>Add Show</h3>
            <label>
              Title
              <input
                value={showForm.title}
                onChange={(event) =>
                  setShowForm({ ...showForm, title: event.target.value })
                }
              />
            </label>
            <label>
              Location
              <input
                required
                value={showForm.venue}
                onChange={(event) =>
                  setShowForm({ ...showForm, venue: event.target.value })
                }
              />
            </label>
            <label>
              City
              <input
                value={showForm.city}
                onChange={(event) =>
                  setShowForm({ ...showForm, city: event.target.value })
                }
              />
            </label>
            <label>
              Date
              <input
                required
                type="datetime-local"
                value={showForm.startsAt}
                onChange={(event) =>
                  setShowForm({ ...showForm, startsAt: event.target.value })
                }
              />
            </label>
            <label>
              Ticket URL
              <input
                value={showForm.ticketUrl}
                onChange={(event) =>
                  setShowForm({ ...showForm, ticketUrl: event.target.value })
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={showForm.notes}
                onChange={(event) =>
                  setShowForm({ ...showForm, notes: event.target.value })
                }
              />
            </label>
            <label className="checkbox-row">
              <input
                checked={showForm.isSoldOut}
                onChange={(event) =>
                  setShowForm({ ...showForm, isSoldOut: event.target.checked })
                }
                type="checkbox"
              />
              Sold out
            </label>
            <button className="primary-button">Add Show</button>
          </form>

          <div className="admin-list">
            {shows.length === 0 && <p className="empty-state">No shows yet.</p>}
            {shows.map((show) => (
              <article className="compact-card" key={show.id}>
                <div>
                  <h3>{showHeading(show)}</h3>
                  <p className="muted">
                    {show.title.trim() ? showLocation(show) : formatDate(show.startsAt)}
                  </p>
                </div>
                <button className="danger-button" onClick={() => void removeShow(show.id)}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === "posts" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={submitPost}>
            <h3>Add Post</h3>
            <label>
              Title
              <input
                required
                value={postForm.title}
                onChange={(event) =>
                  setPostForm({ ...postForm, title: event.target.value })
                }
              />
            </label>
            <label>
              Category
              <input
                value={postForm.category}
                onChange={(event) =>
                  setPostForm({ ...postForm, category: event.target.value })
                }
              />
            </label>
            <label>
              Body
              <textarea
                required
                value={postForm.body}
                onChange={(event) =>
                  setPostForm({ ...postForm, body: event.target.value })
                }
              />
            </label>
            <label className="checkbox-row">
              <input
                checked={postForm.isPinned}
                onChange={(event) =>
                  setPostForm({ ...postForm, isPinned: event.target.checked })
                }
                type="checkbox"
              />
              Pinned
            </label>
            <button className="primary-button">Add Post</button>
          </form>

          <div className="admin-list">
            {posts.length === 0 && <p className="empty-state">No posts yet.</p>}
            {posts.map((post) => (
              <article className="compact-card" key={post.id}>
                <div>
                  <h3>{post.title}</h3>
                  <p className="muted">{post.category}</p>
                </div>
                <button className="danger-button" onClick={() => void removePost(post.id)}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === "music" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={submitMusic}>
            <h3>Add Music Release</h3>
            <label>
              Name
              <input
                required
                value={musicForm.title}
                onChange={(event) =>
                  setMusicForm({ ...musicForm, title: event.target.value })
                }
              />
            </label>
            <label>
              Type
              <select
                value={musicForm.releaseType}
                onChange={(event) =>
                  setMusicForm({ ...musicForm, releaseType: event.target.value })
                }
              >
                <option>Album</option>
                <option>EP</option>
                <option>Single</option>
              </select>
            </label>
            <label>
              Year
              <input
                min="1900"
                required
                type="number"
                value={musicForm.releaseYear}
                onChange={(event) =>
                  setMusicForm({ ...musicForm, releaseYear: event.target.value })
                }
              />
            </label>
            <div
              className="image-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void uploadMusicCover(event.dataTransfer.files);
              }}
            >
              {musicForm.coverImageUrl ? (
                <div className="music-cover-preview">
                  <img src={musicForm.coverImageUrl} alt="Release cover preview" />
                </div>
              ) : (
                <p>Drop cover image here or choose a local file.</p>
              )}
              <label className="file-button">
                Choose Cover
                <input
                  accept="image/*"
                  onChange={(event) => void uploadMusicCover(event.target.files ?? undefined)}
                  type="file"
                />
              </label>
            </div>
            <label>
              Main listening link
              <input
                placeholder="Spotify, YouTube, Bandcamp..."
                value={musicForm.listenUrl}
                onChange={(event) =>
                  setMusicForm({ ...musicForm, listenUrl: event.target.value })
                }
              />
            </label>
            <label>
              Embed link
              <input
                placeholder="Only needed if the main link does not embed nicely"
                value={musicForm.embedUrl}
                onChange={(event) =>
                  setMusicForm({ ...musicForm, embedUrl: event.target.value })
                }
              />
            </label>
            <label>
              Platform links
              <textarea
                placeholder={"Spotify | https://...\nApple Music | https://...\nYouTube | https://..."}
                value={musicForm.linksText}
                onChange={(event) =>
                  setMusicForm({ ...musicForm, linksText: event.target.value })
                }
              />
            </label>
            <label className="checkbox-row">
              <input
                checked={musicForm.isPublished}
                onChange={(event) =>
                  setMusicForm({ ...musicForm, isPublished: event.target.checked })
                }
                type="checkbox"
              />
              Visible on site
            </label>
            <button className="primary-button">Add Release</button>
          </form>

          <div className="admin-list">
            {music.length === 0 && <p className="empty-state">No music releases yet.</p>}
            {music.map((release) => (
              <article className="music-admin-row" key={release.id}>
                <div className="order-row__image">
                  {release.coverImageUrl ? (
                    <img src={release.coverImageUrl} alt={release.title} />
                  ) : (
                    <div className="merch-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h3>{release.title}</h3>
                  <p className="muted">
                    {release.releaseType} - {release.releaseYear}
                  </p>
                  <p className="muted">{release.isPublished ? "Visible" : "Hidden"}</p>
                </div>
                <button className="danger-button" onClick={() => void removeMusic(release.id)}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === "merch" && (
        <div className="admin-layout">
          <form className="admin-form merch-editor" onSubmit={submitMerch}>
            <h3>{editingMerch ? "Edit Merch Item" : "Add Merch Item"}</h3>
            <label>
              Name
              <input
                required
                value={merchDraft.name}
                onChange={(event) =>
                  setMerchDraft({ ...merchDraft, name: event.target.value })
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={merchDraft.description}
                onChange={(event) =>
                  setMerchDraft({ ...merchDraft, description: event.target.value })
                }
              />
            </label>
            <label>
              Price
              <input
                min="0"
                required
                step="0.01"
                type="number"
                value={merchDraft.price}
                onChange={(event) =>
                  setMerchDraft({ ...merchDraft, price: event.target.value })
                }
              />
            </label>
            <div
              className="image-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleImageDrop}
            >
              {merchDraft.imageUrls.length > 0 ? (
                <div className="image-preview-strip">
                  {merchDraft.imageUrls.map((imageUrl, index) => (
                    <div
                      className={
                        draggingImageIndex === index
                          ? "image-preview-card image-preview-card--dragging"
                          : "image-preview-card"
                      }
                      draggable
                      key={imageUrl}
                      onDragStart={(event) => {
                        setDraggingImageIndex(index);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                      }}
                      onDragEnd={() => setDraggingImageIndex(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => handlePreviewDrop(event, index)}
                    >
                      <span className="image-preview-card__order">{index + 1}</span>
                      <img
                        src={imageUrl}
                        alt={`${merchDraft.name || "Merch"} preview ${index + 1}`}
                      />
                      <button
                        className="danger-button"
                        onClick={() => removeMerchImage(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Drop images here or choose local files.</p>
              )}
              <label className="secondary-button image-dropzone__picker">
                Choose Files
                <input
                  accept="image/*"
                  className="visually-hidden"
                  multiple
                  type="file"
                  onChange={(event) => {
                    void uploadImageFiles(event.target.files ?? undefined);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <label className="checkbox-row">
              <input
                checked={merchDraft.isActive}
                onChange={(event) =>
                  setMerchDraft({ ...merchDraft, isActive: event.target.checked })
                }
                type="checkbox"
              />
              Visible in store
            </label>

            <div className="size-stock-grid">
              <div className="form-subheading">T-shirt stock</div>
              {merchDraft.variants.map((variant, index) => (
                <label className="size-stock-row" key={variant.label}>
                  <span>{variant.label}</span>
                  <input
                    aria-label={`${variant.label} stock`}
                    min="0"
                    required
                    type="number"
                    value={variant.stock}
                    onChange={(event) =>
                      updateMerchVariant(index, { stock: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>

            <div className="form-actions">
              <button className="primary-button">
                {editingMerch ? "Save Item" : "Add Item"}
              </button>
              {editingMerch && (
                <button
                  className="secondary-button"
                  onClick={() => setMerchDraft(emptyMerchDraft())}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="admin-list merch-admin-list">
            {merch.length === 0 && <p className="empty-state">No merch items yet.</p>}
            {merch.map((item) => {
              const imageUrl = merchCoverImage(item);

              return (
                <article className="merch-admin-row" key={item.id}>
                  <div className="merch-admin-row__image">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name} />
                    ) : (
                      <div className="merch-placeholder" aria-hidden="true" />
                    )}
                  </div>
                  <div className="merch-admin-row__content">
                    <h3>{item.name}</h3>
                    <p className="merch-admin-row__meta muted">
                      <span>{item.isActive ? "Visible" : "Hidden"}</span>
                      <span>{formatMoney(item.price)}</span>
                      <span>{merchStockSummary(item)}</span>
                    </p>
                  </div>
                  <div className="merch-admin-row__actions">
                    <button
                      className="secondary-button"
                      onClick={() => setMerchDraft(draftFromItem(item))}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="danger-button"
                      onClick={() => setMerchToRemove(item)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {merchToRemove && (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="delete-merch-title"
            aria-modal="true"
            className="modal confirm-modal"
            onSubmit={(event) => {
              event.preventDefault();
              const item = merchToRemove;
              setMerchToRemove(null);
              void removeMerch(item.id);
            }}
            role="dialog"
          >
            <div className="section-heading section-heading--compact">
              <p className="eyebrow">Delete</p>
              <h2 id="delete-merch-title">Are you sure?</h2>
            </div>
            <p>
              Are you sure you want to delete <strong>{merchToRemove.name}</strong>?
            </p>
            <div className="form-actions">
              <button className="danger-button">Delete</button>
              <button
                className="secondary-button"
                onClick={() => setMerchToRemove(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="order-list">
          {orders.length === 0 && <p className="empty-state">No order requests.</p>}
          {orders.map((order) => {
            const line = primaryOrderLine(order);
            const isCompleted = order.status === "Completed";

            return (
              <article
                className={
                  isCompleted
                    ? "order-row order-row--completed"
                    : "order-row"
                }
                key={order.id}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="order-row__image">
                  {line?.imageUrl ? (
                    <img src={line.imageUrl} alt={line.itemName} />
                  ) : (
                    <div className="merch-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="order-row__content">
                  <h3>{line?.itemName ?? "Order request"}</h3>
                  <p className="muted">
                    {line ? `Size ${line.variantLabel}` : "No item details"} - {order.customerName}
                  </p>
                  <p className="muted">{formatDate(order.createdAt)}</p>
                </div>
                <span className="status-pill status-pill--soft">
                  {isCompleted ? "Completed" : "Pending"}
                </span>
                <div className="order-row__actions">
                  {!isCompleted && (
                    <button
                      className="primary-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void completeAdminOrder(order.id);
                      }}
                      type="button"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    className="danger-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeOrder(order.id);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <div className="modal-backdrop" role="presentation">
          <div
            aria-labelledby="order-detail-title"
            aria-modal="true"
            className="modal order-modal"
            role="dialog"
          >
            <div className="modal__top">
              <div className="section-heading section-heading--compact">
                <p className="eyebrow">{selectedOrder.status}</p>
                <h2 id="order-detail-title">{selectedOrder.customerName}</h2>
              </div>
              <button
                className="secondary-button"
                onClick={() => setSelectedOrder(null)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="order-detail-lines">
              {selectedOrder.lines.map((line) => (
                <div className="order-detail-line" key={`${selectedOrder.id}-${line.variantId}`}>
                  <div className="order-row__image">
                    {line.imageUrl ? (
                      <img src={line.imageUrl} alt={line.itemName} />
                    ) : (
                      <div className="merch-placeholder" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <strong>{line.itemName}</strong>
                    <p className="muted">Size {line.variantLabel}</p>
                    <p className="muted">Quantity {line.quantity}</p>
                  </div>
                  <span className="price">{formatMoney(line.unitPrice * line.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="order-contact-grid">
              {selectedOrder.email && <p>Email: {selectedOrder.email}</p>}
              {selectedOrder.phoneNumber && <p>Phone: {selectedOrder.phoneNumber}</p>}
              {selectedOrder.instagramHandle && (
                <p>Instagram: {selectedOrder.instagramHandle}</p>
              )}
              <p>Created: {formatDate(selectedOrder.createdAt)}</p>
            </div>
            {selectedOrder.notes && <p>{selectedOrder.notes}</p>}
            <p className="price">Total: {formatMoney(selectedOrder.total)}</p>
            <div className="form-actions">
              {selectedOrder.status !== "Completed" && (
                <button
                  className="primary-button"
                  onClick={() => void completeAdminOrder(selectedOrder.id, true)}
                  type="button"
                >
                  Complete
                </button>
              )}
              <button
                className="danger-button"
                onClick={() => void removeOrder(selectedOrder.id)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
