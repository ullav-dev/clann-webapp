"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PasswordInput from "@/components/PasswordInput";
import type { AiProvider } from "@/lib/ai-settings";

const PROVIDER_MODELS: Record<AiProvider, { label: string; value: string }[]> = {
  anthropic: [
    { label: "Claude Sonnet 4.6 (recommended)", value: "claude-sonnet-4-6" },
    { label: "Claude Haiku 4.5 (fast)", value: "claude-haiku-4-5-20251001" },
    { label: "Claude Opus 4.7 (most capable)", value: "claude-opus-4-7" },
  ],
  openai: [
    { label: "GPT-4o (recommended)", value: "gpt-4o" },
    { label: "GPT-4o Mini (fast)", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
  ],
  ollama: [],
};

const PROVIDER_KEY_HINTS: Record<AiProvider, string> = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
  ollama: "",
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();

  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [hasKey, setHasKey] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [clearConfirming, setClearConfirming] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    fetch("/api/ai/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setProvider(data.provider ?? "anthropic");
          setModel(data.model ?? "claude-sonnet-4-6");
          setOllamaUrl(data.ollamaUrl ?? "http://localhost:11434");
          setHasKey(data.hasKey ?? false);
        }
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, [user, token]);

  function handleProviderChange(p: AiProvider) {
    setProvider(p);
    const models = PROVIDER_MODELS[p];
    if (models.length > 0) setModel(models[0].value);
    else setModel("llama3.2");
    setApiKey("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    try {
      const body: Record<string, string> = { provider, model };
      if (apiKey) body.apiKey = apiKey;
      if (provider === "ollama") body.ollamaUrl = ollamaUrl;

      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Save failed");
      setHasKey(!!apiKey || hasKey);
      setApiKey("");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  async function handleClear() {
    if (!clearConfirming) {
      setClearConfirming(true);
      return;
    }
    setClearConfirming(false);
    const res = await fetch("/api/ai/settings", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token ?? ""}` },
    });
    if (res.ok) {
      setApiKey("");
      setHasKey(false);
      setProvider("anthropic");
      setModel("claude-sonnet-4-6");
    }
  }

  if (authLoading) return null;

  if (!user) {
    router.replace(`/${locale}/login`);
    return null;
  }

  const presetModels = PROVIDER_MODELS[provider];
  const keyHintUrl = PROVIDER_KEY_HINTS[provider];

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-stone-800 mb-1">{t("title")}</h1>
      <p className="text-stone-500 text-sm mb-8">{t("subtitle")}</p>

      {/* AI Assistant section */}
      <section className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🤖</span>
          <h2 className="text-base font-semibold text-stone-800">{t("aiSection")}</h2>
        </div>
        <p className="text-sm text-stone-500 mb-6">{t("aiDescription")}</p>

        {!settingsLoaded ? (
          <div className="text-sm text-stone-400">{t("loading")}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Provider */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">
                {t("providerLabel")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["anthropic", "openai", "ollama"] as AiProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderChange(p)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      provider === p
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {p === "anthropic" ? "Anthropic" : p === "openai" ? "OpenAI" : "Ollama"}
                    {p === "ollama" && (
                      <span className="block text-xs font-normal text-stone-400 mt-0.5">
                        {t("ollamaLocalBadge")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">
                {t("modelLabel")}
              </label>
              {presetModels.length > 0 ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {presetModels.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama3.2"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              )}
            </div>

            {/* Ollama URL */}
            {provider === "ollama" && (
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  {t("ollamaUrlLabel")}
                </label>
                <input
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-xs text-stone-400 mt-1">{t("ollamaHint")}</p>
              </div>
            )}

            {/* API Key */}
            {provider !== "ollama" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-stone-500">
                    {t("apiKeyLabel")}
                  </label>
                  {hasKey && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      ✓ {t("keyConfigured")}
                    </span>
                  )}
                </div>
                <PasswordInput
                  id="ai-api-key"
                  value={apiKey}
                  onChange={(val) => setApiKey(val)}
                  placeholder={hasKey ? t("apiKeyChangePlaceholder") : "sk-..."}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-stone-400">{t("apiKeyHint")}</p>
                  {keyHintUrl && (
                    <a
                      href={keyHintUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      {t("getApiKey")} →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={handleClear}
                className={`text-sm transition-colors ${
                  clearConfirming
                    ? "text-red-600 font-medium"
                    : "text-stone-400 hover:text-red-500"
                }`}
              >
                {clearConfirming ? t("clearConfirm") : t("clear")}
              </button>
              {clearConfirming && (
                <button
                  type="button"
                  onClick={() => setClearConfirming(false)}
                  className="text-sm text-stone-400 hover:text-stone-600 transition-colors mr-auto ml-3"
                >
                  {t("cancel")}
                </button>
              )}
              <button
                type="submit"
                disabled={saveStatus === "saving"}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  saveStatus === "saved"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : saveStatus === "error"
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60"
                }`}
              >
                {saveStatus === "saving"
                  ? t("saving")
                  : saveStatus === "saved"
                  ? t("saved")
                  : saveStatus === "error"
                  ? t("saveFailed")
                  : t("save")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
