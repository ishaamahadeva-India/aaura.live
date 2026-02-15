

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where, type DocumentData, limit } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListMusic, Loader2, Search } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/use-language';

const PlaylistGrid = ({ playlists }: { playlists: DocumentData[] }) => {
  const { t } = useLanguage();
  if (playlists.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <ListMusic className="mx-auto h-24 w-24 text-muted-foreground/50" />
        <h2 className="mt-6 text-2xl font-semibold text-foreground">{t.playlists.noPlaylists}</h2>
        <p className="mt-2 text-muted-foreground">
          {t.playlists.noPlaylistsDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {playlists.map((playlist) => (
        <Link href={`/playlists/${playlist.id}`} key={playlist.id} className="group">
          <Card className="overflow-hidden border-primary/20 hover:border-primary/50 transition-colors duration-300 h-full flex flex-col">
            <div className="relative aspect-video bg-secondary">
              <Image src={`https://picsum.photos/seed/${playlist.id}/600/400`} alt={playlist.title} layout="fill" className="object-cover" />
            </div>
            <CardHeader>
              <CardTitle className="text-md font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary">
                {playlist.title}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {playlist.description || `${playlist.items?.length || 0} items`}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export function PlaylistClientPage({ initialPublicPlaylists }: { initialPublicPlaylists: DocumentData[] }) {
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { t } = useLanguage();
  
  const publicPlaylistsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'playlists'), limit(100));
  }, [db]);

  const myPlaylistsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'playlists'), where('creatorId', '==', user.uid));
  }, [db, user]);

  const [publicPlaylistsSnap, loadingPublic] = useCollectionData(publicPlaylistsQuery, { idField: 'id' });
  const [myPlaylistsSnap, loadingMy] = useCollectionData(myPlaylistsQuery, { idField: 'id' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('public');

  const publicPlaylists = useMemo(() => {
    const serverPlaylists = initialPublicPlaylists.filter(p => p.id);
    if (!publicPlaylistsSnap) return serverPlaylists;

    const combined = [...serverPlaylists, ...publicPlaylistsSnap.filter(p => p.id)];
    return Array.from(new Map(combined.map(item => [item.id, item])).values());
  }, [initialPublicPlaylists, publicPlaylistsSnap]);

  const myPlaylists = useMemo(() => {
    return myPlaylistsSnap?.filter(p => p.id) || [];
  }, [myPlaylistsSnap]);

  const filteredPlaylists = useMemo(() => {
    let itemsToFilter = activeTab === 'my-playlists' ? myPlaylists : publicPlaylists;

    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      itemsToFilter = itemsToFilter.filter(playlist =>
        playlist.title?.toLowerCase().includes(lowercasedQuery)
      );
    }
    return itemsToFilter.filter(p => p.id); // Ensure items have an ID before rendering
  }, [searchQuery, activeTab, myPlaylists, publicPlaylists]);

  const displayLoading =
    (activeTab === 'public' && loadingPublic && initialPublicPlaylists.length === 0) ||
    (activeTab === 'my-playlists' && loadingMy);

  return (
    <>
      <div className="mb-8 max-w-xl mx-auto">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t.playlists.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
          <TabsTrigger value="public">{t.playlists.publicPlaylists}</TabsTrigger>
          <TabsTrigger value="my-playlists" disabled={!user}>{t.playlists.myPlaylists}</TabsTrigger>
        </TabsList>
        <TabsContent value="public">
          {displayLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : (
            <PlaylistGrid playlists={filteredPlaylists} />
          )}
        </TabsContent>
        <TabsContent value="my-playlists">
          {displayLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
          ) : (
            <PlaylistGrid playlists={filteredPlaylists} />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

  
