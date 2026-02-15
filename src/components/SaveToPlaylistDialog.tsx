
'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, arrayUnion, arrayRemove, query, collection, where } from 'firebase/firestore';
import { Loader2, Save } from 'lucide-react';
import type { DocumentData } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';

interface SaveToPlaylistDialogProps {
  mediaId: string;
}

export function SaveToPlaylistDialog({ mediaId }: SaveToPlaylistDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);

  const playlistsQuery = user ? query(collection(db, 'playlists'), where('creatorId', '==', user.uid)) : undefined;
  const [playlists, loadingPlaylists] = useCollectionData(playlistsQuery, { idField: 'id' });

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();
  

  const handleSave = (playlistId: string, isChecked: boolean) => {
    if (!user || !mediaId) return;

    startSavingTransition(async () => {
      const playlistRef = doc(db, 'playlists', playlistId);
      const videoItem = {
        contentId: mediaId,
        contentType: 'media',
        order: new Date().getTime(), // simple ordering
      };

      try {
        if (isChecked) {
          await updateDoc(playlistRef, {
            items: arrayUnion(videoItem)
          });
          toast({ title: t.playlists.videoAdded });
        } else {
          await updateDoc(playlistRef, {
            items: arrayRemove(videoItem) // Note: This removes all instances matching the object.
          });
           toast({ title: t.playlists.videoRemoved });
        }
      } catch (error) {
        console.error('Failed to update playlist:', error);
        toast({ variant: 'destructive', title: 'Error', description: t.playlists.updateFailed });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Save className="mr-2 h-4 w-4" />
          {t.buttons.save}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.playlists.saveToPlaylistTitle}</DialogTitle>
          <DialogDescription>
            {t.playlists.saveToPlaylistDescription}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border">
        <div className="space-y-4 py-4 px-2">
          {loadingPlaylists ? (
            <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : playlists && playlists.length > 0 ? (
            playlists.map(playlist => {
               const isVideoInPlaylist = playlist.items?.some((item: any) => item.contentId === mediaId);
               return (
                <div key={playlist.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary">
                    <Checkbox
                    id={playlist.id}
                    checked={isVideoInPlaylist}
                    onCheckedChange={(checked) => handleSave(playlist.id, !!checked)}
                    disabled={isSaving}
                    />
                    <Label htmlFor={playlist.id} className="font-normal cursor-pointer flex-grow">
                    {playlist.title}
                    </Label>
                </div>
               )
            })
          ) : (
             <div className="text-center text-muted-foreground p-4">
                <p>{t.playlists.noPlaylistsCreated}</p>
                <Button variant="link" asChild><Link href="/playlists/create">{t.playlists.createOneNow}</Link></Button>
             </div>
          )}
        </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t.buttons.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

  