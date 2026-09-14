"use client";

import { toast } from "sonner";
import { clsx } from "clsx";
import { RotateCcw, ShieldCheck, Star } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useModelSettings } from "@/lib/hooks/useModelSettings";
import { PROVIDER_MODELS, PROVIDER_LABELS, DEFAULT_MODEL_SETTINGS } from "@/lib/ai";
import type { AIProvider } from "@/lib/ai";

const PROVIDERS: AIProvider[] = ["gemini", "groq"];

function ModelPicker({
  title,
  description,
  icon,
  accent,
  provider,
  model,
  onChangeProvider,
  onChangeModel,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  provider: AIProvider;
  model: string;
  onChangeProvider: (provider: AIProvider) => void;
  onChangeModel: (model: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={clsx(
            "w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
            accent
          )}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>

      {/* Provider */}
      <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
        Provider
      </p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {PROVIDERS.map((p) => (
          <button
            key={p}
            onClick={() => onChangeProvider(p)}
            className={clsx(
              "px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors duration-150 cursor-pointer",
              provider === p
                ? "border-accent bg-accent-subtle text-accent"
                : "border-border bg-surface-sunken text-text-secondary hover:border-text-muted"
            )}
          >
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Model */}
      <p className="text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
        Model
      </p>
      <div className="grid gap-1.5">
        {PROVIDER_MODELS[provider].map((m) => (
          <button
            key={m.id}
            onClick={() => onChangeModel(m.id)}
            className={clsx(
              "px-3 py-2 rounded-lg border text-sm text-left transition-colors duration-150 cursor-pointer",
              model === m.id
                ? "border-accent bg-accent-subtle text-accent font-medium"
                : "border-border bg-surface-sunken text-text-secondary hover:border-text-muted"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, hydrated, update, reset } = useModelSettings();

  function handlePrimaryProvider(provider: AIProvider) {
    const firstModel = PROVIDER_MODELS[provider][0].id;
    update({ primaryProvider: provider, primaryModel: firstModel });
  }

  function handleBackupProvider(provider: AIProvider) {
    const firstModel = PROVIDER_MODELS[provider][0].id;
    update({ backupProvider: provider, backupModel: firstModel });
  }

  function handleReset() {
    reset();
    toast.success("Restored default model settings");
  }

  const sameProviderWarning =
    settings.enableBackup && settings.primaryProvider === settings.backupProvider;

  return (
    <PageShell
      title="Settings"
      description="Choose the default and backup AI model used across every tool"
      icon="Settings"
      color="from-gray-500 to-slate-600"
    >
      {!hydrated ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className="flex flex-col gap-5 max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <ModelPicker
              title="Default model"
              description="Used first for every request"
              icon={<Star className="w-3.5 h-3.5 text-white" />}
              accent="from-violet-500 to-purple-600"
              provider={settings.primaryProvider}
              model={settings.primaryModel}
              onChangeProvider={handlePrimaryProvider}
              onChangeModel={(model) => update({ primaryModel: model })}
            />
            <ModelPicker
              title="Backup model"
              description="Used automatically if the default model fails"
              icon={<ShieldCheck className="w-3.5 h-3.5 text-white" />}
              accent="from-emerald-500 to-teal-600"
              provider={settings.backupProvider}
              model={settings.backupModel}
              onChangeProvider={handleBackupProvider}
              onChangeModel={(model) => update({ backupModel: model })}
            />
          </div>

          {/* Enable backup toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Automatic fallback
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {sameProviderWarning
                  ? "Default and backup use the same provider — fallback will have no effect."
                  : "If the default model errors out, retry the same request with the backup model."}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.enableBackup}
              onClick={() => update({ enableBackup: !settings.enableBackup })}
              className={clsx(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 cursor-pointer",
                settings.enableBackup ? "bg-accent" : "bg-surface-sunken border border-border"
              )}
            >
              <span
                className={clsx(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150",
                  settings.enableBackup ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Saved automatically on this device and applied to every AI tool.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={
                JSON.stringify(settings) === JSON.stringify(DEFAULT_MODEL_SETTINGS)
              }
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to defaults
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
