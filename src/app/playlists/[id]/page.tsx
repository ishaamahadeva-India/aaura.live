'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useDocumentData, useCollectionData } from 'react-firebase-hooks/firestore';
import { doc, collection, query, where, DocumentData, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import { Loader2, Music, PlayCircle, ListMusic, Search, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Filter, X, Clock, Eye, Heart, Share2, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { VideoPlayer } from '@/components/video-player';
import { useLanguage } from '@/hooks/use-language';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AddVideosToPlaylistDialog } from '@/components/AddVideosToPlaylistDialog';
import { useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { updateDoc, arrayRemove, writeBatch } from 'firebase/firestore';
import { Trash2, RefreshCw } from 'lucide-react';

type SortOption = 'default' | 'title' | 'newest' | 'oldest' | 'duration' | 'views';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const id = params.id as string;
  const [user] = useAuthState(auth);
  const [refreshKey, setRefreshKey] = useState(0);
  const [removingVideoId, setRemovingVideoId] = useState<string | null>(null);

  const playlistRef = doc(db, 'playlists', id);
  const [playlist, loadingPlaylist] = useDocumentData(playlistRef);

  const handleRemoveVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !playlist || playlist.creatorId !== user.uid) {
      toast({
        variant: 'destructive',
        title: 'Permission denied',
        description: 'Only the playlist owner can remove videos.',
      });
      return;
    }

    setRemovingVideoId(videoId);
    try {
      const videoItem = playlist.items.find((item: any) => item.contentId === videoId);
      if (videoItem) {
        await updateDoc(playlistRef, {
          items: arrayRemove(videoItem),
        });
        toast({
          title: 'Video removed',
          description: 'The video has been removed from the playlist.',
        });
        
        // If the removed video was active, switch to next video
        if (activeVideoId === videoId) {
          const remainingVideos = filteredAndSortedVideos.filter((v: any) => v.id !== videoId);
          if (remainingVideos.length > 0) {
            setActiveVideoId(remainingVideos[0].id);
          } else {
            setActiveVideoId(null);
          }
        }
        
        setRefreshKey(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Failed to remove video:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove video from playlist.',
      });
    } finally {
      setRemovingVideoId(null);
    }
  };

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [filterType, setFilterType] = useState<string>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playlist && playlist.items && playlist.items.length > 0 && !activeVideoId) {
      setActiveVideoId(playlist.items[0].contentId);
    }
  }, [playlist, activeVideoId]);

  const mediaIds = useMemo(() => playlist?.items?.map((item: any) => item.contentId) || [], [playlist]);
  
  // Firestore 'in' queries are limited to 30 items. For longer playlists, pagination or a different approach would be needed.
  const mediaQuery = mediaIds.length > 0 ? query(collection(db, 'media'), where('__name__', 'in', mediaIds.slice(0,30))) : undefined;
  const [mediaItems, loadingMedia] = useCollectionData(mediaQuery, { idField: 'id' });

  const orderedMediaItems = useMemo(() => {
    if (!mediaItems || !playlist?.items) return [];
    const mediaMap = new Map(mediaItems.map(item => [item.id, item]));
    return playlist.items
      .map((item: any) => mediaMap.get(item.contentId))
      .filter(Boolean); // Filter out any undefined items if media hasn't loaded yet
  }, [playlist, mediaItems]);

  // Filter and sort videos
  const filteredAndSortedVideos = useMemo(() => {
    let filtered = [...orderedMediaItems];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const title = (item[`title_${language}`] || item.title_en || '').toLowerCase();
        const description = (item[`description_${language}`] || item.description_en || '').toLowerCase();
        return title.includes(query) || description.includes(query);
      });
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((item: any) => item.mediaType === filterType);
    }

    // Sort
    if (sortBy !== 'default') {
      filtered.sort((a: any, b: any) => {
        switch (sortBy) {
          case 'title':
            const titleA = (a[`title_${language}`] || a.title_en || '').toLowerCase();
            const titleB = (b[`title_${language}`] || b.title_en || '').toLowerCase();
            return titleA.localeCompare(titleB);
          case 'newest':
            return (b.uploadDate?.toMillis?.() || 0) - (a.uploadDate?.toMillis?.() || 0);
          case 'oldest':
            return (a.uploadDate?.toMillis?.() || 0) - (b.uploadDate?.toMillis?.() || 0);
          case 'duration':
            return (a.duration || 0) - (b.duration || 0);
          case 'views':
            return (b.views || 0) - (a.views || 0);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [orderedMediaItems, searchQuery, sortBy, filterType, language]);

  // Get current video index
  const currentVideoIndex = useMemo(() => {
    return filteredAndSortedVideos.findIndex((item: any) => item?.id === activeVideoId);
  }, [filteredAndSortedVideos, activeVideoId]);

  // Get current video
  const currentVideo = useMemo(() => {
    return filteredAndSortedVideos[currentVideoIndex];
  }, [filteredAndSortedVideos, currentVideoIndex]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentVideoIndex < filteredAndSortedVideos.length - 1) {
      const nextVideo = filteredAndSortedVideos[currentVideoIndex + 1];
      if (nextVideo) {
        setActiveVideoId(nextVideo.id);
        // Scroll to top when changing video
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentVideoIndex, filteredAndSortedVideos]);

  const goToPrevious = useCallback(() => {
    if (currentVideoIndex > 0) {
      const prevVideo = filteredAndSortedVideos[currentVideoIndex - 1];
      if (prevVideo) {
        setActiveVideoId(prevVideo.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentVideoIndex, filteredAndSortedVideos]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVideoEnd = () => {
    goToNext();
  };

  const handleShare = async () => {
    const shareData = {
      title: playlist?.title || 'Playlist',
      text: `Watch ${playlist?.title || 'this playlist'}`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied!',
          description: 'Playlist link copied to clipboard.',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Get unique media types for filter
  const mediaTypes = useMemo(() => {
    const types = new Set<string>();
    orderedMediaItems.forEach((item: any) => {
      if (item?.mediaType) {
        types.add(item.mediaType);
      }
    });
    return Array.from(types);
  }, [orderedMediaItems]);

  if (loadingPlaylist) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!playlist) {
    return notFound();
  }

  return (
    <div ref={containerRef} className="flex flex-col h-[calc(100vh-65px)] bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">{playlist.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredAndSortedVideos.length} of {orderedMediaItems.length} videos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user && playlist?.creatorId === user.uid && (
                <AddVideosToPlaylistDialog
                  playlistId={id}
                  playlistTitle={playlist?.title || 'Playlist'}
                  existingVideoIds={mediaIds}
                  onVideosAdded={() => {
                    setRefreshKey(prev => prev + 1);
                    toast({ title: 'Videos added!', description: 'Refresh the page to see your new videos.' });
                  }}
                />
              )}
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex"
              >
                {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-4 lg:p-8">
            {activeVideoId ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoPlayer contentId={activeVideoId} onVideoEnd={handleVideoEnd} />
                  
                  {/* Navigation Overlay */}
                  <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="pointer-events-auto opacity-0 hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                      onClick={goToPrevious}
                      disabled={currentVideoIndex === 0}
                    >
                      <ChevronLeft className="h-8 w-8 text-white" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="pointer-events-auto opacity-0 hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                      onClick={goToNext}
                      disabled={currentVideoIndex === filteredAndSortedVideos.length - 1}
                    >
                      <ChevronRight className="h-8 w-8 text-white" />
                    </Button>
                  </div>
                </div>

                {/* Video Info */}
                {currentVideo && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {currentVideo[`title_${language}`] || currentVideo.title_en}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{(currentVideo.views || 0).toLocaleString()} views</span>
                        </div>
                        {currentVideo.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}</span>
                          </div>
                        )}
                        <Badge variant="secondary">{currentVideo.mediaType}</Badge>
                      </div>
                    </div>
                    {currentVideo[`description_${language}`] || currentVideo.description_en ? (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                            {currentVideo[`description_${language}`] || currentVideo.description_en}
                          </p>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                )}
              </div>
            ) : loadingMedia ? (
              <div className="flex justify-center items-center aspect-video bg-secondary rounded-lg">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
            ) : (
              <div className="aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white">
                <Music className="h-16 w-16 text-muted-foreground" />
                <p className="mt-4">This playlist is empty or the videos are still loading.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className={cn(
          "border-l border-border overflow-y-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
          sidebarCollapsed ? "w-0 hidden" : "w-full lg:w-[400px]"
        )}>
          <div className="p-4 space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListMusic className="h-5 w-5" />
                  Playlist ({filteredAndSortedVideos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9 flex-1">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {mediaTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Order</SelectItem>
                      <SelectItem value="title">Title (A-Z)</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      <SelectItem value="views">Most Views</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {(searchQuery || filterType !== 'all' || sortBy !== 'default') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                      setSortBy('default');
                    }}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Video List */}
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-0 space-y-1">
                {loadingMedia ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin h-6 w-6" />
                  </div>
                ) : filteredAndSortedVideos.length > 0 ? (
                  filteredAndSortedVideos.map((item: DocumentData | undefined, index: number) => {
                    if (!item) return null;
                    const title = item[`title_${language}`] || item.title_en;
                    const isActive = activeVideoId === item.id;
                    const actualIndex = orderedMediaItems.findIndex((v: any) => v?.id === item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveVideoId(item.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group",
                          isActive
                            ? "bg-primary/20 border-l-4 border-primary"
                            : "hover:bg-primary/10"
                        )}
                      >
                        <div className="relative w-32 h-20 shrink-0 rounded-md overflow-hidden bg-secondary">
                          <Image
                            src={item.thumbnailUrl || '/placeholder.jpg'}
                            alt={title}
                            fill
                            className="object-cover"
                          />
                          {isActive && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <PlayCircle className="h-8 w-8 text-white" />
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                          </div>
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className={cn(
                            "font-semibold text-sm line-clamp-2",
                            isActive ? "text-primary" : "text-foreground"
                          )}>
                            {title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{actualIndex + 1}</span>
                            <span>•</span>
                            <span>{item.mediaType}</span>
                            {item.views && (
                              <>
                                <span>•</span>
                                <span>{(item.views || 0).toLocaleString()} views</span>
                              </>
                            )}
                          </div>
                        </div>
                        {user && playlist?.creatorId === user.uid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleRemoveVideo(item.id, e)}
                            disabled={removingVideoId === item.id}
                          >
                            {removingVideoId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No videos found</p>
                    {(searchQuery || filterType !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterType('all');
                        }}
                        className="mt-2"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="fixed bottom-4 right-4 bg-background/90 backdrop-blur border border-border rounded-lg p-3 text-xs text-muted-foreground shadow-lg hidden lg:block">
        <p className="font-semibold mb-1">Keyboard Shortcuts:</p>
        <p>← → Navigate videos</p>
        <p>Space Play/Pause</p>
        <p>F Fullscreen</p>
      </div>
    </div>
  );
}
