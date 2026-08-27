import type {
  AboutContent,
  MerchItem,
  MusicRelease,
  NewsPost,
  OrderRequest,
  Show
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_IMAGE_DIMENSION = 1600;
const UPLOAD_IMAGE_QUALITY = 0.82;

export type MerchVariantInput = {
  id?: string;
  label: string;
  stock: number;
};

export type MerchInput = {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls: string[];
  isActive: boolean;
  hasSizes: boolean;
  variants: MerchVariantInput[];
};

export type MusicInput = {
  title: string;
  releaseType: string;
  releaseYear: number;
  coverImageUrl: string;
  listenUrl: string;
  links: Array<{ platform: string; url: string }>;
};

export type AboutInput = {
  body: string;
  images: Array<{ id?: string; imageUrl: string }>;
  contact: {
    phone: string;
    email: string;
    instagramUrl: string;
    youTubeUrl: string;
    spotifyUrl: string;
  };
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  adminToken?: string
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (adminToken) {
    headers.set("X-Admin-Token", adminToken);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Could not compress image."));
      },
      type,
      quality
    );
  });
}

function compressedFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") + ".webp";
}

async function compressImageForUpload(file: File) {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const scale = Math.min(
      1,
      MAX_UPLOAD_IMAGE_DIMENSION / image.naturalWidth,
      MAX_UPLOAD_IMAGE_DIMENSION / image.naturalHeight
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/webp", UPLOAD_IMAGE_QUALITY);
    if (blob.size >= file.size) {
      return file;
    }

    return new File([blob], compressedFileName(file.name), {
      type: "image/webp",
      lastModified: Date.now()
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function getShows() {
  return request<Show[]>("/api/shows");
}

export function getAbout() {
  return request<AboutContent>("/api/about");
}

export function getAdminAbout(adminToken: string) {
  return request<AboutContent>("/api/admin/about", {}, adminToken);
}

export function updateAbout(adminToken: string, about: AboutInput) {
  return request<AboutContent>(
    "/api/admin/about",
    {
      method: "PUT",
      body: JSON.stringify(about)
    },
    adminToken
  );
}

export function createShow(adminToken: string, show: Omit<Show, "id">) {
  return request<Show>(
    "/api/admin/shows",
    {
      method: "POST",
      body: JSON.stringify(show)
    },
    adminToken
  );
}

export function updateShow(adminToken: string, id: string, show: Omit<Show, "id">) {
  return request<Show>(
    `/api/admin/shows/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(show)
    },
    adminToken
  );
}

export function deleteShow(adminToken: string, id: string) {
  return request<void>(
    `/api/admin/shows/${id}`,
    {
      method: "DELETE"
    },
    adminToken
  );
}

export function getNews() {
  return request<NewsPost[]>("/api/news");
}

export function createNewsPost(
  adminToken: string,
  post: Pick<NewsPost, "title" | "category" | "body" | "linkUrl" | "isPinned">
) {
  return request<NewsPost>(
    "/api/admin/news",
    {
      method: "POST",
      body: JSON.stringify(post)
    },
    adminToken
  );
}

export function updateNewsPost(
  adminToken: string,
  id: string,
  post: Pick<NewsPost, "title" | "category" | "body" | "linkUrl" | "isPinned">
) {
  return request<NewsPost>(
    `/api/admin/news/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(post)
    },
    adminToken
  );
}

export function deleteNewsPost(adminToken: string, id: string) {
  return request<void>(
    `/api/admin/news/${id}`,
    {
      method: "DELETE"
    },
    adminToken
  );
}

export function getMusic() {
  return request<MusicRelease[]>("/api/music");
}

export function getAdminMusic(adminToken: string) {
  return request<MusicRelease[]>("/api/admin/music", {}, adminToken);
}

export function createMusicRelease(adminToken: string, release: MusicInput) {
  return request<MusicRelease>(
    "/api/admin/music",
    {
      method: "POST",
      body: JSON.stringify(release)
    },
    adminToken
  );
}

export function updateMusicRelease(adminToken: string, id: string, release: MusicInput) {
  return request<MusicRelease>(
    `/api/admin/music/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(release)
    },
    adminToken
  );
}

export function deleteMusicRelease(adminToken: string, id: string) {
  return request<void>(
    `/api/admin/music/${id}`,
    {
      method: "DELETE"
    },
    adminToken
  );
}

export function getMerch() {
  return request<MerchItem[]>("/api/merch");
}

export function getAdminMerch(adminToken: string) {
  return request<MerchItem[]>("/api/admin/merch", {}, adminToken);
}

export function createMerchItem(
  adminToken: string,
  item: MerchInput
) {
  return request<MerchItem>(
    "/api/admin/merch",
    {
      method: "POST",
      body: JSON.stringify(item)
    },
    adminToken
  );
}

export function updateMerchItem(adminToken: string, id: string, item: MerchInput) {
  return request<MerchItem>(
    `/api/admin/merch/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(item)
    },
    adminToken
  );
}

export function deleteMerchItem(adminToken: string, id: string) {
  return request<void>(
    `/api/admin/merch/${id}`,
    {
      method: "DELETE"
    },
    adminToken
  );
}

export function setVariantStock(
  adminToken: string,
  itemId: string,
  variantId: string,
  stock: number
) {
  return request(
    `/api/admin/merch/${itemId}/variants/${variantId}/stock`,
    {
      method: "PUT",
      body: JSON.stringify({ stock })
    },
    adminToken
  );
}

export async function uploadMerchImage(adminToken: string, file: File) {
  const uploadFile = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append("file", uploadFile);

  return request<{ imageUrl: string }>(
    "/api/admin/uploads/images",
    {
      method: "POST",
      body: formData
    },
    adminToken
  );
}

export function createOrder(order: {
  customerName: string;
  email: string;
  phoneNumber?: string;
  instagramHandle?: string;
  notes?: string;
  lines: Array<{ itemId: string; variantId: string; quantity: number }>;
}) {
  return request<OrderRequest>("/api/orders", {
    method: "POST",
    body: JSON.stringify(order)
  });
}

export function getAdminOrders(adminToken: string) {
  return request<OrderRequest[]>("/api/admin/orders", {}, adminToken);
}

export function completeOrder(adminToken: string, id: string) {
  return request<OrderRequest>(
    `/api/admin/orders/${id}/complete`,
    {
      method: "PATCH"
    },
    adminToken
  );
}

export function deleteOrder(adminToken: string, id: string) {
  return request<void>(
    `/api/admin/orders/${id}`,
    {
      method: "DELETE"
    },
    adminToken
  );
}
