"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Step {
  id: string;
  label: string;
  order: number;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepIndex: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileStepIndicator steps={steps} currentStep={currentStep} />;
  }

  return (
    <DesktopStepIndicator
      steps={steps}
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepClick={onStepClick}
    />
  );
}

function DesktopStepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Form progress" className="w-full">
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isClickable =
            isCompleted || index === currentStep + 1 || index === currentStep;

          return (
            <li
              key={step.id}
              className="flex flex-1 items-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="flex flex-1 flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  disabled={!isClickable}
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full border-2 text-base font-semibold transition-all duration-300 motion-reduce:transition-none",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-muted text-muted-foreground",
                    isClickable && "hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
                    !isClickable && "cursor-not-allowed opacity-50"
                  )}
                  aria-label={`Step ${index + 1} of ${steps.length}: ${step.label}`}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={!isClickable}
                >
                  {isCompleted ? (
                    <Check className="size-5" />
                  ) : (
                    <span aria-hidden="true">{index + 1}</span>
                  )}
                </button>
                <span
                  className={cn(
                    "mt-2 max-w-[160px] text-sm font-medium",
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  )}
                >
                  {step.label}
                  {isCurrent && (
                    <span className="sr-only">{` (current step, ${Math.round(((index + 1) / steps.length) * 100)}% complete)`}</span>
                  )}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-4 hidden h-0.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none sm:block",
                    isCompleted || index < currentStep
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function MobileStepIndicator({
  steps,
  currentStep,
}: {
  steps: Step[];
  currentStep: number;
}) {
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm" aria-live="polite">
        <span className="font-medium text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-muted-foreground/80" aria-hidden="true">
          {Math.round(progress)}%
        </span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form completion progress"
      >
        <div
          className="h-full bg-primary transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm font-medium" aria-live="polite">
        {currentStepData?.label}
      </p>
    </div>
  );
}

