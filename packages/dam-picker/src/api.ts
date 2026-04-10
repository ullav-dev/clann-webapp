// API client for ullav-dam-server with a configurable base URL.
// The base should be the host app's proxy prefix, e.g. "/api/dam".

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  size: number;
  storage_key: string;
  bucket: string;
  caption: string | null;
  keywords: string | null;
  creator: string | null;
  copyright_notice: string | null;
  available: boolean;
  available_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetWithCategories extends Asset {
  categories: Category[];
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  creator: string | null;
  access_level: string;
  created_at: string;
  updated_at: string;
}

/** The shape returned to the host app when an asset is selected or dragged. */
export interface PickedAsset {
  id: string;
  name: string;
  assetType: string;
  size: number;
  /** Base asset URL — suitable for display, embedding, or linking. */
  url: string;
  thumbnailUrl: string;
}

export function createDamClient(base: string, token: string) {
  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return undefined as T;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
    return data as T;
  }

  return {
    listAssets: (): Promise<Asset[]> => get("/assets"),
    listCategories: (): Promise<Category[]> => get("/categories"),
    getAsset: (id: string): Promise<AssetWithCategories> => get(`/assets/${id}`),
    thumbnailUrl: (id: string): string => `${base}/assets/${id}/thumbnail`,
    assetUrl: (id: string): string => `${base}/assets/${id}`,
  };
}

export type DamClient = ReturnType<typeof createDamClient>;
