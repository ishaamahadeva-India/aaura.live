
'use client';

import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth } from '@/lib/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Video } from 'lucide-react';
import Link from 'next/link';
import { CreatePostDialog } from '@/components/CreatePostDialog';

interface CreateContentProps {
  onPostCreated?: () => void;
}

export function CreateContent({ onPostCreated }: CreateContentProps) {
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handlePostCreated = () => {
    if (onPostCreated) {
      // Delay refresh slightly to ensure Firestore has updated
      setTimeout(() => {
        onPostCreated();
      }, 1000);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="shrink-0">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div 
              className="flex-1 text-sm sm:text-base text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-w-0"
              onClick={() => setIsDialogOpen(true)}
            >
              <span className="line-clamp-1 break-words">
                {user.displayName 
                  ? `What's on your mind, ${user.displayName.split(' ')[0]}?`
                  : "What's on your mind?"}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Create Post
            </Button>
            <Button variant="outline" asChild>
              <Link href="/upload">
                <Video className="mr-2 h-4 w-4" />
                Upload Video
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <CreatePostDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onPostCreated={handlePostCreated} />
    </>
  );
}
