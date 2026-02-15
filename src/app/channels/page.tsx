
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle, PlusCircle, Users, Loader2, Search, Eye, Video } from 'lucide-react';
import Link from 'next/link';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import type { DocumentData } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Channel extends DocumentData {
  id: string;
  name: string;
  description_en: string;
  subscriberCount?: number;
  totalViews?: number;
  [key: string]: any;
}

function ChannelCard({ channel }: { channel: Channel }) {
  const description = channel.description_en;
  
  return (
    <Link href={`/channels/${channel.id}`} className="group block h-full">
      <Card className="flex flex-col text-center items-center p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 h-full hover:shadow-lg">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <Image
            src={`https://picsum.photos/seed/${channel.id}/200/200`}
            alt={channel.name}
            data-ai-hint="spiritual teacher"
            width={128}
            height={128}
            className="rounded-full border-4 border-accent/20 relative z-10 group-hover:scale-105 transition-transform"
          />
        </div>
        <CardHeader className="p-0 mb-2">
          <CardTitle className="flex items-center justify-center gap-2 text-foreground group-hover:text-primary transition-colors">
            {channel.name} <CheckCircle className="text-blue-500 h-5 w-5" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <CardDescription className="line-clamp-2 mb-4">{description}</CardDescription>
        </CardContent>
         <CardFooter className="flex-col w-full items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{(channel.subscriberCount || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>{(channel.totalViews || 0).toLocaleString()}</span>
                </div>
            </div>
         </CardFooter>
      </Card>
    </Link>
  );
}


export default function ChannelsPage() {
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'alphabetical'>('popular');
  
  const channelsQuery = useMemo(() => {
    let q = query(collection(db, 'channels'));
    if (sortBy === 'popular') {
      q = query(q, orderBy('subscriberCount', 'desc'));
    } else if (sortBy === 'newest') {
      q = query(q, orderBy('creationDate', 'desc'));
    }
    return q;
  }, [db, sortBy]);
  
  const [channels, isLoading, error] = useCollectionData(channelsQuery, { idField: 'id' });

  const filteredChannels = useMemo(() => {
    if (!channels || !searchQuery) return channels || [];
    const query = searchQuery.toLowerCase();
    return channels.filter((channel: Channel) => {
      const name = (channel.name || '').toLowerCase();
      const description = (channel.description_en || '').toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [channels, searchQuery]);

  if (error) {
    console.error("Error fetching channels:", error);
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-12">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
                  <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary">Creator Channels</h1>
                <Button asChild>
                    <Link href="/channels/create">
                        <PlusCircle className="mr-2" />
                        Create Channel
                    </Link>
                </Button>
            </div>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                Follow your favorite spiritual guides and teachers.
            </p>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        ) : error ? (
            <div className="text-center text-red-500">Could not load channels. Please try again later.</div>
        ) : filteredChannels && filteredChannels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredChannels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel as Channel} />
            ))}
          </div>
        ) : (
             <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <Users className="mx-auto h-24 w-24 text-muted-foreground/50" />
                <h2 className="mt-6 text-2xl font-semibold text-foreground">
                  {searchQuery ? 'No Channels Found' : 'No Channels Yet'}
                </h2>
                <p className="mt-2 text-muted-foreground">
                    {searchQuery 
                      ? 'Try adjusting your search terms.'
                      : 'Be the first one to create a channel!'}
                </p>
            </div>
        )}
    </main>
  );
}
