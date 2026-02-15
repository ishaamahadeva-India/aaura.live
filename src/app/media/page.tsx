'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Film, Music, Mic, Upload, Search, Filter, Eye, ThumbsUp, Calendar, Clock, Play, TrendingUp, CalendarDays } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const mediaTypes = ['all', 'video', 'short', 'bhajan', 'podcast', 'pravachan', 'audiobook'];

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

const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
        'all': 'All Media',
        'video': 'Videos',
        'short': 'Shorts',
        'bhajan': 'Bhajans',
        'podcast': 'Podcasts',
        'pravachan': 'Pravachans',
        'audiobook': 'Audiobooks',
    };
    return labels[type] || type;
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

const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
};

function CreatorAvatar({ userId }: { userId: string }) {
    const db = useFirestore();
    const creatorRef = userId ? doc(db, 'users', userId) : undefined;
    const [creator, loading] = useDocumentData(creatorRef);

    if (loading || !creator) {
        return <Skeleton className="h-6 w-6 rounded-full" />;
    }

    return (
        <Link href={`/channels/${userId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-6 w-6">
                <AvatarImage src={creator.photoURL} />
                <AvatarFallback>{creator.displayName?.[0] || 'C'}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground line-clamp-1">{creator.displayName || 'Creator'}</span>
        </Link>
    );
}

function MediaCard({ item, language }: { item: any; language: string }) {
    const title = item[`title_${language}`] || item.title_en || 'Untitled';
    const description = item[`description_${language}`] || item.description_en || '';
    const uploadDate = item.uploadDate?.toDate ? item.uploadDate.toDate() : new Date(item.uploadDate || Date.now());
    const duration = item.duration || 0;
    const views = item.views || 0;
    const likes = item.likes || 0;

    return (
        <Link href={`/watch/${item.id}`} className="group block h-full">
            <Card className="overflow-hidden border-primary/20 hover:border-primary/50 transition-all duration-300 h-full flex flex-col hover:shadow-lg group-hover:scale-[1.02]">
                <CardContent className="p-0 relative">
                    <div className="aspect-video relative rounded-t-lg overflow-hidden bg-secondary">
                        <Image
                            src={item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/640/360`}
                            alt={title}
                            data-ai-hint={item.imageHint || 'spiritual content'}
                            fill
                            className="object-cover transform transition-transform duration-300 group-hover:scale-110"
                        />
                        {/* Duration Badge */}
                        {duration > 0 && (
                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(duration)}</span>
                            </div>
                        )}
                        {/* Type Badge */}
                        <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="bg-background/90 text-foreground flex items-center gap-1.5">
                                {getIconForType(item.mediaType)}
                                <span className="capitalize text-xs">{item.mediaType}</span>
                            </Badge>
                        </div>
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-white/90 rounded-full p-3">
                                    <Play className="h-6 w-6 text-primary fill-primary" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardHeader className="p-4 flex-1 flex flex-col">
                    <CardTitle className="text-sm font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors mb-2">
                        {title}
                    </CardTitle>
                    {description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {description}
                        </p>
                    )}
                    <div className="mt-auto space-y-2">
                        <CreatorAvatar userId={item.userId} />
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span>{formatViews(views)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                <span>{formatViews(likes)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDistanceToNow(uploadDate, { addSuffix: true })}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </Link>
    );
}

export default function MediaPage() {
  const { language, t } = useLanguage();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'mostViewed' | 'oldest'>('newest');
  
  const mediaQuery = useMemo(() => {
    if (!db) return undefined;
    let q: any = query(collection(db, 'media'), where('status', '==', 'approved'));
    
    // Add sorting
    if (sortBy === 'newest') {
        q = query(q, orderBy('uploadDate', 'desc'));
    } else if (sortBy === 'popular') {
        q = query(q, orderBy('likes', 'desc'));
    } else if (sortBy === 'mostViewed') {
        q = query(q, orderBy('views', 'desc'));
    } else if (sortBy === 'oldest') {
        q = query(q, orderBy('uploadDate', 'asc'));
    }
    
    return q;
  }, [db, sortBy]);
  
  const [mediaSnapshot, isLoading] = useCollection(mediaQuery);
  
  const media = useMemo(() => {
    return mediaSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
  }, [mediaSnapshot]);

  const filteredMedia = useMemo(() => {
    if (!media) return [];
    
    let updatedMedia = [...media];

    // Filter by type
    if (selectedType !== 'all') {
        updatedMedia = updatedMedia.filter(item => item.mediaType === selectedType);
    }

    // Search in title, description, and tags
    if (searchQuery.trim() !== '') {
        const lowercasedQuery = searchQuery.toLowerCase();
        updatedMedia = updatedMedia.filter(item => {
            const title = ((item[`title_${language}`] || item.title_en || '') as string).toLowerCase();
            const description = ((item[`description_${language}`] || item.description_en || '') as string).toLowerCase();
            const tags = (item.tags || []).join(' ').toLowerCase();
            return title.includes(lowercasedQuery) || 
                   description.includes(lowercasedQuery) || 
                   tags.includes(lowercasedQuery);
        });
    }
    
    return updatedMedia;
  }, [searchQuery, selectedType, media, language]);

  const getTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    media.forEach((item: any) => {
      counts[item.mediaType] = (counts[item.mediaType] || 0) + 1;
      counts['all'] = (counts['all'] || 0) + 1;
    });
    return counts;
  }, [media]);

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary">
                {t.media?.title || 'Media Library'}
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                {t.media?.description || 'Explore bhajans, podcasts, pravachans, and spiritual videos'}
            </p>
        </div>
        <Button asChild size="lg">
            <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" />
                {t.media?.uploadButton || 'Upload Media'}
            </Link>
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-8">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 h-auto mb-6">
          {mediaTypes.map(type => (
            <TabsTrigger 
              key={type} 
              value={type} 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {getIconForType(type)}
              <span className="text-xs sm:text-sm capitalize">{getTypeLabel(type)}</span>
              {getTypeCounts[type] !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {getTypeCounts[type]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search and Sort Controls */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="h-12 w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>Newest First</span>
              </div>
            </SelectItem>
            <SelectItem value="popular">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                <span>Most Popular</span>
              </div>
            </SelectItem>
            <SelectItem value="mostViewed">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Most Viewed</span>
              </div>
            </SelectItem>
            <SelectItem value="oldest">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Oldest First</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {!isLoading && (
        <div className="mb-6 text-sm text-muted-foreground">
          Showing {filteredMedia.length} of {media.length} media items
        </div>
      )}

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : filteredMedia && filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredMedia.map((item: any) => (
            <MediaCard key={item.id} item={item} language={language} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Music className="mx-auto h-24 w-24 text-muted-foreground/50 mb-4" />
          <h2 className="mt-6 text-2xl font-semibold text-foreground">
            {searchQuery || selectedType !== 'all' ? 'No Media Found' : 'No Media Available'}
          </h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            {searchQuery || selectedType !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Be the first to upload spiritual content!'}
          </p>
          {!searchQuery && selectedType === 'all' && (
            <Button asChild className="mt-4">
              <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Media
              </Link>
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
