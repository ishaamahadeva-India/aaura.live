
'use client';

import { Button } from '@/components/ui/button';
import { ListMusic, PlusCircle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { PlaylistClientPage } from './PlaylistClientPage';
import type { DocumentData } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function PlaylistsPage() {
  const auth = useAuth();
  const [user] = useAuthState(auth);

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
        <div className="text-left mb-4 sm:mb-0">
          <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
            <ListMusic className="h-10 w-10" />
            Spiritual Playlists
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Create, discover, and enjoy curated collections of mantras, stories, and music.
          </p>
        </div>
        {user ? (
          <Button asChild>
            <Link href="/playlists/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Playlist
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in to Create
            </Link>
          </Button>
        )}
      </div>

      <PlaylistClientPage initialPublicPlaylists={[]} />
    </main>
  );
}
