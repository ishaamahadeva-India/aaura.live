'use client';

import React, { useEffect, useState } from "react";

type FlowerProps = {
  x: number;
  y: number;
  size?: number;
  duration?: number;
  onComplete?: () => void;
};

export default function FloatingFlower({ x, y, size = 30, duration = 1500, onComplete }: FlowerProps) {
  const [style, setStyle] = useState({
    left: x,
    top: y,
    opacity: 1,
    transform: `translate(0, 0) scale(1)`,
  });

  useEffect(() => {
    const id = setTimeout(() => {
      const dx = (Math.random() - 0.5) * 60; // random horizontal drift
      const dy = -100 - Math.random() * 50; // float upward
      setStyle({
        left: x + dx,
        top: y + dy,
        opacity: 0,
        transform: `scale(${Math.random() * 0.5 + 0.8})`,
        transition: `all ${duration}ms ease-out`,
      });

      setTimeout(() => {
        onComplete?.();
      }, duration);
    }, 50);

    return () => clearTimeout(id);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: style.left,
        top: style.top,
        opacity: style.opacity,
        transform: style.transform,
        pointerEvents: "none",
        fontSize: size,
      }}
    >
      🌸
    </div>
  );
}
