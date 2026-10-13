"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Keyboard, ScanLine, X } from "lucide-react";

type ScannerControls = { stop: () => void };

export function BarcodeScanner({
  open,
  onClose,
  onDetected,
  title = "Scan barcode",
  description = "Kamera membaca barcode 1D/2D. Scanner USB atau Bluetooth juga dapat digunakan.",
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  title?: string;
  description?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const [status, setStatus] = useState("Menyiapkan kamera...");
  const [manual, setManual] = useState("");

  const stopResources = useCallback(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      videoRef.current.srcObject = null;
    }
  }, []);

  const finish = useCallback((value: string) => {
    const code = value.trim();
    if (!code) return;
    stopResources();
    onDetected(code);
    onClose();
  }, [onClose, onDetected, stopResources]);

  // Lock scroll while scanner modal is open
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const waitForVideoElement = async (maxWaitMs = 3000): Promise<HTMLVideoElement | null> => {
      const start = Date.now();
      while (!videoRef.current && Date.now() - start < maxWaitMs) {
        if (cancelled) return null;
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      return videoRef.current;
    };

    const startNativeDetector = async () => {
      const Detector = (window as any).BarcodeDetector;
      if (!Detector) return false;
      const videoEl = await waitForVideoElement();
      if (!videoEl || cancelled) return false;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return true; }
      streamRef.current = stream;
      videoEl.srcObject = stream;
      try { await videoEl.play(); } catch {}

      const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code", "data_matrix"] });
      setStatus("Arahkan barcode ke kotak pemindai.");
      let busy = false;
      const scan = async () => {
        if (cancelled) return;
        if (!busy && videoRef.current && videoRef.current.readyState >= 2) {
          busy = true;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = String(codes?.[0]?.rawValue ?? "");
            if (value) { cancelled = true; finish(value); return; }
          } catch { /* lanjutkan pemindaian */ }
          finally { busy = false; }
        }
        frameRef.current = requestAnimationFrame(scan);
      };
      scan();
      return true;
    };

    const startZxingFallback = async () => {
      const videoEl = await waitForVideoElement();
      if (!videoEl || cancelled) return;

      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (cancelled) return;

      const reader = new BrowserMultiFormatReader();
      setStatus("Arahkan barcode ke kotak pemindai.");
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        videoEl,
        (result) => {
          const value = result?.getText?.();
          if (value && !cancelled) { cancelled = true; finish(value); }
        },
      );
      if (cancelled) controls.stop(); else controlsRef.current = controls;
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser tidak mendukung akses kamera");
        const nativeStarted = await startNativeDetector();
        if (!nativeStarted) await startZxingFallback();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kamera tidak dapat dibuka";
        setStatus(`${message}. Pastikan website memakai HTTPS, izinkan kamera, atau gunakan scanner USB/Bluetooth.`);
      }
    };

    setStatus("Menyiapkan kamera...");
    setManual("");
    start();
    return () => { cancelled = true; stopResources(); };
  }, [finish, open, stopResources]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-backdrop scanner-backdrop">
      <div className="modal-card scanner-modal">
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup pemindai barcode">
            <X size={20}/>
          </button>
        </div>
        <div className="scanner-view">
          <video ref={videoRef} playsInline muted autoPlay />
          <div className="scanner-frame">
            <ScanLine size={36}/>
          </div>
        </div>
        <div className="scanner-status">
          <Camera size={17}/>
          <span>{status}</span>
        </div>
        <form className="scanner-manual" onSubmit={(event) => { event.preventDefault(); finish(manual); }}>
          <Keyboard size={17}/>
          <input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Atau ketik / scan dengan alat eksternal"/>
          <button type="submit" className="button primary">Gunakan</button>
        </form>
      </div>
    </div>,
    document.body
  );
}
