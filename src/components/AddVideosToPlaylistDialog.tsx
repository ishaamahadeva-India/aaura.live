'use client';

import { useState, useTransition, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage } from '@/lib/firebase/provider';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, arrayUnion, query, collection, where, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Search, Plus, Film, Music, Mic, CheckCircle2, X, Upload, ImageIcon } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface AddVideosToPlaylistDialogProps {
  playlistId: string;
  playlistTitle: string;
  existingVideoIds: string[];
  onVideosAdded?: () => void;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'bhajan':
    case 'audiobook':
      return <Music className="w-4 h-4" />;
    case 'podcast':
    case 'pravachan':
      return <Mic className="w-4 h-4" />;
    default:
      return <Film className="w-4 h-4" />;
  }
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export function AddVideosToPlaylistDialog({
  playlistId,
  playlistTitle,
  existingVideoIds,
  onVideosAdded,
}: AddVideosToPlaylistDialogProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('video');
  const [newDuration, setNewDuration] = useState('');
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newThumbFile, setNewThumbFile] = useState<File | null>(null);

  // Fetch all approved media
  const mediaQuery = useMemo(() => {
    if (!db || !isOpen || activeTab !== 'library') return null;
    let q: any = query(collection(db, 'media'), where('status', '==', 'approved'));
    
    if (filterType !== 'all') {
      q = query(q, where('mediaType', '==', filterType));
    }
    
    try {
      q = query(q, orderBy('uploadDate', 'desc'));
    } catch (error) {
      // If orderBy fails, continue without it
      console.warn('OrderBy failed, continuing without:', error);
    }
    
    return q;
  }, [db, filterType, isOpen, activeTab]);

  const [media, loadingMedia] = useCollectionData(mediaQuery, { idField: 'id' });

  // Filter and search media
  const filteredMedia = useMemo(() => {
    if (!media) return [];
    
    let filtered = [...media];
    
    // Remove already added videos
    filtered = filtered.filter(item => !existingVideoIds.includes(item.id));
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const title = ((item.title_en || item.title || '') as string).toLowerCase();
        const description = ((item.description_en || item.description || '') as string).toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();
        return title.includes(query) || description.includes(query) || tags.includes(query);
      });
    }
    
    return filtered;
  }, [media, searchQuery, existingVideoIds]);

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedVideos.size === filteredMedia.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(filteredMedia.map((item: any) => item.id)));
    }
  };

  const handleAddVideos = () => {
    if (selectedVideos.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No videos selected',
        description: 'Please select at least one video to add.',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const playlistRef = doc(db, 'playlists', playlistId);
        const videoItems = Array.from(selectedVideos).map((videoId, index) => {
          const video = filteredMedia.find((item: any) => item.id === videoId);
          return {
            contentId: videoId,
            contentType: 'media',
            order: (existingVideoIds.length + index) * 1000 + Date.now(),
          };
        });

        await updateDoc(playlistRef, {
          items: arrayUnion(...videoItems),
        });

        toast({
          title: 'Videos added!',
          description: `Successfully added ${selectedVideos.size} video(s) to "${playlistTitle}".`,
        });

        setSelectedVideos(new Set());
        setIsOpen(false);
        setSearchQuery('');
        onVideosAdded?.();
      } catch (error: any) {
        console.error('Failed to add videos:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to add videos to playlist.',
        });
      }
    });
  };

  const resetNewMediaForm = useCallback(() => {
    setNewTitle('');
    setNewDescription('');
    setNewType('video');
    setNewDuration('');
    setNewMediaFile(null);
    setNewThumbFile(null);
  }, []);

  const handleClose = () => {
    setSelectedVideos(new Set());
    setSearchQuery('');
    setFilterType('all');
    setIsOpen(false);
    setActiveTab('library');
    resetNewMediaForm();
  };

  const handleUploadNewContent = () => {
    if (!db || !storage) {
      toast({
        variant: 'destructive',
        title: 'Not ready',
        description: 'Storage is not available right now. Please try again.',
      });
      return;
    }

    if (!newTitle.trim() || !newMediaFile) {
      toast({
        variant: 'destructive',
        title: 'Missing details',
        description: 'Title and media file are required.',
      });
      return;
    }

    startSavingTransition(async () => {
      try {
        const mediaRef = doc(collection(db, 'media'));
        const mediaStorageRef = ref(storage, `media/${mediaRef.id}/${newMediaFile.name}`);
        await uploadBytes(mediaStorageRef, newMediaFile);
        // getDownloadURL already returns correct URL from Firebase SDK
        const mediaUrl = await getDownloadURL(mediaStorageRef);

        let thumbnailUrl: string | null = null;
        if (newThumbFile) {
          const thumbRef = ref(storage, `media/${mediaRef.id}/thumb-${newThumbFile.name}`);
          await uploadBytes(thumbRef, newThumbFile);
          thumbnailUrl = await getDownloadURL(thumbRef);
        }

        const mediaDoc = {
          title_en: newTitle.trim(),
          description_en: newDescription.trim(),
          mediaType: newType,
          mediaUrl,
          thumbnailUrl,
          duration: newDuration ? Number(newDuration) : null,
          status: 'approved',
          uploadDate: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        await setDoc(mediaRef, mediaDoc);

        const playlistRef = doc(db, 'playlists', playlistId);
        const newItem = {
          contentId: mediaRef.id,
          contentType: 'media',
          order: (existingVideoIds.length + 1) * 1000 + Date.now(),
        };

        await updateDoc(playlistRef, {
          items: arrayUnion(newItem),
        });

        toast({
          title: 'Content uploaded',
          description: `"${newTitle}" has been added to "${playlistTitle}".`,
        });

        resetNewMediaForm();
        onVideosAdded?.();
        setIsOpen(false);
      } catch (error: any) {
        console.error('Failed to upload new content:', error);
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: error.message || 'Could not upload content. Please try again.',
        });
      }
    });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Videos
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Videos to Playlist</DialogTitle>
            <DialogDescription>
              Search and select videos to add to &quot;{playlistTitle}&quot;
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'library' | 'upload')} className="flex flex-1 flex-col">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="library">Existing Library</TabsTrigger>
              <TabsTrigger value="upload">Upload New Content</TabsTrigger>
            </TabsList>
            <TabsContent value="library" className="mt-4 flex flex-1 flex-col space-y-4">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search videos by title, description, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="video">Videos</SelectItem>
                      <SelectItem value="short">Shorts</SelectItem>
                      <SelectItem value="bhajan">Bhajans</SelectItem>
                      <SelectItem value="podcast">Podcasts</SelectItem>
                      <SelectItem value="pravachan">Pravachans</SelectItem>
                      <SelectItem value="audiobook">Audiobooks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {filteredMedia.length} video{filteredMedia.length !== 1 ? 's' : ''} available
                    </span>
                    {selectedVideos.size > 0 && (
                      <Badge variant="secondary" className="gap-2">
                        <CheckCircle2 className="h-3 w-3" />
                        {selectedVideos.size} selected
                      </Badge>
                    )}
                  </div>
                  {filteredMedia.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8"
                    >
                      {selectedVideos.size === filteredMedia.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 border rounded-lg">
                {loadingMedia ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredMedia.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {filteredMedia.map((item: any) => {
                      const isSelected = selectedVideos.has(item.id);
                      const title = item.title_en || item.title || 'Untitled';
                      const description = item.description_en || item.description || '';
                      const duration = item.duration || 0;

                      return (
                        <Card
                          key={item.id}
                          className={cn(
                            "overflow-hidden border-2 transition-all cursor-pointer hover:border-primary/50",
                            isSelected && "border-primary bg-primary/5"
                          )}
                          onClick={() => handleToggleVideo(item.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <div className="flex items-start pt-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleVideo(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-secondary shrink-0">
                                <Image
                                  src={item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/320/180`}
                                  alt={title}
                                  fill
                                  className="object-cover"
                                />
                                {duration > 0 && (
                                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                                    {formatDuration(duration)}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                                    {title}
                                  </h4>
                                  {isSelected && (
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                  )}
                                </div>
                                {description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                    {description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    {getIconForType(item.mediaType)}
                                    <span className="capitalize">{item.mediaType}</span>
                                  </Badge>
                                  {item.views && (
                                    <span className="text-xs text-muted-foreground">
                                      {item.views.toLocaleString()} views
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                    <Film className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {searchQuery || filterType !== 'all'
                        ? 'No videos match your search criteria.'
                        : 'All available videos are already in this playlist.'}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="mt-2"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddVideos}
                  disabled={isSaving || selectedVideos.size === 0}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add {selectedVideos.size > 0 ? `${selectedVideos.size} ` : ''}Video{selectedVideos.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="upload" className="mt-4 flex flex-1 flex-col gap-6">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-title">Title *</Label>
                    <Input
                      id="new-title"
                      placeholder="E.g. Hanuman Chalisa"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="bhajan">Bhajan</SelectItem>
                        <SelectItem value="podcast">Podcast</SelectItem>
                        <SelectItem value="pravachan">Pravachan</SelectItem>
                        <SelectItem value="audiobook">Audiobook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Input
                    id="new-description"
                    placeholder="Short description for devotees"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-media-file">Upload Media *</Label>
                    <Button asChild variant="outline" className="w-full justify-start gap-2">
                      <label htmlFor="new-media-file" className="cursor-pointer">
                        <Upload className="h-4 w-4" />
                        {newMediaFile ? newMediaFile.name : 'Select video or audio'}
                      </label>
                    </Button>
                    <Input
                      id="new-media-file"
                      type="file"
                      accept="video/*,audio/*"
                      className="hidden"
                      onChange={(e) => setNewMediaFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-thumb-file">Thumbnail</Label>
                    <Button asChild variant="outline" className="w-full justify-start gap-2">
                      <label htmlFor="new-thumb-file" className="cursor-pointer">
                        <ImageIcon className="h-4 w-4" />
                        {newThumbFile ? newThumbFile.name : 'Select image'}
                      </label>
                    </Button>
                    <Input
                      id="new-thumb-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setNewThumbFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-duration">Duration (seconds)</Label>
                    <Input
                      id="new-duration"
                      type="number"
                      min="0"
                      placeholder="e.g. 420"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleUploadNewContent} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload & Add
                    </>
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

