'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FlowerIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLiked?: boolean;
  animated?: boolean;
}

export function FlowerIcon({ 
  className, 
  size = 'md',
  isLiked = false,
  animated = false
}: FlowerIconProps) {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl md:text-2xl',
    lg: 'text-3xl md:text-4xl',
    xl: 'text-5xl md:text-6xl',
  };

  const flowerEmoji = '🌸'; // Using the same flower from virtual pooja

  if (animated) {
    return (
      <motion.span
        className={cn(sizeClasses[size], className)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: [0, 1.3, 1], rotate: [180, -180, 0] }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {flowerEmoji}
      </motion.span>
    );
  }

  return (
    <span 
      className={cn(
        sizeClasses[size],
        isLiked && 'filter drop-shadow-md',
        className
      )}
    >
      {flowerEmoji}
    </span>
  );
}

