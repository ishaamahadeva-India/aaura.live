'use client';
import { useState, useEffect } from "react";

export function NightModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  return (
    <button
      onClick={toggleDark}
      className="fixed top-4 right-4 z-50 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:scale-105 transition-transform"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
