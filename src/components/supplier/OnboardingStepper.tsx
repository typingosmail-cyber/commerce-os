import { CheckCircle2 } from "lucide-react";

interface Props {
  currentStep: number;
  steps: { label: string; description: string }[];
}

export function OnboardingStepper({ currentStep, steps }: Props) {
  return (
    <div className="flex items-center gap-2 w-full">
      {steps.map((step, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                  isComplete
                    ? "bg-success text-success-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden md:block">
                <p className={`text-sm font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-3 rounded ${isComplete ? "bg-success" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
