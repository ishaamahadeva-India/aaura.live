'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Palmtree, UserSquare, Loader2, PlayCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { characters as allCharacters } from '@/lib/characters';
import { temples as allTemples } from '@/lib/temples';
import type { Story } from '@/lib/stories';
import { cn } from '@/lib/utils';

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { language, t } = useLanguage();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const storyQuery = useMemo(() => {
    if (!db || !slug) return undefined;
    return query(collection(db, 'stories'), where('slug', '==', slug));
  }, [db, slug]);

  const [stories, isLoading] = useCollectionData(storyQuery);
  const story = useMemo(() => (stories?.[0] as Story | undefined), [stories]);

  const [activeEpisode, setActiveEpisode] = useState<number | null>(null);
  const [viewedEpisodes, setViewedEpisodes] = useState<Set<number>>(new Set());
  const [completedEpisodes, setCompletedEpisodes] = useState<Set<number>>(new Set());

  // Load user progress
  const storyProgressRef = useMemo(() => {
    if (!user || !story || !db) return undefined;
    return doc(db, `users/${user.uid}/storyProgress`, story.id);
  }, [user, story, db]);

  const [storyProgress] = useDocumentData(storyProgressRef);

  useEffect(() => {
    if (storyProgress) {
      const viewed = new Set(storyProgress.viewedEpisodes || []);
      const completed = new Set(storyProgress.completedEpisodes || []);
      setViewedEpisodes(viewed);
      setCompletedEpisodes(completed);
      
      // Set last watched episode as active if no episode is selected
      if (storyProgress.lastWatchedEpisode && !activeEpisode) {
        setActiveEpisode(storyProgress.lastWatchedEpisode);
      }
    }
  }, [storyProgress, story]);

  useEffect(() => {
    if (story && activeEpisode === null) {
      // Start with first unwatched episode, or first episode if all are watched
      const firstUnwatched = story.episodes.find(ep => !viewedEpisodes.has(ep.episodeNumber));
      setActiveEpisode(firstUnwatched?.episodeNumber || story.episodes[0]?.episodeNumber || null);
    }
  }, [story, activeEpisode, viewedEpisodes]);

  // Mark episode as viewed when playing
  const handleEpisodePlay = async (episodeNumber: number) => {
    setActiveEpisode(episodeNumber);
    setViewedEpisodes(prev => new Set([...prev, episodeNumber]));

    if (user && story && db) {
      try {
        const progressRef = doc(db, `users/${user.uid}/storyProgress`, story.id);
        const progressDoc = await getDoc(progressRef);
        const currentProgress = progressDoc.data();

        const viewed = new Set(currentProgress?.viewedEpisodes || []);
        viewed.add(episodeNumber);

        await setDoc(progressRef, {
          storyId: story.id,
          storySlug: story.slug,
          lastWatchedEpisode: episodeNumber,
          lastWatchedAt: serverTimestamp(),
          viewedEpisodes: Array.from(viewed),
          completedEpisodes: currentProgress?.completedEpisodes || [],
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  // Mark episode as completed
  const handleEpisodeComplete = async (episodeNumber: number) => {
    setCompletedEpisodes(prev => new Set([...prev, episodeNumber]));

    if (user && story && db) {
      try {
        const progressRef = doc(db, `users/${user.uid}/storyProgress`, story.id);
        const progressDoc = await getDoc(progressRef);
        const currentProgress = progressDoc.data();

        const completed = new Set(currentProgress?.completedEpisodes || []);
        completed.add(episodeNumber);

        await setDoc(progressRef, {
          storyId: story.id,
          storySlug: story.slug,
          lastWatchedEpisode: episodeNumber,
          completedEpisodes: Array.from(completed),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        // Auto-play next episode
        const currentIndex = story.episodes.findIndex(ep => ep.episodeNumber === episodeNumber);
        if (currentIndex < story.episodes.length - 1) {
          const nextEpisode = story.episodes[currentIndex + 1];
          setTimeout(() => {
            handleEpisodePlay(nextEpisode.episodeNumber);
          }, 2000); // 2 second delay before next episode
        }
      } catch (error) {
        console.error('Error saving completion:', error);
      }
    }
  };

  // Handle next episode button
  const handleNextEpisode = () => {
    if (!story || activeEpisode === null) return;
    const currentIndex = story.episodes.findIndex(ep => ep.episodeNumber === activeEpisode);
    if (currentIndex < story.episodes.length - 1) {
      const nextEpisode = story.episodes[currentIndex + 1];
      // Mark current as completed if not already
      if (!completedEpisodes.has(activeEpisode)) {
        handleEpisodeComplete(activeEpisode);
      }
      handleEpisodePlay(nextEpisode.episodeNumber);
    }
  };

  const canPlayNext = useMemo(() => {
    if (!story || activeEpisode === null) return false;
    const currentIndex = story.episodes.findIndex(ep => ep.episodeNumber === activeEpisode);
    return currentIndex < story.episodes.length - 1;
  }, [story, activeEpisode]);

  const relatedCharacters = useMemo(() =>
    story ? allCharacters.filter(c => story.relatedCharacters?.includes(c.slug)) : [],
    [story]
  );

  const relatedTemples = useMemo(() =>
    story ? allTemples.filter(tm => story.relatedTemples?.includes(tm.slug)) : [],
    [story]
  );
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!story) {
    return notFound();
  }

  const title = (story.title as any)[language] || story.title.en;
  const summary = (story.summary as any)[language] || story.summary.en;
  const currentEpisode = story.episodes.find(ep => ep.episodeNumber === activeEpisode);

  // Calculate progress percentage
  const progressPercentage = story.episodes.length > 0 
    ? (completedEpisodes.size / story.episodes.length) * 100 
    : 0;

  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary mb-4">{title}</h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{summary}</p>
                <div className="mt-4 flex justify-center flex-wrap gap-2">
                    {story.tags.map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
                
                {/* Progress Bar */}
                {story.episodes.length > 0 && (
                  <div className="mt-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span>{completedEpisodes.size} / {story.episodes.length} Episodes</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Video Player */}
                    <div className="aspect-video relative rounded-lg overflow-hidden border-2 border-primary/20 bg-black shadow-2xl">
                        {currentEpisode ? (
                             <iframe 
                                ref={iframeRef}
                                key={currentEpisode.episodeNumber}
                                width="100%" 
                                height="100%" 
                                src={`https://www.youtube.com/embed/${currentEpisode.videoId}?autoplay=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                                title={(currentEpisode.title as any)[language] || currentEpisode.title.en}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                className="w-full h-full"
                            />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-secondary">
                             <div className="text-center">
                               <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                               <p className="text-muted-foreground">Select an episode to start watching</p>
                             </div>
                           </div>
                        )}
                    </div>
                    
                    {/* Episode Info Card */}
                    {currentEpisode && (
                      <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20">
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <CardTitle className="text-2xl text-primary">
                                {(currentEpisode.title as any)?.[language] || currentEpisode.title.en}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                {completedEpisodes.has(currentEpisode.episodeNumber) && (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                                  </Badge>
                                )}
                                {viewedEpisodes.has(currentEpisode.episodeNumber) && !completedEpisodes.has(currentEpisode.episodeNumber) && (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" /> In Progress
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              Episode {currentEpisode.episodeNumber} of {story.episodes.length}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-lg text-foreground/90">
                              {(currentEpisode.description as any)?.[language] || currentEpisode.description.en}
                            </p>
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                              {currentEpisode.duration && (
                                <p className="text-sm text-muted-foreground">
                                  Duration: {Math.floor(currentEpisode.duration / 60)}:{(currentEpisode.duration % 60).toString().padStart(2, '0')}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => handleEpisodeComplete(currentEpisode.episodeNumber)}
                                  disabled={completedEpisodes.has(currentEpisode.episodeNumber)}
                                  className={cn(
                                    completedEpisodes.has(currentEpisode.episodeNumber) && "bg-green-600 text-white border-green-600"
                                  )}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {completedEpisodes.has(currentEpisode.episodeNumber) ? 'Completed' : 'Mark Complete'}
                                </Button>
                                {canPlayNext && (
                                  <Button
                                    onClick={handleNextEpisode}
                                    className="bg-primary hover:bg-primary/90"
                                  >
                                    Next Episode
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                  </Button>
                                )}
                              </div>
                            </div>
                        </CardContent>
                      </Card>
                    )}
                </div>

                {/* Episodes Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-24 bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                        <CardHeader className="border-b border-border">
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-3 text-primary">
                                <BookOpen className="h-5 w-5" /> Episodes
                              </CardTitle>
                              <Badge variant="secondary" className="text-xs">
                                {story.episodes.length} Total
                              </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[70vh] overflow-y-auto">
                              {story.episodes.map((episode, index) => {
                                const isActive = activeEpisode === episode.episodeNumber;
                                const isViewed = viewedEpisodes.has(episode.episodeNumber);
                                const isCompleted = completedEpisodes.has(episode.episodeNumber);
                                const isLocked = index > 0 && !completedEpisodes.has(story.episodes[index - 1].episodeNumber);

                                return (
                                  <div
                                    key={episode.episodeNumber}
                                    onClick={() => !isLocked && handleEpisodePlay(episode.episodeNumber)}
                                    className={cn(
                                      "flex items-center gap-4 p-4 border-b border-border last:border-b-0 transition-all cursor-pointer",
                                      isActive && "bg-primary/20 border-l-4 border-l-primary",
                                      !isActive && !isLocked && "hover:bg-primary/10",
                                      isLocked && "opacity-50 cursor-not-allowed",
                                      (isViewed || isCompleted) && "bg-red-500/10 border-l-4 border-l-red-500"
                                    )}
                                  >
                                    <div className="relative w-32 h-20 shrink-0 rounded-md overflow-hidden bg-secondary border-2 border-border">
                                      <Image 
                                        src={episode.thumbnailUrl} 
                                        alt={(episode.title as any)[language] || episode.title.en} 
                                        fill 
                                        className={cn(
                                          "object-cover transition-opacity",
                                          (isViewed || isCompleted) && "opacity-90"
                                        )}
                                      />
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        {isLocked ? (
                                          <div className="text-center">
                                            <div className="text-white text-xs font-semibold mb-1">🔒</div>
                                          </div>
                                        ) : (
                                          <PlayCircle className="h-8 w-8 text-white/90" />
                                        )}
                                      </div>
                                      {(isViewed || isCompleted) && (
                                        <div className="absolute top-1 right-1 bg-red-600 rounded-full p-1 shadow-lg">
                                          {isCompleted ? (
                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                          ) : (
                                            <Clock className="h-3 w-3 text-white" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className={cn(
                                          "font-semibold text-sm line-clamp-2",
                                          isActive && "text-primary",
                                          (isViewed || isCompleted) && "text-red-600",
                                          !isViewed && !isActive && "text-foreground"
                                        )}>
                                          {(episode.title as any)[language] || episode.title.en}
                                        </h4>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className={cn(
                                          "text-xs",
                                          (isViewed || isCompleted) ? "text-red-600/80" : "text-muted-foreground"
                                        )}>
                                          Episode {episode.episodeNumber}
                                        </p>
                                        {episode.duration && (
                                          <>
                                            <span className={cn(
                                              "text-xs",
                                              (isViewed || isCompleted) ? "text-red-600/80" : "text-muted-foreground"
                                            )}>•</span>
                                            <p className={cn(
                                              "text-xs",
                                              (isViewed || isCompleted) ? "text-red-600/80" : "text-muted-foreground"
                                            )}>
                                              {Math.floor(episode.duration / 60)}:{(episode.duration % 60).toString().padStart(2, '0')}
                                            </p>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Related Content */}
            <div className="mt-12 max-w-5xl mx-auto space-y-12">
                {relatedCharacters.length > 0 && (
                    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary">
                              <UserSquare className="h-5 w-5" /> Key Characters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {relatedCharacters.map((character) => (
                                <Link key={character.id} href={`/characters/${character.slug}`} className="block p-4 text-center rounded-lg hover:bg-primary/10 border border-primary/20 transition-all hover:scale-105">
                                    <div className="w-24 h-24 relative mx-auto rounded-full overflow-hidden mb-2 border-2 border-accent/20">
                                        <Image src={character.imageUrl} alt={(character.name as any)[language] || character.name.en} data-ai-hint={character.imageHint} fill className="object-cover" />
                                    </div>
                                    <h4 className="font-semibold text-md text-foreground group-hover:underline">{(character.name as any)[language] || character.name.en}</h4>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {relatedTemples.length > 0 && (
                    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary">
                              <Palmtree className="h-5 w-5" /> Related Temples
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {relatedTemples.map((temple) => (
                                <Link key={temple.id} href={`/temples/${temple.slug}`} className="flex items-center gap-4 p-4 rounded-lg hover:bg-primary/10 border border-primary/20 transition-all hover:scale-[1.02]">
                                    <div className="w-20 h-20 relative rounded-lg overflow-hidden shrink-0 border-2 border-accent/20">
                                        <Image src={temple.media.images[0].url} alt={(temple.name as any)[language] || temple.name.en} data-ai-hint={temple.media.images[0].hint} fill className="object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg text-primary group-hover:underline">{(temple.name as any)[language] || temple.name.en}</h4>
                                        <p className="text-sm text-muted-foreground">{temple.location.city}, {temple.location.state}</p>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </article>
    </main>
  );
}
