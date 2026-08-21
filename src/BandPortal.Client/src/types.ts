export type Show = {
  id: string;
  title: string;
  venue: string;
  city: string;
  startsAt: string;
  ticketUrl?: string | null;
  notes: string;
  isSoldOut: boolean;
};

export type AboutContent = {
  body: string;
  images: AboutImage[];
  contact: ContactInfo;
};

export type AboutImage = {
  id: string;
  imageUrl: string;
};

export type ContactInfo = {
  phone: string;
  email: string;
  instagramUrl: string;
  youTubeUrl: string;
  spotifyUrl: string;
};

export type NewsPost = {
  id: string;
  title: string;
  category: string;
  body: string;
  linkUrl?: string | null;
  publishedAt: string;
  isPinned: boolean;
};

export type MusicRelease = {
  id: string;
  title: string;
  releaseType: string;
  releaseYear: number;
  coverImageUrl: string;
  listenUrl: string;
  embedUrl?: string | null;
  isPublished: boolean;
  links: MusicPlatformLink[];
};

export type MusicPlatformLink = {
  id: string;
  platform: string;
  url: string;
};

export type MerchItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  isActive: boolean;
  hasSizes: boolean;
  variants: MerchVariant[];
};

export type MerchVariant = {
  id: string;
  label: string;
  sku: string;
  stock: number;
};

export type OrderStatus = "Pending" | "Completed";

export type OrderRequest = {
  id: string;
  customerName: string;
  email: string;
  phoneNumber: string;
  instagramHandle?: string | null;
  notes?: string | null;
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  total: number;
};

export type OrderLine = {
  itemId: string;
  variantId: string;
  itemName: string;
  imageUrl: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
};
