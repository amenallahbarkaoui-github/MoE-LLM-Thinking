"use client";

import { useSettingsStore, PROVIDER_MODELS, PROVIDER_LABELS, type ProviderType } from "@/stores/settings-store";
import { Navbar } from "@/components/layout/navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ArrowLeft,
  Monitor,
  Server,
  Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface ProviderStatus {
  name: string;
  models: string[];
  configured: boolean;
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { providerConfig, setProviderConfig } = settings;
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/providers", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setProviderStatuses(data.providers ?? []))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch provider statuses:', err);
        }
      });
    return () => controller.abort();
  }, []);

  const currentProvider = providerConfig.provider;
  const models = PROVIDER_MODELS[currentProvider] ?? [];

  const getStatus = (provider: string): boolean | undefined => {
    // Mock and Ollama are always "available" (no API key needed)
    if (provider === "mock" || provider === "ollama") return true;
    const found = providerStatuses.find(
      (p) => p.name.toLowerCase() === provider.toLowerCase()
    );
    return found?.configured;
  };

  const handleProviderChange = (value: string) => {
    const provider = value as ProviderType;
    const defaultModel = PROVIDER_MODELS[provider]?.[0] ?? "";
    setProviderConfig({ provider, model: defaultModel });
  };

  const allProviders: ProviderType[] = ["openai", "anthropic", "ollama", "glm", "mock"];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI provider, council settings, and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Provider Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                Provider Configuration
              </CardTitle>
              <CardDescription>
                Select your AI provider and model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Provider Status Overview */}
              <div className="flex flex-wrap gap-2">
                {allProviders.map((p) => {
                  const configured = getStatus(p);
                  return (
                    <Badge
                      key={p}
                      variant={configured ? "default" : "secondary"}
                      className="gap-1.5 text-xs font-medium"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          configured
                            ? "bg-emerald-400"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      {PROVIDER_LABELS[p]}
                    </Badge>
                  );
                })}
              </div>

              {/* Provider Selector */}
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={currentProvider}
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allProviders.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROVIDER_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selector */}
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <div className="space-y-2">
                  <Select
                    value={
                      models.includes(providerConfig.model)
                        ? providerConfig.model
                        : "__custom__"
                    }
                    onValueChange={(value) => {
                      if (value !== "__custom__") {
                        setProviderConfig({ model: value });
                      } else {
                        setProviderConfig({ model: "" });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom model ID...</SelectItem>
                    </SelectContent>
                  </Select>
                  {!models.includes(providerConfig.model) && (
                    <Input
                      placeholder="Enter custom model ID..."
                      value={providerConfig.model}
                      onChange={(e) =>
                        setProviderConfig({ model: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>

              {/* Ollama Base URL */}
              {currentProvider === "ollama" && (
                <div className="space-y-2">
                  <Label htmlFor="ollamaBaseUrl">Ollama Base URL</Label>
                  <Input
                    id="ollamaBaseUrl"
                    value={providerConfig.ollamaBaseUrl}
                    onChange={(e) =>
                      setProviderConfig({ ollamaBaseUrl: e.target.value })
                    }
                    placeholder="http://localhost:11434"
                  />
                  <p className="text-xs text-muted-foreground">
                    The URL where your Ollama instance is running.
                  </p>
                </div>
              )}

              {/* Info about API keys */}
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  API keys are configured via server environment variables (
                  <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">
                    .env.local
                  </code>
                  ). Set{" "}
                  <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">
                    OPENAI_API_KEY
                  </code>
                  ,{" "}
                  <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">
                    ANTHROPIC_API_KEY
                  </code>
                  , or{" "}
                  <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">
                    GLM_API_KEY
                  </code>{" "}
                  in your environment to enable each provider.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Council Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Council Settings
              </CardTitle>
              <CardDescription>
                Configure how the agent council operates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Max Agents</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {settings.maxAgents}
                  </span>
                </div>
                <Slider
                  value={[settings.maxAgents]}
                  onValueChange={([v]) => settings.setMaxAgents(v)}
                  min={3}
                  max={70}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Agents per query (3–70). More agents = more perspectives.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Concurrency</Label>
                  <span className="text-sm font-medium tabular-nums">
                    {settings.concurrencyLimit}
                  </span>
                </div>
                <Slider
                  value={[settings.concurrencyLimit]}
                  onValueChange={([v]) => settings.setConcurrencyLimit(v)}
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Simultaneous API requests. Recommended: 3.
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>IACP Protocol</Label>
                  <p className="text-xs text-muted-foreground">
                    Inter-agent communication &amp; discussion
                  </p>
                </div>
                <Switch
                  checked={settings.iacpEnabled}
                  onCheckedChange={settings.setIacpEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Toggle between dark and light theme
                  </p>
                </div>
                <Switch
                  checked={settings.theme === "dark"}
                  onCheckedChange={(checked) =>
                    settings.setTheme(checked ? "dark" : "light")
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
