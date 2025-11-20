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
      <ol className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isClickable =
            isCompleted || index === currentStep + 1 || index === currentStep;

          return (
            <li
              key={step.id}
              className="flex items-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-all duration-200",
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary/20 text-primary ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground",
                  isClickable && "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  !isClickable && "cursor-not-allowed opacity-40"
                )}
                aria-label={`Step ${index + 1} of ${steps.length}: ${step.label}`}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={!isClickable}
              >
                {isCompleted ? (
                  <Check className="size-3" />
                ) : (
                  <span aria-hidden="true">{index + 1}</span>
                )}
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 w-8 rounded-full transition-colors duration-200",
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
        <span className="font-medium">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span aria-hidden="true">
          {Math.round(progress)}%
        </span>
      </div>
      <div
        className="relative h-1 w-full overflow-hidden rounded-full bg-muted"
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
      <p className="text-xs font-medium text-foreground" aria-live="polite">
        {currentStepData?.label}
      </p>
    </div>
  );
}

