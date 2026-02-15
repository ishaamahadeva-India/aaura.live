
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Brain, PlusCircle, ThumbsUp, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Manifestation } from '@/lib/manifestations';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';


function ManifestationCard({ post }: { post: any }) {
    // Handle Firestore Timestamp or Date string
    const getCreatedAt = () => {
        if (!post.createdAt) return new Date();
        if (post.createdAt.toDate) {
            return post.createdAt.toDate();
        }
        if (post.createdAt instanceof Date) {
            return post.createdAt;
        }
        return new Date(post.createdAt);
    };

    const createdAt = getCreatedAt();
    const author = { 
        displayName: post.authorName || post.username || 'User ' + (post.userId || post.authorId || 'unknown').slice(0, 4), 
        photoURL: post.authorPhotoURL || post.userPhotoURL || `https://picsum.photos/seed/${post.userId || post.authorId || 'user'}/100/100` 
    };
    
    return (
        <Card className="flex flex-col overflow-hidden group border-primary/20 hover:border-primary/50 transition-colors duration-300 h-full">
             <CardHeader className="flex-row gap-3 items-center">
                <Avatar>
                    <AvatarImage src={author.photoURL} />
                    <AvatarFallback>{author.displayName[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-semibold">{author.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                        Shared {formatDistanceToNow(createdAt, { addSuffix: true })}
                    </p>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <h3 className="font-bold text-lg text-primary mb-2 line-clamp-2">{post.title || 'Untitled'}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.technique || post.description || 'No description available'}</p>
                {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag: string, index: number) => (
                            <Badge key={tag || index} variant="secondary">{tag}</Badge>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-secondary/30 p-4">
                 <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-xs">
                        <ThumbsUp className="w-4 h-4" /> {post.likesCount || post.likes || 0} Likes
                    </span>
                    <span className="flex items-center gap-1.5 text-xs">
                        <MessageSquare className="w-4 h-4" /> {post.commentsCount || post.comments || 0} Comments
                    </span>
                </div>
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/manifestation/${post.id || post.slug || 'unknown'}`}>
                        Read More <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}


export default function ManifestationPage() {
    const db = useFirestore();
    const manifestationsQuery = useMemo(() => {
        if (!db) return null;
        try {
            return query(collection(db, 'manifestations'), orderBy('createdAt', 'desc'));
        } catch (error) {
            // If orderBy fails, try without it
            console.warn('Query with orderBy failed, trying without:', error);
            return query(collection(db, 'manifestations'));
        }
    }, [db]);
    const [posts, isLoading, error] = useCollectionData(manifestationsQuery, { idField: 'id' });
    
    // Sort client-side if orderBy failed
    const sortedPosts = useMemo(() => {
        if (!posts) return [];
        return [...posts].sort((a: any, b: any) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return bTime - aTime;
        });
    }, [posts]);
    
    return (
        <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
                <div className="text-left">
                    <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
                        <Brain className="h-10 w-10" /> Manifestation Hub
                    </h1>
                    <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                        Share and discover techniques to attract your desires and shape your reality.
                    </p>
                </div>
                 <Button asChild size="lg">
                    <Link href="/manifestation/create">
                        <PlusCircle className="mr-2" />
                        Share Your Manifestation
                    </Link>
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : error ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Brain className="mx-auto h-24 w-24 text-muted-foreground/50" />
                    <h2 className="mt-6 text-2xl font-semibold text-foreground">Error Loading Manifestations</h2>
                    <p className="mt-2 text-muted-foreground">
                        Please try refreshing the page.
                    </p>
                </div>
            ) : sortedPosts && sortedPosts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sortedPosts.map((post: any) => (
                        <ManifestationCard key={post.id || post.slug || Math.random()} post={post} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Brain className="mx-auto h-24 w-24 text-muted-foreground/50" />
                    <h2 className="mt-6 text-2xl font-semibold text-foreground">Be the First to Share</h2>
                    <p className="mt-2 text-muted-foreground">
                        No manifestations have been shared yet. Start the movement!
                    </p>
                </div>
            )}
        </main>
    );
}
