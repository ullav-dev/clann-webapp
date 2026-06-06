"use client";

import { createContext, useContext, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface DialogState {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "confirm" | "alert" | "destructive";
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (message: string, options?: Omit<DialogState, "message" | "resolve">) => Promise<boolean>;
  alert: (message: string, options?: Pick<DialogState, "title" | "confirmLabel">) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const t = useTranslations("common");

  const confirm = useCallback(
    (message: string, options?: Omit<DialogState, "message" | "resolve">) => {
      return new Promise<boolean>((resolve) => {
        setDialog({ message, resolve, ...options });
      });
    },
    []
  );

  const alert = useCallback(
    (message: string, options?: Pick<DialogState, "title" | "confirmLabel">) => {
      return new Promise<void>((resolve) => {
        setDialog({
          message,
          variant: "alert",
          resolve: () => resolve(),
          ...options,
        });
      });
    },
    []
  );

  function handleConfirm() {
    dialog?.resolve(true);
    setDialog(null);
  }

  function handleCancel() {
    dialog?.resolve(false);
    setDialog(null);
  }

  const isDestructive = dialog?.variant === "destructive";
  const isAlert = dialog?.variant === "alert";

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={handleCancel}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {dialog.title && (
              <div className="px-6 pt-5 pb-0">
                <h2 className="font-semibold text-stone-800">{dialog.title}</h2>
              </div>
            )}
            <div className={`px-6 ${dialog.title ? "pt-3 pb-6" : "py-6"}`}>
              <p className="text-sm text-stone-600">{dialog.message}</p>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              {!isAlert && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  {dialog.cancelLabel ?? t("cancel")}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDestructive
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {dialog.confirmLabel ?? (isAlert ? t("ok") : t("confirm"))}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
