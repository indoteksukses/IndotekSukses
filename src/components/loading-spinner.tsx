import { LoaderCircle } from "lucide-react";

export function LoadingSpinner({ size = 16, label = "Memuat" }: { size?: number; label?: string }) {
  return <LoaderCircle className="loading-spinner" size={size} aria-label={label} />;
}
