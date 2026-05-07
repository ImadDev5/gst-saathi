"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { t, STATUS_EXPLANATIONS } from "@/lib/tax-terms";

interface TaxTermProps {
  /** The technical tax term to explain */
  term: string;
  /** Optional custom plain-English explanation, falls back to dictionary */
  explanation?: string;
  /** Show as inline help icon next to the label */
  showIcon?: boolean;
  /** Content to render as the trigger (e.g. a label or input wrapper) */
  children?: React.ReactNode;
  /** Only render the translated label text */
  labelOnly?: boolean;
}

/**
 * TaxTerm — renders tax terms in plain English with optional inline help.
 *
 * Usage:
 *   <TaxTerm term="HSN Code" labelOnly />
 *   → "Product code"
 *
 *   <TaxTerm term="HSN Code" showIcon>
 *     <Input ... />
 *   </TaxTerm>
 *   → Input with a (?) icon that shows explanation on hover
 */
export default function TaxTerm({ term, explanation, showIcon, children, labelOnly }: TaxTermProps) {
  const plainLabel = t(term);
  const helpText = explanation || STATUS_EXPLANATIONS[term] || null;

  if (labelOnly) {
    return <>{plainLabel}</>;
  }

  if (!showIcon && !helpText) {
    return <>{children || plainLabel}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1">
        {children || <span>{plainLabel}</span>}
        {showIcon && helpText && (
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-help" />
        )}
      </TooltipTrigger>
      {helpText && (
        <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
          {helpText}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
