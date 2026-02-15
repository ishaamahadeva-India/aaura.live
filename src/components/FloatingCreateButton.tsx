'use client';

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth } from '@/lib/firebase/provider';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Video } from 'lucide-react';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { hapticFeedback } from '@/utils/haptic-feedback';

interface FloatingCreateButtonProps {
  onPostCreated?: () => void;
}

export function FloatingCreateButton({ onPostCreated }: FloatingCreateButtonProps) {
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handlePostCreated = () => {
    setIsSheetOpen(false);
    if (onPostCreated) {
      setTimeout(() => {
        onPostCreated();
      }, 1000);
    }
  };

  return (
    <>
      {/* Floating Action Button - Mobile only - positioned above bottom nav and compact toggle */}
      <div className="fixed bottom-32 right-4 z-50 md:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
              onClick={() => hapticFeedback('medium')}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Create Content</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4 mt-6 pb-6">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 shadow-sm"
                onClick={() => {
                  hapticFeedback('light');
                  setIsDialogOpen(true);
                  setIsSheetOpen(false);
                }}
              >
                <MessageSquare className="h-6 w-6" />
                <span>Create Post</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 shadow-sm"
                asChild
              >
                <Link href="/upload" onClick={() => {
                  hapticFeedback('light');
                  setIsSheetOpen(false);
                }}>
                  <Video className="h-6 w-6" />
                  <span>Upload Video</span>
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <CreatePostDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onPostCreated={handlePostCreated}
      />
    </>
  );
}

