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
  getAdminAbout,
  getAdminMerch,
  getAdminMusic,
  getAdminOrders,
  getNews,
  getShows,
  uploadMerchImage,
  updateMerchItem,
  updateAbout,
  updateMusicRelease,
  updateNewsPost,
  updateShow,
  type AboutInput,
  type MerchInput,
  type MusicInput
} from "../api/client";
import { formatDate, formatMoney } from "../format";
import type { MerchItem, MusicRelease, NewsPost, OrderLine, OrderRequest, Show } from "../types";

type AdminTab = "about" | "shows" | "posts" | "music" | "merch" | "orders";

type AboutImageDraft = {
  id?: string;
  imageUrl: string;
};

type ContactForm = {
  phone: string;
  email: string;
  instagramUrl: string;
  youTubeUrl: string;
  spotifyUrl: string;
};

type AboutForm = {
  body: string;
  images: AboutImageDraft[];
  contact: ContactForm;
};

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
  hasSizes: boolean;
  variants: MerchVariantDraft[];
};

type ShowForm = {
  id?: string;
  title: string;
  venue: string;
  city: string;
  startsAt: string;
  ticketUrl: string;
  notes: string;
  isSoldOut: boolean;
};

type PostForm = {
  id?: string;
  title: string;
  category: string;
  body: string;
  linkUrl: string;
  isPinned: boolean;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "about", label: "About" },
  { id: "shows", label: "Shows" },
  { id: "posts", label: "Posts" },
  { id: "music", label: "Music" },
  { id: "merch", label: "Merch" },
  { id: "orders", label: "Orders" }
];

const imageAccept = ".jpg,.jpeg,.png,.webp,.gif,.avif";
const acceptedImageExtensions = imageAccept.split(",");
const maxImageBytes = 20 * 1024 * 1024;
const merchSizes = ["S", "M", "L", "XL", "XXL"];
const musicPlatforms = [
  "Spotify",
  "YouTube Music",
  "Apple Music",
  "Bandcamp",
  "SoundCloud",
  "Deezer",
  "Tidal"
] as const;

type MusicPlatformName = (typeof musicPlatforms)[number];

type MusicForm = {
  id?: string;
  title: string;
  releaseType: string;
  releaseYear: string;
  coverImageUrl: string;
  platformLinks: Record<MusicPlatformName, string>;
};

type AdminPageProps = {
  adminToken: string;
  onAuthorizationLost?: (message?: string) => void;
  onBack: () => void;
  onLogout: () => void;
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
    hasSizes: true,
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
    hasSizes: item.hasSizes,
    variants: item.hasSizes
      ? normalizeMerchVariants(
          item.variants.map((variant) => ({
            id: variant.id,
            label: variant.label,
            sku: variant.sku,
            stock: String(variant.stock)
          }))
        )
      : [
          {
            id: item.variants[0]?.id,
            label: item.variants[0]?.label || "Stock",
            sku: item.variants[0]?.sku || merchSku(item.name, "STOCK"),
            stock: String(item.variants[0]?.stock ?? 0)
          }
        ]
  };
}

function payloadFromDraft(draft: MerchDraft): MerchInput {
  const imageUrls = normalizeImageUrls(draft.imageUrl, draft.imageUrls);
  const variants = draft.hasSizes
    ? normalizeMerchVariants(draft.variants).map((variant) => ({
        id: variant.id,
        label: variant.label.trim(),
        sku: variant.sku.trim() || merchSku(draft.name, variant.label),
        stock: Math.max(0, Number(variant.stock || 0))
      }))
    : [
        {
          id: draft.variants[0]?.id,
          label: "Stock",
          sku: draft.variants[0]?.sku.trim() || merchSku(draft.name, "STOCK"),
          stock: Math.max(0, Number(draft.variants[0]?.stock || 0))
        }
      ];

  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    price: Number(draft.price || 0),
    imageUrl: imageUrls[0] ?? "",
    imageUrls,
    isActive: draft.isActive,
    hasSizes: draft.hasSizes,
    variants
  };
}

