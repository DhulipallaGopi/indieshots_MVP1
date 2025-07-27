import * as React from "react";
import { cn } from "@/lib/utils";

export interface StepProps {
  title: string;
  step: number;
  current: number;
  onClick?: () => void;
  disabled?: boolean;
}

const Step = ({ title, step, current, onClick, disabled = false }: StepProps) => {
  const isActive = step === current;
  const isCompleted = step < current;
  const isPending = step > current;

  return (
    <div className="progress-step relative z-10">
      <div 
        className={cn(
          "flex flex-col items-center cursor-pointer transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && onClick?.()}
      >
        <div 
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium transition-colors",
            isActive && "bg-primary",
            isCompleted && "bg-primary/80",
            isPending && "bg-muted text-muted-foreground"
          )}
        >
          {step}
        </div>
        <span className={cn(
          "text-xs mt-1 font-medium",
          isActive && "text-foreground",
          isCompleted && "text-foreground",
          isPending && "text-muted-foreground"
        )}>
          {title}
        </span>
      </div>
    </div>
  );
};

export interface ProgressStepsProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: { title: string; disabled?: boolean }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function ProgressSteps({
  className,
  steps,
  currentStep,
  onStepClick,
  ...props
}: ProgressStepsProps) {
  return (
    <div 
      className={cn("flex justify-between items-center relative", className)} 
      {...props}
    >
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2 z-0"></div>
      
      {steps.map((step, index) => (
        <Step
          key={index}
          title={step.title}
          step={index + 1}
          current={currentStep}
          onClick={() => onStepClick?.(index + 1)}
          disabled={step.disabled}
        />
      ))}
    </div>
  );
}
