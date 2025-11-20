"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FieldWrapperProps {
  label: string;
  fieldKey: string;
  editable: boolean;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  fieldKey,
  editable,
  required,
  helpText,
  children,
  className,
}: FieldWrapperProps) {
  const helpTextId = helpText ? `${fieldKey}-help` : undefined;
  const errorId = `${fieldKey}-error`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Label
          htmlFor={fieldKey}
          className={cn(!editable && "text-muted-foreground")}
        >
          {label}
          {required && (
            <span className="ml-1 text-destructive" aria-label="required">
              *
            </span>
          )}
        </Label>
        {!editable && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger aria-label="Field is read-only">
                <Info className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>
                <p>This field was not requested for changes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div
        className={cn(
          "relative",
          editable && "ring-2 ring-primary/20 rounded-md p-1",
          !editable && "opacity-60"
        )}
        aria-describedby={helpTextId}
      >
        {children}
      </div>
      {helpText && (
        <p id={helpTextId} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
}

