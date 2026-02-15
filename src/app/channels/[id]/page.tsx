'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useDocumentData, useCollectionData } from 'react-firebase-hooks/firestore';
import { doc, writeBatch, increment, collection, query, where, addDoc, serverTimestamp, orderBy, updateDoc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';
import { Loader2, Users, CheckCircle, PlusCircle, Video, ListMusic, MessageSquare, Info, Upload, Edit, BarChart3, Heart, Play, Search, Filter, Calendar, Eye, ThumbsUp, Clock, ArrowLeft, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from '@/components/PostCard';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useTransition, useMemo, useState } from 'react';
import type { DocumentData } from 'firebase/firestore';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { format, formatDistanceToNow } from 'date-fns';
import { ManagePlaylistsDialog } from '@/components/ManagePlaylistsDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const postSchema = z.object({
  content: z.string().min(10, "Post must be at least 10 characters.").max(2000, "Post must be less than 2000 characters."),
});
type PostFormValues = z.infer<typeof postSchema>;

interface CreatePostCardProps {
    channelId: string;
    onPostCreated?: () => void;
}

function CreatePostCard({ channelId, onPostCreated }: CreatePostCardProps) {
    const [user] = useAuthState(useAuth());
    const db = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<PostFormValues>({
        resolver: zodResolver(postSchema),
        defaultValues: { content: '' },
    });

    const onSubmit = (data: PostFormValues) => {
        if (!user) return;
        startTransition(() => {
            const postsCollection = collection(db, 'posts');
            const postData = {
                authorId: user.uid,
                content: data.content,
                createdAt: serverTimestamp(),
                contextId: channelId,
                contextType: 'channel' as const,
                likes: 0,
                commentsCount: 0,
            };

            addDoc(postsCollection, postData)
            .then(() => {
                form.reset();
                toast({ 
                    title: "Post created successfully!",
                    description: "Your post has been added to the channel.",
                });
                // Refresh posts list
                if (onPostCreated) {
                    setTimeout(() => {
                        onPostCreated();
                    }, 500);
                }
            })
            .catch(async (serverError) => {
                console.error('Error creating post:', serverError);
                const permissionError = new FirestorePermissionError({
                    path: postsCollection.path,
                    operation: 'create',
                    requestResourceData: postData,
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({
                    variant: 'destructive',
                    title: 'Failed to create post',
                    description: 'Please try again.',
                });
            });
        });
    };
    
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-lg">Create a New Post</CardTitle>
                <CardDescription>Share an update with your followers.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea {...field} placeholder="What's on your mind?" rows={3} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Post
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

function VideosTab({ channelId }: { channelId: string }) {
    const db = useFirestore();
    const { language } = useLanguage();
    const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'oldest'>('newest');
    const [searchQuery, setSearchQuery] = useState('');
    
    const mediaQuery = useMemo(() => {
        let q = query(collection(db, 'media'), where('userId', '==', channelId), where('status', '==', 'approved'));
        
        if (sortBy === 'newest') {
            q = query(q, orderBy('uploadDate', 'desc'));
        } else if (sortBy === 'oldest') {
            q = query(q, orderBy('uploadDate', 'asc'));
        } else if (sortBy === 'popular') {
            q = query(q, orderBy('views', 'desc'));
        }
        
        return q;
    }, [db, channelId, sortBy]);
    
    const [media, loading] = useCollectionData(mediaQuery, { idField: 'id' });

    const filteredMedia = useMemo(() => {
        if (!media || !searchQuery) return media || [];
        const query = searchQuery.toLowerCase();
        return media.filter((item: any) => {
            const title = (item[`title_${language}`] || item.title_en || '').toLowerCase();
            const description = (item[`description_${language}`] || item.description_en || '').toLowerCase();
            return title.includes(query) || description.includes(query);
        });
    }, [media, searchQuery, language]);

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

    if (loading) return <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />;

    return (
        <div className="space-y-6">
            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMedia && filteredMedia.length > 0 ? filteredMedia.map((item: any) => {
                    const title = item[`title_${language}`] || item.title_en;
                    const uploadDate = item.uploadDate?.toDate ? item.uploadDate.toDate() : new Date(item.uploadDate || Date.now());
                    return (
                        <Link href={`/watch/${item.id}`} key={item.id} className="group">
                            <Card className="overflow-hidden border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                                <CardContent className="p-0">
                                    <div className="aspect-video relative rounded-t-lg overflow-hidden bg-secondary">
                                        <Image
                                            src={item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/640/360`}
                                            alt={title}
                                            fill
                                            className="object-cover transform transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                                            {formatDuration(item.duration || 0)}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardHeader className="p-3">
                                    <CardTitle className="text-sm font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                        {title}
                                    </CardTitle>
                                    <div className="flex flex-col gap-1 mt-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Eye className="h-3 w-3" />
                                            <span>{formatViews(item.views || 0)} views</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>{formatDistanceToNow(uploadDate, { addSuffix: true })}</span>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    );
                }) : (
                    <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
                        <Video className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h2 className="text-2xl font-semibold text-foreground">No Videos Yet</h2>
                        <p className="mt-2 text-muted-foreground">
                            {searchQuery ? 'No videos match your search.' : "This creator hasn't uploaded any videos."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function PostsTab({ channelId, isOwner }: { channelId: string, isOwner: boolean }) {
    const db = useFirestore();
    const [refreshKey, setRefreshKey] = useState(0);
    
    const postsQuery = useMemo(() => {
        if (!db) return undefined;
        try {
            return query(
                collection(db, 'posts'), 
                where('contextType', '==', 'channel'),
                where('contextId', '==', channelId), 
                orderBy('createdAt', 'desc')
            );
        } catch (error) {
            // If query fails (e.g., missing index), try without orderBy
            console.warn('Posts query with orderBy failed, trying without:', error);
            return query(
                collection(db, 'posts'), 
                where('contextType', '==', 'channel'),
                where('contextId', '==', channelId)
            );
        }
    }, [db, channelId, refreshKey]);
    
    const [posts, loading, error] = useCollectionData(postsQuery, { idField: 'id' });

    // Sort client-side if orderBy failed
    const sortedPosts = useMemo(() => {
        if (!posts) return [];
        return [...posts].sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return bTime - aTime;
        });
    }, [posts]);

    const handlePostCreated = () => {
        // Refresh posts after creating
        setRefreshKey(prev => prev + 1);
    };

    if (loading) return <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />;

    if (error) {
        console.error('Error loading posts:', error);
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
             {isOwner && <CreatePostCard channelId={channelId} onPostCreated={handlePostCreated} />}
            {sortedPosts && sortedPosts.length > 0 ? sortedPosts.map((post: DocumentData) => (
                <PostCard key={post.id} post={post} />
            )) : (
                 <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
                    <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h2 className="text-2xl font-semibold text-foreground">No Posts Yet</h2>
                    <p className="mt-2 text-muted-foreground">
                        {isOwner 
                            ? "Share an update with your subscribers by creating a post above."
                            : "This creator hasn't made any posts on their channel yet."}
                    </p>
                </div>
            )}
        </div>
    );
}

function PlaylistsTab({ channel, isOwner }: { channel: DocumentData, isOwner: boolean }) {
     const db = useFirestore();
     
     const featuredPlaylistIds = channel.featuredPlaylists || [];

     const playlistsQuery = useMemo(() => query(collection(db, 'playlists'), where('creatorId', '==', channel.userId), where('isPublic', '==', true)), [db, channel.userId]);
     const [allPlaylists, loading] = useCollectionData(playlistsQuery, { idField: 'id' });

    if (loading) return <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />;
    
    const featuredPlaylists = allPlaylists?.filter(p => featuredPlaylistIds.includes(p.id));

     return (
        <div>
            {isOwner && (
                <div className="mb-6 flex justify-end">
                    <ManagePlaylistsDialog 
                        allPlaylists={allPlaylists || []} 
                        featuredIds={featuredPlaylistIds} 
                        channelId={channel.userId}
                    />
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPlaylists && featuredPlaylists.length > 0 ? featuredPlaylists.map((playlist: any) => (
                    <Link href={`/playlists/${playlist.id}`} key={playlist.id} className="group">
                        <Card className="overflow-hidden border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                            <div className="relative aspect-video bg-secondary">
                                <Image src={`https://picsum.photos/seed/${playlist.id}/600/400`} alt={playlist.title} layout="fill" className="object-cover" />
                            </div>
                            <CardHeader>
                                <CardTitle className="text-md font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                    {playlist.title}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </Link>
                )) : (
                    <div className="col-span-full text-center py-16 border-2 border-dashed rounded-lg">
                        <ListMusic className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h2 className="text-2xl font-semibold text-foreground">No Featured Playlists</h2>
                        <p className="mt-2 text-muted-foreground">This creator hasn't featured any playlists yet.</p>
                        {isOwner && <p className="mt-1 text-sm text-muted-foreground">Click 'Manage Playlists' to add some.</p>}
                    </div>
                )}
            </div>
        </div>
     );
}

function AboutTab({ channel, language }: { channel: DocumentData, language: string }) {
    const description = channel[`description_${language}`] || channel.description_en;
    const creationDate = channel.creationDate?.toDate ? channel.creationDate.toDate() : new Date(channel.creationDate || Date.now());
    
    // Calculate video count
    const db = useFirestore();
    const mediaQuery = useMemo(() => query(collection(db, 'media'), where('userId', '==', channel.userId), where('status', '==', 'approved')), [db, channel.userId]);
    const [media] = useCollectionData(mediaQuery);
    const videoCount = media?.length || 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>About {channel.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{description}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Channel Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/50">
                            <Users className="h-8 w-8 text-primary mb-2" />
                            <p className="font-bold text-2xl">{channel.subscriberCount?.toLocaleString() || 0}</p>
                            <p className="text-sm text-muted-foreground">Subscribers</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/50">
                            <Eye className="h-8 w-8 text-primary mb-2" />
                            <p className="font-bold text-2xl">{(channel.totalViews || 0).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Total Views</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/50">
                            <Video className="h-8 w-8 text-primary mb-2" />
                            <p className="font-bold text-2xl">{videoCount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Videos</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/50">
                            <ThumbsUp className="h-8 w-8 text-primary mb-2" />
                            <p className="font-bold text-2xl">{(channel.totalLikes || 0).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Total Likes</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Channel Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="font-medium">Joined</p>
                            <p className="text-sm text-muted-foreground">{format(creationDate, 'MMMM d, yyyy')}</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="font-medium">Member for</p>
                            <p className="text-sm text-muted-foreground">{formatDistanceToNow(creationDate, { addSuffix: false })}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.id as string;
  const { language, t } = useLanguage();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const channelRef = useMemo(() => doc(db, 'channels', channelId), [db, channelId]);
  const [channel, loadingChannel] = useDocumentData(channelRef);

  const subscriptionRef = useMemo(() => user ? doc(db, `users/${user.uid}/subscriptions`, channelId) : undefined, [user, db, channelId]);
  const [subscription, loadingSubscription] = useDocumentData(subscriptionRef);
  
  const isSubscribed = !!subscription;
  const isOwner = user?.uid === channelId;

  const handleSubscribe = async () => {
    if (!user || !channel || !channel.userId) {
      toast({ variant: 'destructive', title: 'You must be logged in to subscribe to a channel.' });
      return;
    }
     if (isOwner) {
        toast({ variant: 'destructive', title: "You cannot subscribe to your own channel." });
        return;
    }

    const userSubscriptionRef = doc(db, `users/${user.uid}/subscriptions`, channelId);
    const channelSubscriberRef = doc(db, `channels/${channelId}/subscribers`, user.uid);
    
    const batch = writeBatch(db);

    if (isSubscribed) {
      batch.delete(userSubscriptionRef);
      batch.delete(channelSubscriberRef);
      batch.update(channelRef, { subscriberCount: increment(-1) });
    } else {
      const subscriptionData = { channelId: channelId, subscribedAt: serverTimestamp() };
      const subscriberData = { userId: user.uid, subscribedAt: serverTimestamp() };
      batch.set(userSubscriptionRef, subscriptionData);
      batch.set(channelSubscriberRef, subscriberData);
      batch.update(channelRef, { subscriberCount: increment(1) });
    }

    batch.commit()
    .then(() => {
        toast({
          title: isSubscribed ? 'Unsubscribed' : 'Subscribed!',
          description: `You have ${isSubscribed ? 'unsubscribed from' : 'subscribed to'} ${channel.name}.`
        });
    })
    .catch((serverError) => {
        const operation = isSubscribed ? 'delete' : 'create';
        toast({ variant: 'destructive', title: `Failed to ${operation} subscription` });
        const permissionError = new FirestorePermissionError({
            path: userSubscriptionRef.path,
            operation: operation,
            requestResourceData: isSubscribed ? undefined : { channelId: channelId },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  if (loadingChannel) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!channel) {
    notFound();
  }

  const description = channel[`description_${language}`] || channel.description_en;

  return (
    <main className="min-h-screen bg-background">
      {/* Channel Banner */}
      <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 overflow-hidden">
        <Image
          src={`https://picsum.photos/seed/${channelId}-banner/1920/400`}
          alt={`${channel.name} banner`}
          data-ai-hint="abstract spiritual background"
          fill
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Channel Info Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-6 -mt-20 sm:-mt-24">
          {/* Channel Avatar */}
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 shrink-0 rounded-full border-4 border-background bg-secondary mx-auto sm:mx-0 shadow-lg">
            <Link href={`/profile/${channelId}`}>
              <Image
                src={`https://picsum.photos/seed/${channelId}/200/200`}
                alt={channel.name}
                data-ai-hint="spiritual teacher"
                fill
                className="object-cover rounded-full"
              />
            </Link>
          </div>

          {/* Channel Details */}
          <div className="flex-grow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-16 sm:pt-20">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold">
                  <Link href={`/profile/${channelId}`} className="hover:text-primary transition-colors">
                    {channel.name}
                  </Link>
                </h1>
                <CheckCircle className="h-6 w-6 text-blue-500 shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="font-medium">{channel.subscriberCount?.toLocaleString() || 0} subscribers</span>
                <span>•</span>
                <span>{(channel.totalViews || 0).toLocaleString()} total views</span>
              </div>
              <p className="text-sm text-foreground max-w-2xl line-clamp-2">{description}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isOwner && (
                <>
                  <Button variant="outline" onClick={() => router.push('/upload')} className="flex-1 sm:flex-none">
                    <Upload className="mr-2 h-4 w-4" /> Upload Video
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => router.push(`/channels/${channelId}/edit`)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </>
              )}
              {user && !isOwner && (
                <Button 
                  variant={isSubscribed ? 'secondary' : 'default'} 
                  size="lg" 
                  onClick={handleSubscribe}
                  disabled={loadingSubscription} 
                  className="flex-1 sm:flex-none"
                >
                  {loadingSubscription ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isSubscribed ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> Subscribed
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" /> Subscribe
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4 pb-8">
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="videos" className="flex items-center gap-2 py-3">
              <Video className="h-4 w-4" /> Videos
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2 py-3">
              <MessageSquare className="h-4 w-4" /> Posts
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex items-center gap-2 py-3">
              <ListMusic className="h-4 w-4" /> Playlists
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2 py-3">
              <Info className="h-4 w-4" /> About
            </TabsTrigger>
          </TabsList>
          <TabsContent value="videos" className="mt-6">
            <VideosTab channelId={channelId} />
          </TabsContent>
          <TabsContent value="posts" className="mt-6">
            <PostsTab channelId={channelId} isOwner={isOwner} key={`posts-${channelId}`} />
          </TabsContent>
          <TabsContent value="playlists" className="mt-6">
            <PlaylistsTab channel={channel} isOwner={isOwner} />
          </TabsContent>
          <TabsContent value="about" className="mt-6">
            <AboutTab channel={channel} language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