function merchStockSummary(item: MerchItem) {
  if (!item.hasSizes) {
    const stock = item.variants[0]?.stock ?? 0;
    return `${stock} in stock`;
  }

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

function emptyAboutForm(): AboutForm {
  return {
    body: "",
    images: [],
    contact: {
      phone: "",
      email: "",
      instagramUrl: "",
      youTubeUrl: "",
      spotifyUrl: ""
    }
  };
}

function aboutPayloadFromForm(form: AboutForm): AboutInput {
  return {
    body: form.body,
    images: form.images
      .map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl.trim()
      }))
      .filter((image) => image.imageUrl),
    contact: {
      phone: form.contact.phone.trim(),
      email: form.contact.email.trim(),
      instagramUrl: form.contact.instagramUrl.trim(),
      youTubeUrl: form.contact.youTubeUrl.trim(),
      spotifyUrl: form.contact.spotifyUrl.trim()
    }
  };
}

function fileExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart >= 0 ? fileName.slice(extensionStart).toLowerCase() : "";
}

function isAcceptedImage(file: File) {
  return acceptedImageExtensions.includes(fileExtension(file.name));
}

function fileSizeLabel(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadFailureMessage(result: PromiseSettledResult<unknown>, file: File) {
  if (result.status === "fulfilled") {
    return "";
  }

  const reason = result.reason instanceof Error && result.reason.message
    ? result.reason.message
    : "upload failed";

  return `${file.name} (${reason})`;
}

function dateTimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyShowForm(): ShowForm {
  return {
    title: "",
    venue: "",
    city: "",
    startsAt: "",
    ticketUrl: "",
    notes: "",
    isSoldOut: false
  };
}

function showFormFromShow(show: Show): ShowForm {
  return {
    id: show.id,
    title: show.title,
    venue: show.venue,
    city: show.city,
    startsAt: dateTimeLocalValue(show.startsAt),
    ticketUrl: show.ticketUrl ?? "",
    notes: show.notes,
    isSoldOut: show.isSoldOut
  };
}

function emptyPostForm(): PostForm {
  return {
    title: "",
    category: "News",
    body: "",
    linkUrl: "",
    isPinned: false
  };
}

function postFormFromPost(post: NewsPost): PostForm {
  return {
    id: post.id,
    title: post.title,
    category: post.category,
    body: post.body,
    linkUrl: post.linkUrl ?? "",
    isPinned: post.isPinned
  };
}

function emptyPlatformLinks(): Record<MusicPlatformName, string> {
  return musicPlatforms.reduce(
    (links, platform) => ({ ...links, [platform]: "" }),
    {} as Record<MusicPlatformName, string>
  );
}

function emptyMusicForm(): MusicForm {
  return {
    title: "",
    releaseType: "Album",
    releaseYear: new Date().getFullYear().toString(),
    coverImageUrl: "",
    platformLinks: emptyPlatformLinks()
  };
}

function platformKey(value: string): MusicPlatformName | null {
  const normalized = value.toLowerCase();

  if (normalized.includes("youtube")) {
    return "YouTube Music";
  }

  return (
    musicPlatforms.find((platform) =>
      normalized.includes(platform.toLowerCase())
    ) ?? null
  );
}

function musicFormFromRelease(release: MusicRelease): MusicForm {
  const platformLinks = emptyPlatformLinks();

  release.links.forEach((link) => {
    const key = platformKey(link.platform) ?? platformKey(link.url);

    if (key) {
      platformLinks[key] = link.url;
    }
  });

  if (!platformLinks.Spotify && platformKey(release.listenUrl) === "Spotify") {
    platformLinks.Spotify = release.listenUrl;
  }

  return {
    id: release.id,
    title: release.title,
    releaseType: release.releaseType,
    releaseYear: String(release.releaseYear),
    coverImageUrl: release.coverImageUrl,
    platformLinks
  };
}

function musicPayloadFromForm(form: MusicForm): MusicInput {
  const spotifyUrl = form.platformLinks.Spotify.trim();

  return {
    title: form.title.trim(),
    releaseType: form.releaseType,
    releaseYear: Number(form.releaseYear),
    coverImageUrl: form.coverImageUrl.trim(),
    listenUrl: spotifyUrl,
    embedUrl: "",
    isPublished: true,
    links: musicPlatforms
      .map((platform) => ({
        platform,
        url: form.platformLinks[platform].trim()
      }))
      .filter((link) => link.url)
  };
}

export default function AdminPage({
  adminToken,
  onAuthorizationLost,
  onBack,
  onLogout
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

  const [aboutForm, setAboutForm] = useState<AboutForm>(emptyAboutForm);
  const [showForm, setShowForm] = useState<ShowForm>(emptyShowForm);
  const [postForm, setPostForm] = useState<PostForm>(emptyPostForm);
  const [musicForm, setMusicForm] = useState<MusicForm>(emptyMusicForm);
  const [merchDraft, setMerchDraft] = useState<MerchDraft>(emptyMerchDraft);

  const editingShow = Boolean(showForm.id);
  const editingPost = Boolean(postForm.id);
  const editingMerch = Boolean(merchDraft.id);
  const editingMusic = Boolean(musicForm.id);

  async function refreshPublicData() {
    const [nextShows, nextPosts] = await Promise.all([getShows(), getNews()]);
    setShows(nextShows);
    setPosts(nextPosts);
  }

  async function refreshAdminData(currentToken = adminToken) {
    const nextToken = currentToken.trim();

    const [nextAbout, nextMusic, nextMerch, nextOrders] = await Promise.all([
      getAdminAbout(nextToken),
      getAdminMusic(nextToken),
      getAdminMerch(nextToken),
      getAdminOrders(nextToken)
    ]);
    setAboutForm({
      body: nextAbout.body,
      images: nextAbout.images,
      contact: nextAbout.contact
    });
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

  async function submitAbout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const nextAbout = await updateAbout(adminToken.trim(), aboutPayloadFromForm(aboutForm));
      setAboutForm({
        body: nextAbout.body,
        images: nextAbout.images,
        contact: nextAbout.contact
      });
      setMessage("About page saved.");
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not save about page.");
    }
  }

  async function uploadAboutImages(files?: FileList | File[]) {
    const imageFiles = Array.from(files ?? []);

    if (imageFiles.length === 0) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const validFiles = imageFiles.filter(
        (file) => isAcceptedImage(file) && file.size <= maxImageBytes
      );
      const skippedFiles = imageFiles.filter((file) => !isAcceptedImage(file));
      const oversizedFiles = imageFiles.filter(
        (file) => isAcceptedImage(file) && file.size > maxImageBytes
      );

      if (validFiles.length === 0) {
        const oversizedMessage = oversizedFiles.length
          ? ` Too large: ${oversizedFiles
              .map((file) => `${file.name} is ${fileSizeLabel(file.size)}`)
              .join(", ")}.`
          : "";
        setError(`Use JPG, PNG, WEBP, GIF, or AVIF images under 20 MB.${oversizedMessage}`);
        return;
      }

      const uploadResults = await Promise.allSettled(
        validFiles.map((file) => uploadMerchImage(adminToken.trim(), file))
      );
      const uploads = uploadResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const failedFiles = uploadResults
        .map((result, index) => uploadFailureMessage(result, validFiles[index]))
        .filter(Boolean);

      if (uploads.length === 0) {
        setError("No images uploaded. Use JPG, PNG, WEBP, GIF, or AVIF images under 20 MB.");
        return;
      }

      setAboutForm((current) => ({
        ...current,
        images: current.images.concat(
          uploads.map((upload) => ({ imageUrl: upload.imageUrl }))
        )
      }));
      const uploadedMessage =
        uploads.length === 1 ? "About image uploaded." : `${uploads.length} about images uploaded.`;
      const skippedMessage = skippedFiles.length
        ? ` Skipped unsupported files: ${skippedFiles.map((file) => file.name).join(", ")}.`
        : "";
      const oversizedMessage = oversizedFiles.length
        ? ` Too large: ${oversizedFiles
            .map((file) => `${file.name} is ${fileSizeLabel(file.size)}`)
            .join(", ")}.`
        : "";
      const failedMessage = failedFiles.length
        ? ` Could not upload: ${failedFiles.join(", ")}.`
        : "";
      setMessage(`${uploadedMessage}${skippedMessage}${oversizedMessage}${failedMessage}`);
    } catch (err) {
      handleAdminError(err, "Could not upload about images.");
    }
  }

  function removeAboutImage(index: number) {
    setAboutForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index)
    }));
  }

  function reorderAboutImage(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      return;
    }

    setAboutForm((current) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.images.length ||
        toIndex >= current.images.length
      ) {
        return current;
      }

      const images = [...current.images];
      const [movedImage] = images.splice(fromIndex, 1);
      images.splice(toIndex, 0, movedImage);

      return {
        ...current,
        images
      };
    });
  }

  async function submitShow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = {
        title: showForm.title,
        venue: showForm.venue,
        city: showForm.city,
        startsAt: new Date(showForm.startsAt).toISOString(),
        ticketUrl: showForm.ticketUrl,
        notes: showForm.notes,
        isSoldOut: showForm.isSoldOut
      };

      if (showForm.id) {
        await updateShow(adminToken.trim(), showForm.id, payload);
        setMessage("Show saved.");
      } else {
        await createShow(adminToken.trim(), payload);
        setMessage("Show added.");
      }

      setShowForm(emptyShowForm());
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not save show.");
    }
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = {
        title: postForm.title,
        category: postForm.category,
        body: postForm.body,
        linkUrl: postForm.linkUrl,
        isPinned: postForm.isPinned
      };

      if (postForm.id) {
        await updateNewsPost(adminToken.trim(), postForm.id, payload);
        setMessage("Post saved.");
      } else {
        await createNewsPost(adminToken.trim(), payload);
        setMessage("Post added.");
      }

      setPostForm(emptyPostForm());
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not save post.");
    }
  }

  async function submitMusic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = musicPayloadFromForm(musicForm);

      if (musicForm.id) {
        await updateMusicRelease(adminToken.trim(), musicForm.id, payload);
        setMessage("Music release saved.");
      } else {
        await createMusicRelease(adminToken.trim(), payload);
        setMessage("Music release added.");
      }

      setMusicForm(emptyMusicForm());
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not save music release.");
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
      setShowForm((current) =>
        current.id === id ? emptyShowForm() : current
      );
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not remove show.");
    }
  }

  async function removePost(id: string) {
    try {
      await deleteNewsPost(adminToken.trim(), id);
      setMessage("Post removed.");
      setPostForm((current) =>
        current.id === id ? emptyPostForm() : current
      );
      await refreshAll();
    } catch (err) {
      handleAdminError(err, "Could not remove post.");
    }
  }

  async function removeMusic(id: string) {
    try {
      await deleteMusicRelease(adminToken.trim(), id);
      setMessage("Music release removed.");
      setMusicForm((current) =>
        current.id === id ? emptyMusicForm() : current
      );
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
      if (!isAcceptedImage(file)) {
        setError("Use a JPG, PNG, WEBP, GIF, or AVIF image.");
        return;
      }

      if (file.size > maxImageBytes) {
        setError(`${file.name} is ${fileSizeLabel(file.size)}. Use an image under 20 MB.`);
        return;
      }

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
      const validFiles = imageFiles.filter(
        (file) => isAcceptedImage(file) && file.size <= maxImageBytes
      );
      const skippedFiles = imageFiles.filter((file) => !isAcceptedImage(file));
      const oversizedFiles = imageFiles.filter(
        (file) => isAcceptedImage(file) && file.size > maxImageBytes
      );

      if (validFiles.length === 0) {
        const oversizedMessage = oversizedFiles.length
          ? ` Too large: ${oversizedFiles
              .map((file) => `${file.name} is ${fileSizeLabel(file.size)}`)
              .join(", ")}.`
          : "";
        setError(`Use JPG, PNG, WEBP, GIF, or AVIF images under 20 MB.${oversizedMessage}`);
        return;
      }

      const uploadResults = await Promise.allSettled(
        validFiles.map((file) => uploadMerchImage(adminToken.trim(), file))
      );
      const uploads = uploadResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const failedFiles = uploadResults
        .map((result, index) => uploadFailureMessage(result, validFiles[index]))
        .filter(Boolean);

      if (uploads.length === 0) {
        setError("No images uploaded. Use JPG, PNG, WEBP, GIF, or AVIF images under 20 MB.");
        return;
      }

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
      const uploadedMessage =
        uploads.length === 1 ? "Image uploaded." : `${uploads.length} images uploaded.`;
      const skippedMessage = skippedFiles.length
        ? ` Skipped unsupported files: ${skippedFiles.map((file) => file.name).join(", ")}.`
        : "";
      const oversizedMessage = oversizedFiles.length
        ? ` Too large: ${oversizedFiles
            .map((file) => `${file.name} is ${fileSizeLabel(file.size)}`)
            .join(", ")}.`
        : "";
      const failedMessage = failedFiles.length
        ? ` Could not upload: ${failedFiles.join(", ")}.`
        : "";
      setMessage(`${uploadedMessage}${skippedMessage}${oversizedMessage}${failedMessage}`);
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
        <div className="admin-header__actions">
          <button className="secondary-button" onClick={onBack} type="button">
            Back to Site
          </button>
          <button className="danger-button" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
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

      {activeTab === "about" && (
        <form className="admin-form about-editor" onSubmit={submitAbout}>
          <h3>Edit About Page</h3>
          <label>
            Text body
            <textarea
              className="about-editor__body"
              value={aboutForm.body}
              onChange={(event) =>
                setAboutForm({ ...aboutForm, body: event.target.value })
              }
            />
          </label>

          <div
            className="image-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void uploadAboutImages(event.dataTransfer.files);
            }}
          >
            <p>Drop carousel images here or choose local files.</p>
            <p className="muted">JPG, PNG, WEBP, GIF, or AVIF. Max 20 MB each.</p>
            <label className="file-button">
              Choose Images
              <input
                accept={imageAccept}
                multiple
                onChange={(event) => void uploadAboutImages(event.target.files ?? undefined)}
                type="file"
              />
            </label>
          </div>

          {aboutForm.images.length > 0 && (
            <div className="image-preview-strip">
              {aboutForm.images.map((image, index) => (
                <div
                  className={
                    draggingImageIndex === index
                      ? "image-preview-card image-preview-card--dragging"
                      : "image-preview-card"
                  }
                  draggable
                  key={`${image.id ?? image.imageUrl}-${index}`}
                  onDragStart={(event) => {
                    setDraggingImageIndex(index);
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                    reorderAboutImage(draggingImageIndex ?? fromIndex, index);
                    setDraggingImageIndex(null);
                  }}
                >
                  <span className="image-preview-card__order">{index + 1}</span>
                  <img src={image.imageUrl} alt="About carousel preview" />
                  <button
                    className="danger-button"
                    onClick={() => removeAboutImage(index)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="contact-editor">
            <p className="form-subheading">Contact</p>
            <label>
              Phone
              <input
                value={aboutForm.contact.phone}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    contact: { ...aboutForm.contact, phone: event.target.value }
                  })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={aboutForm.contact.email}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    contact: { ...aboutForm.contact, email: event.target.value }
                  })
                }
              />
            </label>
            <label>
              Instagram link
              <input
                value={aboutForm.contact.instagramUrl}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    contact: { ...aboutForm.contact, instagramUrl: event.target.value }
                  })
                }
              />
            </label>
            <label>
              YouTube link
              <input
                value={aboutForm.contact.youTubeUrl}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    contact: { ...aboutForm.contact, youTubeUrl: event.target.value }
                  })
                }
              />
            </label>
            <label>
              Spotify link
              <input
                value={aboutForm.contact.spotifyUrl}
                onChange={(event) =>
                  setAboutForm({
                    ...aboutForm,
                    contact: { ...aboutForm.contact, spotifyUrl: event.target.value }
                  })
                }
              />
            </label>
          </div>

          <button className="primary-button">Save About Page</button>
        </form>
      )}

      {activeTab === "shows" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={submitShow}>
            <h3>{editingShow ? "Edit Show" : "Add Show"}</h3>
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
            <div className="form-actions">
              <button className="primary-button">
                {editingShow ? "Save Show" : "Add Show"}
              </button>
              {editingShow && (
                <button
                  className="secondary-button"
                  onClick={() => setShowForm(emptyShowForm())}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
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
                <div className="compact-card__actions">
                  <button
                    className="secondary-button"
                    onClick={() => setShowForm(showFormFromShow(show))}
                    type="button"
                  >
                    Edit
                  </button>
                  <button className="danger-button" onClick={() => void removeShow(show.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === "posts" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={submitPost}>
            <h3>{editingPost ? "Edit Post" : "Add Post"}</h3>
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
            <label>
              Link destination
              <input
                placeholder="Instagram post, ticket page, video..."
                value={postForm.linkUrl}
                onChange={(event) =>
                  setPostForm({ ...postForm, linkUrl: event.target.value })
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
            <div className="form-actions">
              <button className="primary-button">
                {editingPost ? "Save Post" : "Add Post"}
              </button>
              {editingPost && (
                <button
                  className="secondary-button"
                  onClick={() => setPostForm(emptyPostForm())}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="admin-list">
            {posts.length === 0 && <p className="empty-state">No posts yet.</p>}
            {posts.map((post) => (
              <article className="compact-card" key={post.id}>
                <div>
                  <h3>{post.title}</h3>
                  <p className="muted">{post.category}</p>
                  {post.linkUrl && <p className="muted">{post.linkUrl}</p>}
                </div>
                <div className="compact-card__actions">
                  <button
                    className="secondary-button"
                    onClick={() => setPostForm(postFormFromPost(post))}
                    type="button"
                  >
                    Edit
                  </button>
                  <button className="danger-button" onClick={() => void removePost(post.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === "music" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={submitMusic}>
            <h3>{editingMusic ? "Edit Music Release" : "Add Music Release"}</h3>
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
                  accept={imageAccept}
                  onChange={(event) => void uploadMusicCover(event.target.files ?? undefined)}
                  type="file"
                />
              </label>
            </div>
            <div className="platform-field-grid">
              <p className="form-subheading">Platform links</p>
              {musicPlatforms.map((platform) => (
                <label key={platform}>
                  {platform === "Spotify" ? "Spotify" : platform}
                  <input
                    placeholder={
                      platform === "Spotify"
                        ? "Spotify album link"
                        : undefined
                    }
                    required={platform === "Spotify"}
                    value={musicForm.platformLinks[platform]}
                    onChange={(event) =>
                      setMusicForm({
                        ...musicForm,
                        platformLinks: {
                          ...musicForm.platformLinks,
                          [platform]: event.target.value
                        }
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button className="primary-button">
                {editingMusic ? "Save Release" : "Add Release"}
              </button>
              {editingMusic && (
                <button
                  className="secondary-button"
                  onClick={() => setMusicForm(emptyMusicForm())}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
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
                </div>
                <div className="music-admin-row__actions">
                  <button
                    className="secondary-button"
                    onClick={() => setMusicForm(musicFormFromRelease(release))}
                    type="button"
                  >
                    Edit
                  </button>
                  <button className="danger-button" onClick={() => void removeMusic(release.id)}>
                    Remove
                  </button>
                </div>
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
                  accept={imageAccept}
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
            <label className="checkbox-row">
              <input
                checked={merchDraft.hasSizes}
                onChange={(event) => {
                  const hasSizes = event.target.checked;
                  setMerchDraft((current) => ({
                    ...current,
                    hasSizes,
                    variants: hasSizes
                      ? normalizeMerchVariants(current.variants)
                      : [
                          {
                            id: current.variants[0]?.id,
                            label: "Stock",
                            sku: current.variants[0]?.sku || merchSku(current.name, "STOCK"),
                            stock: current.variants[0]?.stock ?? "0"
                          }
                        ]
                  }));
                }}
                type="checkbox"
              />
              Show sizes
            </label>

            <div className="size-stock-grid">
              <div className="form-subheading">
                {merchDraft.hasSizes ? "Size stock" : "Stock"}
              </div>
              {merchDraft.hasSizes ? (
                merchDraft.variants.map((variant, index) => (
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
                ))
              ) : (
                <label className="size-stock-row">
                  <span>Total</span>
                  <input
                    aria-label="Total stock"
                    min="0"
                    required
                    type="number"
                    value={merchDraft.variants[0]?.stock ?? "0"}
                    onChange={(event) =>
                      updateMerchVariant(0, {
                        label: "Stock",
                        sku: merchDraft.variants[0]?.sku || merchSku(merchDraft.name, "STOCK"),
                        stock: event.target.value
                      })
                    }
                  />
                </label>
              )}
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
