import type {
  MerchItem,
  MusicRelease,
  NewsPost,
  OrderRequest,
  Show
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export type MerchVariantInput = {
  id?: string;
  label: string;
  sku: string;
  stock: number;
};

export type MerchInput = {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls: string[];
  isActive: boolean;
  variants: MerchVariantInput[];
};

export type MusicInput = {
  title: string;
  releaseType: string;
  releaseYear: number;
  coverImageUrl: string;
  listenUrl: string;
  embedUrl?: string;
  isPublished: boolean;
  links: Array<{ platform: string; url: string }>;
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

export function getShows() {
  return request<Show[]>("/api/shows");
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
  post: Pick<NewsPost, "title" | "category" | "body" | "isPinned">
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

export function uploadMerchImage(adminToken: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

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
