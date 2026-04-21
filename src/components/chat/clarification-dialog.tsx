"use client";

import { motion } from "framer-motion";
import { HelpCircle, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClarificationDialogProps {
  suggestions: string[];
  reasons: string[];
  complexity: string;
  onSelectSuggestion: (suggestion: string) => void;
  onDismiss: () => void;
}

export function ClarificationDialog({
  suggestions,
  reasons,
  complexity,
  onSelectSuggestion,
  onDismiss,
}: ClarificationDialogProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-3xl mx-auto"
    >
      <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10 p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="mt-0.5 h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Could you be more specific?
            </p>
            {complexity && (
              <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">
                {complexity} complexity
              </span>
            )}
          </div>
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <div className="ml-10 mb-3">
            {reasons.map((reason, i) => (
              <p
                key={i}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                {reason}
              </p>
            ))}
          </div>
        )}

        {/* Suggestion buttons */}
        {suggestions.length > 0 && (
          <div className="ml-10 space-y-1.5 mb-3">
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => onSelectSuggestion(suggestion)}
                className="w-full text-left group flex items-center gap-2.5 px-3 py-2 rounded-md border bg-background hover:bg-accent hover:border-amber-500/30 transition-colors"
              >
                <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="text-sm text-foreground flex-1 leading-snug">
                  {suggestion}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
              </motion.button>
            ))}
          </div>
        )}

        {/* Dismiss action */}
        <div className="ml-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Use original query
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
