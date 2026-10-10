"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorAlertContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;
  return <div className="alert error">{error}</div>;
}

export function LoginErrorAlert() {
  return (
    <Suspense fallback={null}>
      <ErrorAlertContent />
    </Suspense>
  );
}
