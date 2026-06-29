"use client";

// Resizable, draggable modal wrapping the DAM Picker.
// - Drag the title bar to reposition.
// - Drag the bottom-right resize handle to resize.
// - Press Escape or click the backdrop to close.

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { DamPicker } from "@ullav/dam-picker";
import type { PickedAsset } from "@ullav/dam-picker";
import type { Asset } from "@ullav/dam-picker";

interface Props {
  token: string;
  username?: string;
  filter?: (asset: Asset) => boolean;
  onSelect: (asset: PickedAsset) => void;
  onClose: () => void;
}

const MIN_W = 400;
const MIN_H = 300;

export default function DamPickerModal({ token, username, filter, onSelect, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  const [size, setSize] = useState({ w: 900, h: 600 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const centred = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Centre on first paint.
  useEffect(() => {
    if (!mounted || centred.current) return;
    centred.current = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.round(Math.min(vw * 0.82, 1200));
    const h = Math.round(Math.min(vh * 0.78, 800));
    setSize({ w, h });
    setPos({ x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2) });
  }, [mounted]);

  // ── Drag (title bar) ─────────────────────────────────────────────────────────
  const dragState = useRef<{ startX: number; startY: number; startPx: number; startPy: number } | null>(null);

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, startPx: pos.x, startPy: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragState.current) return;
      setPos({
        x: dragState.current.startPx + ev.clientX - dragState.current.startX,
        y: dragState.current.startPy + ev.clientY - dragState.current.startY,
      });
    }
    function onUp() {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  // ── Resize (bottom-right handle) ─────────────────────────────────────────────
  const resizeState = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };

    function onMove(ev: MouseEvent) {
      if (!resizeState.current) return;
      const maxW = window.innerWidth * 0.98;
      const maxH = window.innerHeight * 0.96;
      setSize({
        w: Math.min(maxW, Math.max(MIN_W, resizeState.current.startW + ev.clientX - resizeState.current.startX)),
        h: Math.min(maxH, Math.max(MIN_H, resizeState.current.startH + ev.clientY - resizeState.current.startY)),
      });
    }
    function onUp() {
      resizeState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size]);

  // ── Keyboard close ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="absolute pointer-events-auto flex flex-col rounded-xl shadow-2xl overflow-hidden border border-stone-200 bg-white"
        style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      >
        {/* Title bar — drag handle */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-200 cursor-move select-none"
          onMouseDown={onTitleMouseDown}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 5.5 2-3.5 3 6z" clipRule="evenodd" />
            </svg>
            Media Library
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Picker content */}
        <div className="flex-1 overflow-hidden">
          <DamPicker
            apiBase="/api/dam"
            token={token}
            username={username}
            filter={filter}
            onSelect={(asset) => {
              onSelect(asset);
              onClose();
            }}
          />
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5"
          onMouseDown={onResizeMouseDown}
        >
          <svg className="w-3 h-3 text-stone-400" viewBox="0 0 6 6" fill="currentColor">
            <path d="M6 0L0 6h6V0z" opacity=".3" />
            <path d="M6 3L3 6h3V3z" />
          </svg>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
