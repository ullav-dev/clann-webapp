"use client";

import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type { Asset, PickedAsset } from "./api";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const DEFAULT_PAGE_SIZE = 20;

type SortField = "name" | "asset_type" | "created_at" | "size";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "name",       label: "Name" },
  { field: "asset_type", label: "Type" },
  { field: "created_at", label: "Date" },
  { field: "size",       label: "Size" },
];

function sortAssets(assets: Asset[], field: SortField, dir: SortDir): Asset[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...assets].sort((a, b) => {
    let cmp = 0;
    if (field === "name") cmp = a.name.localeCompare(b.name);
    else if (field === "asset_type") cmp = a.asset_type.localeCompare(b.asset_type);
    else if (field === "created_at") cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    else if (field === "size") cmp = a.size - b.size;
    return cmp * mul;
  });
}

function totalPages(count: number, size: number) {
  return Math.max(1, Math.ceil(count / size));
}

function pageSlice<T>(items: T[], page: number, size: number): T[] {
  return items.slice((page - 1) * size, page * size);
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeInfo(raw: string): { label: string; cls: string } {
  const t = raw.toLowerCase();
  if (t.startsWith("image/") || t === "image") {
    const sub = t.includes("/") ? t.split("/")[1].split("+")[0].toUpperCase() : "IMAGE";
    return { label: sub, cls: "bg-blue-100 text-blue-700" };
  }
  if (t.startsWith("video/") || t === "video")
    return { label: "VIDEO", cls: "bg-purple-100 text-purple-700" };
  if (t.startsWith("audio/") || t === "audio")
    return { label: "AUDIO", cls: "bg-green-100 text-green-700" };
  if (t === "application/pdf" || t === "pdf")
    return { label: "PDF", cls: "bg-red-100 text-red-700" };
  if (t.startsWith("text/") || t.includes("document") || t.includes("word") || t === "document")
    return { label: "DOC", cls: "bg-amber-100 text-amber-700" };
  if (t.includes("spreadsheet") || t.includes("excel") || t === "spreadsheet")
    return { label: "XLS", cls: "bg-amber-100 text-amber-700" };
  if (t.includes("presentation") || t.includes("powerpoint") || t === "presentation")
    return { label: "PPT", cls: "bg-orange-100 text-orange-700" };
  if (t.includes("iwork-pages") || t.includes("vnd.apple.pages"))
    return { label: "PAGES", cls: "bg-amber-100 text-amber-700" };
  if (t.includes("iwork-numbers") || t.includes("vnd.apple.numbers"))
    return { label: "NUMBERS", cls: "bg-green-100 text-green-700" };
  if (t.includes("iwork-keynote") || t.includes("vnd.apple.keynote"))
    return { label: "KEYNOTE", cls: "bg-blue-100 text-blue-700" };
  if (t.includes("zip") || t.includes("archive") || t === "archive")
    return { label: "ZIP", cls: "bg-slate-100 text-slate-600" };
  const sub = t.includes("/") ? t.split("/")[1].split("+")[0] : t;
  return { label: sub === "octet-stream" ? "FILE" : sub.toUpperCase(), cls: "bg-slate-100 text-slate-600" };
}

function ThumbnailImage({
  id,
  name,
  assetType,
  getThumbnailUrl,
}: {
  id: string;
  name: string;
  assetType: string;
  getThumbnailUrl: (id: string) => string;
}) {
  const [imgState, setImgState] = useState<"loading" | "ok" | "error">("loading");
  const { label, cls } = typeInfo(assetType);

  return (
    <>
      <img
        src={getThumbnailUrl(id)}
        alt={name}
        className={`w-full h-full object-cover transition-opacity duration-150 ${imgState === "ok" ? "opacity-100" : "opacity-0 absolute inset-0"}`}
        onLoad={() => setImgState("ok")}
        onError={() => setImgState("error")}
      />
      {imgState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${cls}`}>{label}</span>
        </div>
      )}
    </>
  );
}

interface Props {
  assets: Asset[];
  assetCategories: Map<string, string[]>;
  selectedCategoryId: string | null | undefined;
  searchQuery: string;
  selectedAssetId: string | null;
  getThumbnailUrl: (id: string) => string;
  toPickedAsset: (asset: Asset) => PickedAsset;
  onSelect: (asset: PickedAsset) => void;
  onDragStart?: (asset: PickedAsset, e: React.DragEvent) => void;
}

export default function PickerGrid({
  assets,
  assetCategories,
  selectedCategoryId,
  searchQuery,
  selectedAssetId,
  getThumbnailUrl,
  toPickedAsset,
  onSelect,
  onDragStart,
}: Props) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hoverPreview, setHoverPreview] = useState<{ id: string; rect: DOMRect } | null>(null);

  useEffect(() => { setPage(1); }, [searchQuery, selectedCategoryId, pageSize, sortField, sortDir]);

  const filtered = useMemo(() => assets.filter((asset) => {
    if (selectedCategoryId === undefined && !searchQuery) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        asset.name.toLowerCase().includes(q) ||
        (asset.caption ?? "").toLowerCase().includes(q) ||
        (asset.keywords ?? "").toLowerCase().includes(q) ||
        (asset.creator ?? "").toLowerCase().includes(q) ||
        (asset.description ?? "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (selectedCategoryId) {
      const cats = assetCategories.get(asset.id);
      if (cats === undefined) return false; // not loaded yet — hide until confirmed
      return cats.includes(selectedCategoryId);
    }
    return true;
  }), [assets, assetCategories, searchQuery, selectedCategoryId]);

  const sorted = useMemo(() => sortAssets(filtered, sortField, sortDir), [filtered, sortField, sortDir]);

  const numPages = totalPages(sorted.length, pageSize);
  const safePage = Math.min(page, numPages);
  const paged = pageSlice(sorted, safePage, pageSize);

  function handleSortField(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  if (selectedCategoryId === undefined && !searchQuery) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Select a category or search to browse assets.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        {searchQuery || selectedCategoryId ? "No assets match the current filter." : "No assets yet."}
      </div>
    );
  }

  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === numPages || Math.abs(n - safePage) <= 1)
    .reduce<(number | "…")[]>((acc, n, idx, arr) => {
      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sort bar */}
      <div className="shrink-0 px-4 py-1.5 border-b border-slate-100 bg-white flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400 mr-1">Sort:</span>
        {SORT_OPTIONS.map(({ field, label }) => {
          const active = sortField === field;
          return (
            <button
              type="button"
              key={field}
              onClick={() => handleSortField(field)}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                active
                  ? "bg-blue-700 text-white border-blue-700"
                  : "text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {label}
              {active && <span className="ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>}
            </button>
          );
        })}
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
          {paged.map((asset) => {
            const picked = toPickedAsset(asset);
            return (
              <div
                key={asset.id}
                draggable
                onClick={() => onSelect(picked)}
                onMouseEnter={(e) => setHoverPreview({ id: asset.id, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setHoverPreview(null)}
                onDragStart={(e) => {
                  setHoverPreview(null);
                  // Use the loaded thumbnail img as the drag ghost
                  const img = e.currentTarget.querySelector("img") as HTMLImageElement | null;
                  if (img && img.complete && img.naturalWidth > 0) {
                    e.dataTransfer.setDragImage(img, img.offsetWidth / 2, img.offsetHeight / 2);
                  }
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("application/json", JSON.stringify(picked));
                  e.dataTransfer.setData("text/plain", picked.url);
                  e.dataTransfer.setData("text/uri-list", picked.url);
                  onDragStart?.(picked, e);
                }}
                className={`cursor-grab active:cursor-grabbing rounded-xl border overflow-hidden transition-all hover:shadow-md ${
                  selectedAssetId === asset.id
                    ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  <ThumbnailImage
                    id={asset.id}
                    name={asset.name}
                    assetType={asset.asset_type}
                    getThumbnailUrl={getThumbnailUrl}
                  />
                  {!asset.available && (
                    <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      UNAVAILABLE
                    </div>
                  )}
                </div>
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium text-slate-700 truncate mb-1" title={asset.name}>
                    {asset.name}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeInfo(asset.asset_type).cls}`}>
                      {typeInfo(asset.asset_type).label}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatSize(asset.size)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover preview — fixed to viewport, clearly larger than the card */}
      {hoverPreview && (() => {
        const PREVIEW = 320;
        const LABEL_H = 36;
        const TOTAL_H = PREVIEW + LABEL_H;
        const { rect } = hoverPreview;
        const fitsRight = rect.right + 16 + PREVIEW <= window.innerWidth;
        const left = fitsRight ? rect.right + 16 : rect.left - PREVIEW - 16;
        const top = Math.max(8, Math.min(rect.top, window.innerHeight - TOTAL_H - 8));
        const asset = assets.find((a) => a.id === hoverPreview.id);
        const style: CSSProperties = { position: "fixed", left, top, width: PREVIEW, zIndex: 9999, pointerEvents: "none" };
        return (
          <div style={style} className="rounded-xl overflow-hidden shadow-2xl ring-2 ring-blue-500/40 bg-white">
            <div style={{ width: PREVIEW, height: PREVIEW }} className="bg-slate-100">
              <img src={getThumbnailUrl(hoverPreview.id)} className="w-full h-full object-contain" alt="" />
            </div>
            {asset && (
              <div className="px-3 py-2 border-t border-slate-200 bg-white">
                <p className="text-xs font-medium text-slate-700 truncate">{asset.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{typeInfo(asset.asset_type).label} · {formatSize(asset.size)}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Pagination bar */}
      {numPages > 1 && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>per page · {sorted.length} total</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2 py-1 rounded text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Prev
            </button>

            {pageNumbers.map((item, idx) =>
              item === "…" ? (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400">…</span>
              ) : (
                <button
                  type="button"
                  key={item}
                  onClick={() => setPage(item)}
                  className={`min-w-[28px] px-2 py-1 rounded text-xs border transition-colors ${
                    item === safePage
                      ? "bg-blue-700 text-white border-blue-700 font-medium"
                      : "text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              disabled={safePage === numPages}
              className="px-2 py-1 rounded text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
