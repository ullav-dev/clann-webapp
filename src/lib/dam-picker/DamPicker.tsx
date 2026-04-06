"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createDamClient } from "./api";
import type { Asset, Category, PickedAsset } from "./api";
import PickerTree from "./PickerTree";
import PickerGrid from "./PickerGrid";

export interface DamPickerProps {
  /**
   * Base URL for the DAM API as seen from the browser, e.g. "/api/dam".
   * The host app should proxy this prefix to the ullav-dam-server.
   */
  apiBase: string;
  /** Bearer token from ullav-user-management. */
  token: string;
  /** Called when the user clicks an asset. */
  onSelect: (asset: PickedAsset) => void;
  /**
   * Optional: called when the user starts dragging an asset.
   * The dataTransfer is already populated with application/json,
   * text/plain, and text/uri-list before this fires.
   */
  onDragStart?: (asset: PickedAsset, e: React.DragEvent) => void;
  /** Optional predicate to restrict which assets are shown, e.g. `a => a.asset_type.startsWith("image/")` */
  filter?: (asset: Asset) => boolean;
}

export default function DamPicker({ apiBase, token, onSelect, onDragStart, filter }: DamPickerProps) {
  const client = useMemo(() => createDamClient(apiBase, token), [apiBase, token]);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetCategories, setAssetCategories] = useState<Map<string, string[]>>(new Map());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadedAssetIds = useRef(new Set<string>());
  const visibleAssets = useMemo(() => (filter ? assets.filter(filter) : assets), [assets, filter]);

  const [categories, setCategories] = useState<Category[]>([]);

  // ── Initial data load ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([client.listAssets(), client.listCategories()])
      .then(([a, c]) => {
        if (cancelled) return;
        setAssets(a);
        setCategories(c);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load assets.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [client]);

  // ── Background lazy-load asset→category mappings ─────────────────────────────

  useEffect(() => {
    if (assets.length === 0) return;

    const unloaded = assets.filter((a) => !loadedAssetIds.current.has(a.id));
    if (unloaded.length === 0) return;

    async function loadBatch(batch: Asset[]) {
      for (const asset of batch) {
        if (loadedAssetIds.current.has(asset.id)) continue;
        loadedAssetIds.current.add(asset.id);
        try {
          const full = await client.getAsset(asset.id);
          const catIds = full.categories.map((c) => c.id);
          setAssetCategories((prev) => {
            const next = new Map(prev);
            next.set(asset.id, catIds);
            return next;
          });
        } catch {
          loadedAssetIds.current.delete(asset.id); // allow retry
        }
      }
    }

    for (let i = 0; i < unloaded.length; i += 5) {
      loadBatch(unloaded.slice(i, i + 5));
    }
  }, [assets, client]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const toPickedAsset = useCallback(
    (asset: Asset): PickedAsset => ({
      id: asset.id,
      name: asset.name,
      assetType: asset.asset_type,
      size: asset.size,
      url: client.assetUrl(asset.id),
      thumbnailUrl: client.thumbnailUrl(asset.id),
    }),
    [client]
  );

  function handleSelect(picked: PickedAsset) {
    setSelectedAssetId(picked.id);
    onSelect(picked);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Loading assets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-600 text-sm p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* Category tree */}
      <aside className="w-52 shrink-0 overflow-y-auto border-r border-slate-200 p-3">
        <PickerTree
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      </aside>

      {/* Search + grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <PickerGrid
          assets={visibleAssets}
          assetCategories={assetCategories}
          selectedCategoryId={selectedCategoryId}
          searchQuery={searchQuery}
          selectedAssetId={selectedAssetId}
          getThumbnailUrl={client.thumbnailUrl}
          toPickedAsset={toPickedAsset}
          onSelect={handleSelect}
          onDragStart={onDragStart}
        />
      </div>
    </div>
  );
}
