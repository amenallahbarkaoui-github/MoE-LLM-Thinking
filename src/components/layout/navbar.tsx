"use client";

import Link from "next/link";
import { Brain, Settings, Moon, Sun, Trash2, Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";

interface NavbarProps {
  onClear?: () => void;
  children?: React.ReactNode;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
}

export function Navbar({ onClear, children, highContrast, onToggleHighContrast }: NavbarProps) {
  const { theme, toggleTheme } = useSettingsStore();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/chat" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              Deep Thinking AI
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none">
              Multi-Agent Council
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {children}
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              title="Clear chat"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {onToggleHighContrast && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleHighContrast}
              title="Toggle high contrast"
              className={`text-muted-foreground ${
                highContrast ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <Contrast className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title="Toggle theme"
            className="text-muted-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              title="Settings"
              className="text-muted-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
