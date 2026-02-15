

'use client';

import { useState } from 'react';
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
import { useFirestore } from '@/lib/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, Edit } from 'lucide-react';
import type { DocumentData } from 'firebase/firestore';
import { useLanguage } from '@/hooks/use-language';

interface ManagePlaylistsDialogProps {
  allPlaylists: DocumentData[];
  featuredIds: string[];
  channelId: string;
}

export function ManagePlaylistsDialog({ allPlaylists, featuredIds, channelId }: ManagePlaylistsDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>(featuredIds);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const channelRef = doc(db, 'channels', channelId);
      await updateDoc(channelRef, {
        featuredPlaylists: selectedPlaylists,
      });
      toast({ title: 'Success', description: 'Your featured playlists have been updated.' });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update playlists:', error);
      toast({ variant: 'destructive', title: 'Error', description: t.playlists.updateFailed });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckboxChange = (playlistId: string, checked: boolean) => {
    setSelectedPlaylists(prev => 
      checked ? [...prev, playlistId] : prev.filter(id => id !== playlistId)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          {t.channelDetail.managePlaylists}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.playlists.managePlaylistsTitle}</DialogTitle>
          <DialogDescription>
            {t.playlists.managePlaylistsDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {allPlaylists.length > 0 ? (
            allPlaylists.map(playlist => (
              <div key={playlist.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-secondary">
                <Checkbox
                  id={playlist.id}
                  checked={selectedPlaylists.includes(playlist.id)}
                  onCheckedChange={(checked) => handleCheckboxChange(playlist.id, !!checked)}
                />
                <Label htmlFor={playlist.id} className="font-normal cursor-pointer flex-grow">
                  {playlist.title}
                </Label>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center">{t.playlists.noPlaylistsCreated}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t.buttons.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.buttons.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

  