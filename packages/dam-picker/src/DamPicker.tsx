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
  /** Logged-in username — used to show the user's own categories plus global ones. */
  username?: string;
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

export default function DamPicker({ apiBase, token, username, onSelect, onDragStart, filter }: DamPickerProps) {
  const client = useMemo(() => createDamClient(apiBase, token), [apiBase, token]);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetCategories, setAssetCategories] = useState<Map<string, string[]>>(new Map());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadedAssetIds = useRef(new Set<string>());
  const visibleAssets = useMemo(() => (filter ? assets.filter(filter) : assets), [assets, filter]);

  // ── Resizable category panel ──────────────────────────────────────────────────
  const TREE_MIN = 120;
  const TREE_MAX = 400;
  const TREE_DEFAULT = 208; // w-52 = 13rem = 208px
  const [treeWidth, setTreeWidth] = useState(TREE_DEFAULT);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = treeWidth;

    function onMouseMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = ev.clientX - dragStartX.current;
      setTreeWidth(Math.min(TREE_MAX, Math.max(TREE_MIN, dragStartWidth.current + delta)));
    }
    function onMouseUp() {
      dragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [treeWidth]);

  const [categories, setCategories] = useState<Category[]>([]);
  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.creator || c.creator === username || c.access_level === "Global"),
    [categories, username]
  );

  // ── Data load (initial + refresh) ────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    if (refreshKey === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
      loadedAssetIds.current = new Set();
    }
    setError(null);

    Promise.all([client.listAssets(), client.listCategories()])
      .then(([a, c]) => {
        if (cancelled) return;
        setAssets(a);
        setAssetCategories(new Map());
        setCategories(c);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load assets.");
        setLoading(false);
        setRefreshing(false);
      });

    return () => { cancelled = true; };
  }, [client, refreshKey]);

  // ── Background lazy-load asset→category mappings ─────────────────────────────

  useEffect(() => {
    if (assets.length === 0) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadCats(retryCount = 0): Promise<void> {
      const toLoad = assets.filter((a) => !loadedAssetIds.current.has(a.id));
      if (toLoad.length === 0 || cancelled) return;

      for (let i = 0; i < toLoad.length; i += 5) {
        if (cancelled) return;
        const chunk = toLoad.slice(i, i + 5);
        await Promise.all(
          chunk.map(async (asset) => {
            if (loadedAssetIds.current.has(asset.id)) return;
            try {
              const full = await client.getAsset(asset.id);
              if (cancelled) return;
              loadedAssetIds.current.add(asset.id);
              const catIds = full.categories.map((c) => c.id);
              setAssetCategories((prev) => {
                const next = new Map(prev);
                next.set(asset.id, catIds);
                return next;
              });
            } catch {
              // Not marked as loaded — will retry below (up to 2 more times)
            }
          })
        );
      }

      // Retry failed assets after a delay (up to 2 retries total)
      if (!cancelled && retryCount < 2 && assets.some((a) => !loadedAssetIds.current.has(a.id))) {
        retryTimer = setTimeout(() => { if (!cancelled) loadCats(retryCount + 1); }, 3000);
      }
    }

    loadCats();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [assets, client]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const toPickedAsset = useCallback(
    (asset: Asset): PickedAsset => {
      // Absolute URLs so markdown image links work regardless of how/where
      // the note body is later rendered (relative paths break in some contexts).
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const abs = (path: string) => path.startsWith("http") ? path : origin + path;
      return {
        id: asset.id,
        name: asset.name,
        assetType: asset.asset_type,
        size: asset.size,
        url: abs(client.assetUrl(asset.id)),
        thumbnailUrl: abs(client.thumbnailUrl(asset.id)),
      };
    },
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
      <aside className="shrink-0 overflow-y-auto p-2 relative" style={{ width: treeWidth }}>
        <PickerTree
          categories={visibleCategories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      </aside>

      {/* Resize handle */}
      <div
        className="shrink-0 w-1.5 cursor-col-resize bg-slate-200 hover:bg-blue-400 transition-colors"
        onMouseDown={onResizeMouseDown}
      />

      {/* Search + grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets…"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={refreshing}
            title="Refresh"
            className="shrink-0 p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 disabled:opacity-40 transition-colors bg-white"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
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
