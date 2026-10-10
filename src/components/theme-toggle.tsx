"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      try {
        localStorage.setItem("theme", "light");
      } catch {}
    }

    // Dispatch custom event for any listening components
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: nextTheme } }));
  };

  return (
    <button
      type="button"
      className={`icon-button theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
    >
      {mounted && theme === "dark" ? (
        <Sun size={19} className="theme-icon sun-icon" />
      ) : (
        <Moon size={19} className="theme-icon moon-icon" />
      )}
    </button>
  );
}
