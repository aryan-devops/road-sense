import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg" | "xl";
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  default: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

export function Loader({ size = "default", text, fullScreen, className, ...props }: LoaderProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground", className)} {...props}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="text-sm font-medium animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center">
      <Loader size="lg" text={text} />
    </div>
  );
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-inherit bg-background/50 backdrop-blur-sm">
      <Loader size="default" text={text} />
    </div>
  );
}
