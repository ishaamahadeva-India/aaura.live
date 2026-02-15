'use client';

import React, { useState, useEffect } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface CastOverlayProps {
  isCasting: boolean;
  onClose: () => void;
  deviceName?: string;
  videoTitle?: string;
}

export function CastOverlay({ isCasting, onClose, deviceName, videoTitle }: CastOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Reset state when casting stops
  useEffect(() => {
    if (!isCasting) {
      setIsMinimized(false);
      setIsMaximized(false);
    }
  }, [isCasting]);

  if (!isCasting) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed z-50 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl transition-all duration-300 ${
          isMinimized 
            ? 'bottom-4 right-4 w-64 h-20' 
            : isMaximized
            ? 'top-4 left-4 right-4 bottom-4 w-auto h-auto'
            : 'top-4 right-4 w-80 h-48'
        }`}
      >
        {/* Header with controls */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {videoTitle || 'Casting'}
              </p>
              {deviceName && (
                <p className="text-xs text-white/70 truncate">
                  {deviceName}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Minimize button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => {
                setIsMinimized(!isMinimized);
                setIsMaximized(false);
              }}
              title={isMinimized ? 'Restore' : 'Minimize'}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            
            {/* Maximize button */}
            {!isMinimized && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => {
                  setIsMaximized(!isMaximized);
                }}
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-red-500/20 hover:text-red-400"
              onClick={onClose}
              title="Stop casting"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content area - only show when not minimized */}
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Casting to device</span>
              </div>
              
              {isMaximized && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-white/60 mb-2">Cast Controls</p>
                  <p className="text-sm text-white/80">
                    Video is playing on your cast device. Use your device remote or the cast button to control playback.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Minimized view */}
        {isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between px-3 h-full"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-xs text-white truncate">
                {videoTitle || 'Casting'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => setIsMinimized(false)}
              title="Restore"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

