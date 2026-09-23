import { Badge } from "@/components/ui/Badge";
import type { GenerateResult } from "@/lib/ai";

interface ProviderBadgeProps {
  provider: GenerateResult["provider"];
  model: string;
}

const PROVIDER_LABEL: Record<GenerateResult["provider"], string> = {
  gemini: "Gemini",
  groq: "Groq",
};

const PROVIDER_VARIANT: Record<GenerateResult["provider"], "info" | "default"> =
  {
    gemini: "info",
    groq: "default",
  };

export function ProviderBadge({ provider, model }: ProviderBadgeProps) {
  return (
    <Badge variant={PROVIDER_VARIANT[provider]} title={model}>
      {PROVIDER_LABEL[provider]} · {model}
    </Badge>
  );
}
