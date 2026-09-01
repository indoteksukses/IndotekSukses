"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

let activePortalCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let previousHtmlOverflow = "";

function lockDocumentScroll() {
  const body = document.body;
  const html = document.documentElement;

  if (activePortalCount === 0) {
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    previousHtmlOverflow = html.style.overflow;

    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
    const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    body.classList.add("modal-open");
  }

  activePortalCount += 1;

  return () => {
    activePortalCount = Math.max(0, activePortalCount - 1);
    if (activePortalCount > 0) return;

    body.style.overflow = previousBodyOverflow;
    body.style.paddingRight = previousBodyPaddingRight;
    html.style.overflow = previousHtmlOverflow;
    body.classList.remove("modal-open");
  };
}

/**
 * Renders dialogs directly under document.body so fixed overlays are never
 * constrained by sticky headers, filters, transformed cards, table scrollers,
 * or content-visibility containment.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return lockDocumentScroll();
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
