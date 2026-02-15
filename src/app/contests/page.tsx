'use client';

import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useCollection, useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, doc, writeBatch, serverTimestamp, increment, DocumentData, Timestamp, addDoc, limit, orderBy, where } from 'firebase/firestore';
import { 
  Loader2, Trophy, Send, Calendar, Share2, Info, TrendingUp, Flame, Crown, Users, Heart, Zap, 
  Award, Target, Clock, Sparkles, ChevronRight, Facebook, Twitter, MessageCircle, Link2, Copy, 
  CheckCircle2, Star, Gift, UserPlus, BarChart3, Eye, Search, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useTransition, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

function RecentChants({ contestId, limitCount = 10 }: { contestId: string, limitCount?: number }) {
    const db = useFirestore();
    // Fetch without orderBy to avoid index requirements - sort client-side
    const recentChantsQuery = useMemo(() => {
        if (!db || !contestId) return null;
        return query(
            collection(db, `contests/${contestId}/chants`), 
            limit(limitCount * 3) // Fetch more to sort client-side
        );
    }, [db, contestId, limitCount]);
    
    const [recentChants, loading, error] = useCollection(recentChantsQuery);

    const sortedChants = useMemo(() => {
        if (!recentChants) return [];
        
        const chants = recentChants.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt || new Date(0),
        }));
        
        // Sort by date client-side
        return chants
            .sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (typeof a.createdAt === 'number' ? a.createdAt : 0);
                const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (typeof b.createdAt === 'number' ? b.createdAt : 0);
                return dateB - dateA;
            })
            .slice(0, limitCount);
    }, [recentChants, limitCount]);

    if (loading) {
        return <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    if (error) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Unable to load recent chants.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sortedChants && sortedChants.length > 0 ? sortedChants.map((chant: any) => {
                return (
                    <div 
                        key={chant.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all group"
                    >
                        <Avatar className="h-10 w-10 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                            <AvatarImage src={chant.userPhotoURL || `https://picsum.photos/seed/${chant.authorId}/40`} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {chant.username?.[0]?.toUpperCase() || 'A'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground truncate">@{chant.username || 'Anonymous'}</p>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Chanted
                                </Badge>
                            </div>
                            <p className="text-sm text-primary font-medium mt-1">{chant.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {chant.createdAt ? formatDistanceToNow(chant.createdAt instanceof Date ? chant.createdAt : new Date(chant.createdAt), { addSuffix: true }) : 'just now'}
                            </p>
                        </div>
                    </div>
                );
            }) : (
                <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chants yet. Be the first to participate!</p>
                </div>
            )}
        </div>
    );
}

function Leaderboard({ contestId }: { contestId: string }) {
    const db = useFirestore();
    // Fetch without orderBy to avoid index requirements - sort client-side
    const leaderboardQuery = useMemo(() => {
        if (!db || !contestId) return null;
        return query(
            collection(db, `contests/${contestId}/leaderboard`),
            limit(50) // Fetch more to sort client-side
        );
    }, [db, contestId]);
    
    const [leaderboard, loading, error] = useCollectionData(leaderboardQuery, { idField: 'id' });

    const sortedLeaderboard = useMemo(() => {
        if (!leaderboard) return [];
        return [...leaderboard]
            .sort((a: any, b: any) => (b.chants || 0) - (a.chants || 0))
            .slice(0, 20);
    }, [leaderboard]);

    if (loading) {
        return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    if (error) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Unable to load leaderboard.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sortedLeaderboard && sortedLeaderboard.length > 0 ? sortedLeaderboard.map((user: any, index: number) => (
                <div 
                    key={user.id || index}
                    className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border transition-all",
                        index === 0 && "bg-primary/10 border-primary/30",
                        index === 1 && "bg-primary/8 border-primary/25",
                        index === 2 && "bg-primary/6 border-primary/20",
                        index > 2 && "bg-secondary/30 border-border/50 hover:border-primary/30"
                    )}
                >
                    <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border-2",
                            index === 0 && "bg-primary text-primary-foreground border-primary",
                            index === 1 && "bg-primary/80 text-primary-foreground border-primary/80",
                            index === 2 && "bg-primary/60 text-primary-foreground border-primary/60",
                            index > 2 && "bg-secondary text-foreground border-border"
                        )}>
                            {index + 1}
                        </div>
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{user.displayName || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">@{user.username || 'user'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-sm">
                                <Target className="h-3 w-3 mr-1" />
                                {user.chants || 0} chants
                            </Badge>
                        </div>
                    </div>
                    {index < 3 && (
                        <Crown className={cn(
                            "h-6 w-6 shrink-0 text-primary",
                            index === 0 && "text-primary",
                            index === 1 && "text-primary/80",
                            index === 2 && "text-primary/60"
                        )} />
                    )}
                </div>
            )) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Leaderboard will appear as participants join!</p>
                </div>
            )}
        </div>
    );
}

function ContestContent({ contest }: { contest: DocumentData }) {
    const db = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isChanting, startChantTransition] = useTransition();
    const [user] = useAuthState(auth);
    const [copied, setCopied] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [userStats, setUserStats] = useState<any>(null);
    const [userStreak, setUserStreak] = useState(0);
    const [realTimeCount, setRealTimeCount] = useState(contest.totalChants || 0);
    const [isAnimating, setIsAnimating] = useState(false);
    const countRef = useRef(contest.totalChants || 0);

    // Real-time count updates
    useEffect(() => {
        setRealTimeCount(contest.totalChants || 0);
        countRef.current = contest.totalChants || 0;
    }, [contest.totalChants]);

    // Get user's contest progress
    const userProgressRef = useMemo(() => {
        if (!user || !db || !contest?.id) return null;
        return doc(db, `users/${user.uid}/contestProgress`, contest.id);
    }, [user, db, contest?.id]);
    
    const [userProgress, userProgressLoading, userProgressError] = useDocumentData(userProgressRef, { idField: 'id' });

    useEffect(() => {
        if (userProgress) {
            setUserStats({
                chants: userProgress.chants || 0,
                lastChantedAt: userProgress.lastChantedAt,
                rank: userProgress.rank || null,
            });
            
            // Calculate streak
            if (userProgress.lastChantedAt) {
                try {
                    const lastChant = userProgress.lastChantedAt?.toDate?.() || 
                                     (userProgress.lastChantedAt instanceof Date ? userProgress.lastChantedAt : 
                                     (userProgress.lastChantedAt?.seconds ? new Date(userProgress.lastChantedAt.seconds * 1000) : null));
                    
                    if (lastChant) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const lastChantDay = new Date(lastChant);
                        lastChantDay.setHours(0, 0, 0, 0);
                        const daysDiff = Math.floor((today.getTime() - lastChantDay.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (daysDiff === 0) {
                            setUserStreak(userProgress.streak || 1);
                        } else if (daysDiff === 1) {
                            setUserStreak(userProgress.streak || 1);
                        } else {
                            setUserStreak(0);
                        }
                    }
                } catch (err) {
                    console.error('Error calculating streak:', err);
                    setUserStreak(0);
                }
            } else {
                setUserStreak(0);
            }
        } else {
            setUserStats(null);
            setUserStreak(0);
        }
    }, [userProgress]);

    const expectedMantra = contest.mantra || "Jai Shri Ram";
    
    const chantSchema = z.object({
        mantra: z.literal(expectedMantra, { errorMap: () => ({ message: `Mantra must be "${expectedMantra}".` }) }),
    });
    type ChantFormValues = z.infer<typeof chantSchema>;

    const form = useForm<ChantFormValues>({
        resolver: zodResolver(chantSchema),
        defaultValues: { mantra: expectedMantra },
    });
    
    useEffect(() => {
        form.reset({ mantra: expectedMantra });
    }, [expectedMantra, form]);

    const handleChant = (data: ChantFormValues) => {
        const currentUser = auth.currentUser;
        if (!currentUser || !user || !db || !contest?.id) {
            toast({ variant: 'destructive', title: 'You must be logged in to chant.' });
            return;
        }
        
        // Define contestRef outside the async function to ensure it's in scope
        const contestRef = doc(db, 'contests', contest.id);
        
        startChantTransition(async () => {
            try {
                const chantsCollectionRef = collection(db, `contests/${contest.id}/chants`);
                const contestProgressRef = doc(db, `users/${currentUser.uid}/contestProgress`, contest.id);
                const leaderboardRef = doc(db, `contests/${contest.id}/leaderboard`, currentUser.uid);
                
                if (!chantsCollectionRef || !contestProgressRef || !leaderboardRef) {
                    throw new Error('Failed to create Firestore references');
                }
                
                const chantData = {
                    authorId: currentUser.uid,
                    username: user.displayName || 'anonymous',
                    userPhotoURL: user.photoURL || null,
                    text: data.mantra || expectedMantra,
                    createdAt: serverTimestamp(),
                };

                const batch = writeBatch(db);
                
                // Create a new chant document
                const newChantRef = doc(chantsCollectionRef);
                batch.set(newChantRef, chantData);
                
                // Update contest total - increment totalChants and add updatedAt
                // Note: Firestore rules allow updates to totalChants and updatedAt
                batch.update(contestRef, { 
                    totalChants: increment(1),
                    updatedAt: serverTimestamp()
                });
                
                // Update user progress
                const currentChants = userStats?.chants || 0;
                const newChantCount = currentChants + 1;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                let lastChantDay: Date | null = null;
                try {
                    if (userStats?.lastChantedAt) {
                        const lastChantDate = userStats.lastChantedAt?.toDate?.() || 
                                             (userStats.lastChantedAt instanceof Date ? userStats.lastChantedAt : 
                                             (userStats.lastChantedAt?.seconds ? new Date(userStats.lastChantedAt.seconds * 1000) : null));
                        if (lastChantDate) {
                            lastChantDay = new Date(lastChantDate);
                            lastChantDay.setHours(0, 0, 0, 0);
                        }
                    }
                } catch (err) {
                    console.error('Error parsing lastChantedAt:', err);
                }
                
                const isNewDay = !lastChantDay || lastChantDay.getTime() !== today.getTime();
                const newStreak = isNewDay ? (userStreak >= 1 ? userStreak + 1 : 1) : userStreak;
                
                batch.set(contestProgressRef, {
                    chants: newChantCount,
                    lastChantedAt: serverTimestamp(),
                    streak: newStreak,
                    contestId: contest.id,
                    username: user.displayName || 'anonymous',
                    photoURL: user.photoURL || null,
                }, { merge: true });
                
                // Update leaderboard
                batch.set(leaderboardRef, {
                    userId: currentUser.uid,
                    displayName: user.displayName || 'anonymous',
                    username: user.displayName?.toLowerCase().replace(/\s+/g, '') || 'anonymous',
                    photoURL: user.photoURL || null,
                    chants: newChantCount,
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                await batch.commit();
                
                // Animate count
                setIsAnimating(true);
                setRealTimeCount(prev => prev + 1);
                setTimeout(() => setIsAnimating(false), 500);
                
                toast({ 
                    title: '🎉 Chant Submitted!', 
                    description: `You've contributed ${newChantCount} chants! ${newStreak > 1 ? `🔥 ${newStreak} day streak!` : ''}`,
                });
                
                // Update user stats
                setUserStats({
                    chants: newChantCount,
                    lastChantedAt: new Date(),
                    rank: userStats?.rank || null,
                });
                setUserStreak(newStreak);
                
                form.reset();
            } catch (error: any) {
                console.error('Firestore Error:', error);
                const errorMessage = error?.message || 'Unknown error occurred';
                
                // Check if it's a permission error
                if (error?.code === 'permission-denied') {
                    try {
                        const permissionError = new FirestorePermissionError({
                            path: contestRef?.path || `contests/${contest.id}`,
                            operation: 'update',
                            requestResourceData: { totalChants: increment(1) },
                        });
                        errorEmitter.emit('permission-error', permissionError);
                    } catch (err) {
                        console.error('Error emitting permission error:', err);
                    }
                }
                
                toast({ 
                    variant: 'destructive', 
                    title: 'Failed to submit chant.', 
                    description: errorMessage 
                });
            }
        });
    };

    const handleShare = async (platform?: string) => {
        const pageUrl = window.location.href;
        const message = `Join the "${contest?.title || 'Contest'}" contest on Aaura! Let's chant together for a cause. ${pageUrl}`;
        
        try {
            if (platform === 'whatsapp') {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            } else if (platform === 'facebook') {
                const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
                window.open(facebookUrl, '_blank', 'noopener,noreferrer');
            } else if (platform === 'twitter') {
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(pageUrl)}`;
                window.open(twitterUrl, '_blank', 'noopener,noreferrer');
            } else if (platform === 'copy') {
                await navigator.clipboard.writeText(pageUrl);
                setCopied(true);
                toast({ title: 'Link copied!', description: 'Contest link copied to clipboard.' });
                setTimeout(() => setCopied(false), 2000);
            } else {
                // Native share
                if (navigator.share) {
                    await navigator.share({
                        title: contest.title,
                        text: message,
                        url: pageUrl,
                    });
                } else {
                    await navigator.clipboard.writeText(pageUrl);
                    setCopied(true);
                    toast({ title: 'Link copied!', description: 'Contest link copied to clipboard.' });
                    setTimeout(() => setCopied(false), 2000);
                }
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const progressPercentage = contest?.goal ? Math.min((realTimeCount / contest.goal) * 100, 100) : 0;
    const isCompleted = contest?.status === 'completed' || progressPercentage >= 100;
    const createdAtDate = contest?.createdAt?.toDate ? format(contest.createdAt.toDate(), 'MMMM d, yyyy') : 
                         (contest?.createdAt instanceof Date ? format(contest.createdAt, 'MMMM d, yyyy') : 
                         (contest?.createdAt?.seconds ? format(new Date(contest.createdAt.seconds * 1000), 'MMMM d, yyyy') : 'Recently'));
    const remainingChants = contest?.goal ? Math.max(contest.goal - realTimeCount, 0) : 0;
    
    // Calculate milestones
    const milestones = [
        { percentage: 25, label: '25%', icon: Star },
        { percentage: 50, label: '50%', icon: Award },
        { percentage: 75, label: '75%', icon: Trophy },
        { percentage: 100, label: '100%', icon: Crown },
    ];
    const nextMilestone = milestones.find(m => m.percentage > progressPercentage) || milestones[milestones.length - 1];
    
    return (
        <Card className="w-full max-w-5xl shadow-2xl overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/5">
            {/* Hero Section with Image */}
            <div className="relative h-80 w-full overflow-hidden">
                <Image 
                    src={contest?.imageUrl || `https://picsum.photos/seed/${contest?.id || 'contest'}/1200/600`} 
                    alt={contest?.title || 'Contest'}
                    data-ai-hint={contest?.imageHint || "spiritual event"}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                
                {/* Floating Share Button */}
                <div className="absolute top-4 right-4 z-10">
                    <div className="relative">
                        <Button 
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            variant="secondary" 
                            size="sm"
                            className="bg-background/90 backdrop-blur-sm hover:bg-background border-2 border-primary/30"
                        >
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                        
                        {/* Share Menu Dropdown */}
                        {showShareMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-20 p-2 space-y-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleShare('whatsapp')}
                                >
                                    <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                                    WhatsApp
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleShare('facebook')}
                                >
                                    <Facebook className="mr-2 h-4 w-4 text-blue-500" />
                                    Facebook
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleShare('twitter')}
                                >
                                    <Twitter className="mr-2 h-4 w-4 text-primary" />
                                    Twitter
                                </Button>
                                <Separator />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleShare('copy')}
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy Link
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Contest Info Overlay */}
                <div className="absolute bottom-6 left-6 right-6 z-10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary mb-2 drop-shadow-lg">
                                {contest?.title || 'Contest'}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {createdAtDate}
                                </Badge>
                                {contest?.status === 'active' && (
                                    <Badge variant="default" className="bg-primary text-primary-foreground">
                                        <Zap className="h-3 w-3 mr-1" />
                                        Active
                                    </Badge>
                                )}
                                {isCompleted && (
                                    <Badge variant="default" className="bg-primary/80 text-primary-foreground">
                                        <Crown className="h-3 w-3 mr-1" />
                                        Completed
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CardHeader className="text-center pb-4">
                <CardDescription className="text-lg max-w-3xl mx-auto">
                    {contest.description || "Join the community in a collective chant!"}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-muted-foreground mb-1">Total Chants</p>
                                    <p className={cn(
                                        "text-2xl md:text-3xl lg:text-4xl font-bold text-primary transition-all break-words",
                                        isAnimating && "scale-110 animate-pulse"
                                    )}>
                                        {realTimeCount.toLocaleString()}
                                    </p>
                                </div>
                                <Target className="h-10 w-10 md:h-12 md:w-12 text-primary/30 shrink-0" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-muted-foreground mb-1">Goal</p>
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary break-words">
                                        {contest.goal.toLocaleString()}
                                    </p>
                                </div>
                                <Trophy className="h-10 w-10 md:h-12 md:w-12 text-primary/30 shrink-0" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary break-words">
                                        {remainingChants.toLocaleString()}
                                    </p>
                                </div>
                                <Clock className="h-10 w-10 md:h-12 md:w-12 text-primary/30 shrink-0" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Progress Bar with Milestones */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Progress to Goal</p>
                            <p className="text-xs text-muted-foreground">
                                {Math.round(progressPercentage)}% Complete
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                Next: {nextMilestone.label}
                            </Badge>
                            <nextMilestone.icon className="h-4 w-4 text-primary" />
                        </div>
                    </div>
                    <div className="relative">
                <Progress value={progressPercentage} className="h-4" />
                        {/* Milestone Markers */}
                        <div className="absolute inset-0 flex justify-between px-2">
                            {milestones.map((milestone) => {
                                const reached = progressPercentage >= milestone.percentage;
                                return (
                                    <div
                                        key={milestone.percentage}
                                        className="relative"
                                        style={{ left: `${milestone.percentage - 1}%` }}
                                    >
                                        <div className={cn(
                                            "absolute -top-2 -translate-x-1/2",
                                            reached ? "text-primary" : "text-muted-foreground/50"
                                        )}>
                                            <milestone.icon className={cn(
                                                "h-4 w-4 transition-all",
                                                reached && "scale-125 animate-bounce"
                                            )} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* User Stats */}
                {user && userStats && (
                    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Your Contribution</p>
                                    <div className="flex items-center gap-4">
                                        <p className="text-2xl font-bold text-primary">
                                            {userStats.chants || 0} chants
                                        </p>
                                        {userStreak > 0 && (
                                            <Badge variant="default" className="bg-orange-500 text-white">
                                                <Flame className="h-3 w-3 mr-1" />
                                                {userStreak} day streak
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {userStats.rank && (
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground mb-1">Your Rank</p>
                                        <Badge variant="secondary" className="text-lg px-3 py-1">
                                            #{userStats.rank}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Completion Message */}
                {isCompleted && (
                    <Alert className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
                        <Crown className="h-5 w-5 text-yellow-500" />
                        <AlertTitle className="text-yellow-600 font-bold">Contest Completed! 🎉</AlertTitle>
                        <AlertDescription className="text-yellow-700">
                            Thank you for your participation! Together we achieved the goal of {contest.goal.toLocaleString()} chants!
                        </AlertDescription>
                    </Alert>
                )}

                {/* Chant Form */}
                {!isCompleted && user ? (
                    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-primary" />
                                Join the Chant
                            </CardTitle>
                            <CardDescription>
                                Chant the mantra below to contribute to the collective goal
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                    <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleChant)} className="space-y-4">
                             <FormField
                                control={form.control}
                                name="mantra"
                                render={({ field }) => (
                                            <FormItem>
                                    <FormControl>
                                        <Textarea
                                            placeholder={expectedMantra}
                                                        className="resize-none text-center text-2xl font-bold h-24 bg-background/50 border-2 border-primary/30 focus:border-primary"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                                <p className="text-xs text-center text-muted-foreground">
                                                    Type exactly: <strong className="text-primary">{expectedMantra}</strong>
                                                </p>
                                    </FormItem>
                                )}
                            />
                                    <Button 
                                        type="submit" 
                                        size="lg" 
                                        disabled={isChanting}
                                        className="w-full text-lg h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                                    >
                                        {isChanting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-5 w-5" />
                                                Submit Chant
                                            </>
                                        )}
                            </Button>
                        </form>
                    </Form>
                        </CardContent>
                    </Card>
                ) : !user ? (
                    <Card className="bg-secondary/50 border-border">
                        <CardContent className="pt-6 text-center">
                            <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground mb-4">Please log in to participate in the contest</p>
                            <Button asChild>
                                <Link href="/login">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Login to Participate
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Tabs for Activity and Leaderboard */}
                <Tabs defaultValue="activity" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="activity">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Live Activity
                        </TabsTrigger>
                        <TabsTrigger value="leaderboard">
                            <Trophy className="h-4 w-4 mr-2" />
                            Leaderboard
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="activity" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-primary" />
                                    Recent Chants
                                </CardTitle>
                                <CardDescription>See who's participating in real-time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RecentChants contestId={contest.id} limitCount={15} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="leaderboard" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Crown className="h-5 w-5 text-yellow-500" />
                                    Top Contributors
                                </CardTitle>
                                <CardDescription>See who's leading the contest</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Leaderboard contestId={contest.id} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

export default function ContestsPage() {
    const db = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'progress'>('newest');

    // Use a simple query without orderBy to avoid index requirements
    // We'll do all sorting client-side
    const contestsQuery = useMemo(() => {
        if (!db) return null;
        // Always fetch all contests without orderBy - we'll sort client-side
        // This avoids index requirements and works reliably
        return query(collection(db, 'contests'));
    }, [db]);

    const [snapshot, loading, error] = useCollection(contestsQuery);

    const contests = useMemo(() => {
        if (!snapshot) return [];
        
        // Map all documents first
        let filtered = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Normalize dates for sorting
                createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(0),
            };
        });
        
        // Filter active contests only
        filtered = filtered.filter((contest: any) => {
            const status = contest.status?.toLowerCase?.() || contest.status || '';
            return status === 'active' || status === '' || !contest.status;
        });
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((contest: any) => {
                const title = (contest.title || '').toLowerCase();
                const description = (contest.description || '').toLowerCase();
                return title.includes(query) || description.includes(query);
            });
        }
        
        // Client-side sorting (always done client-side to avoid index requirements)
        if (sortBy === 'newest') {
            filtered.sort((a: any, b: any) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt?.toDate?.() || new Date(0));
                const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt?.toDate?.() || new Date(0));
                const timeA = dateA instanceof Date ? dateA.getTime() : (typeof dateA === 'number' ? dateA : 0);
                const timeB = dateB instanceof Date ? dateB.getTime() : (typeof dateB === 'number' ? dateB : 0);
                return timeB - timeA;
            });
        } else if (sortBy === 'popular') {
            filtered.sort((a: any, b: any) => {
                return (b.totalChants || 0) - (a.totalChants || 0);
            });
        } else if (sortBy === 'progress') {
            filtered.sort((a: any, b: any) => {
                const progressA = (a.totalChants || 0) / (a.goal || 1);
                const progressB = (b.totalChants || 0) / (b.goal || 1);
                return progressB - progressA;
            });
        }
        
        return filtered;
    }, [snapshot, searchQuery, sortBy]);

    // Get user's total participation stats
    const userStatsQuery = useMemo(() => {
        if (!user || !db) return null;
        return query(collection(db, `users/${user.uid}/contestProgress`));
    }, [user, db]);
    const [userStats] = useCollectionData(userStatsQuery);
    
    const totalUserChants = useMemo(() => {
        if (!userStats) return 0;
        return userStats.reduce((sum: number, stat: any) => sum + (stat.chants || 0), 0);
    }, [userStats]);

    // Show loading state while fetching
    if (loading && !snapshot) {
        return (
            <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading contests...</p>
                </div>
            </main>
        );
    }

    // Only show error if we have an error and no data
    if (error && (!snapshot || snapshot.docs.length === 0)) {
        return (
            <main className="flex-grow container mx-auto px-4 py-8 md:py-16 text-center">
                <Alert variant="destructive" className="max-w-md mx-auto">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Error Loading Contests</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>There was a problem fetching the contests.</p>
                        <p className="text-xs text-muted-foreground">
                            {error.message || 'Please check your internet connection and try again.'}
                        </p>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.location.reload()} 
                            className="mt-4"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </main>
        );
    }

    return (
        <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
            {/* Hero Section */}
             <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="relative">
                        <Trophy className="h-16 w-16 text-primary animate-pulse" />
                        <Sparkles className="h-8 w-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary">
                            Global Contests
                </h1>
                        <p className="text-lg text-muted-foreground mt-2">
                            Join Millions in Collective Chants
                        </p>
                    </div>
                </div>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    Participate in global chanting contests, contribute to collective goals, and be part of something bigger. 
                    Every chant counts!
                </p>
            </div>

            {/* User Stats */}
            {user && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Your Total Chants</p>
                                    <p className="text-3xl font-bold text-primary">{totalUserChants}</p>
                                </div>
                                <Target className="h-12 w-12 text-primary/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Contests</p>
                                    <p className="text-3xl font-bold text-primary">{contests.length}</p>
                                </div>
                                <Zap className="h-12 w-12 text-primary/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Your Rank</p>
                                    <p className="text-3xl font-bold text-primary">
                                        {userStats && userStats.length > 0 ? 'Top' : '--'}
                                    </p>
                                </div>
                                <Crown className="h-12 w-12 text-primary/30" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search and Sort */}
            <div className="mb-8 max-w-6xl mx-auto space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search contests by title or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 text-base"
                        />
                    </div>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                        <SelectTrigger className="w-[180px] h-12">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="popular">Most Popular</SelectItem>
                            <SelectItem value="progress">Most Progress</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Contests List */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            ) : contests.length > 0 ? (
                <div className="flex flex-col items-center gap-8 max-w-6xl mx-auto">
                    {contests.map((contest: any) => (
                    <ContestContent key={contest.id} contest={contest} />
                ))}
                </div>
            ) : (
                <Card className="w-full max-w-2xl mx-auto text-center">
                    <CardHeader>
                        <Trophy className="mx-auto h-24 w-24 text-muted-foreground/50 mb-4" />
                        <CardTitle>No Active Contests</CardTitle>
                        <CardDescription>
                            {searchQuery
                                ? "No contests match your search. Try different keywords."
                                : "Check back soon for exciting new global chant contests!"}
                        </CardDescription>
                    </CardHeader>
                    {searchQuery && (
                        <CardFooter className="justify-center">
                            <Button
                                variant="outline"
                                onClick={() => setSearchQuery('')}
                            >
                                Clear Search
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* Call to Action */}
            <div className="mt-16 text-center max-w-4xl mx-auto">
                <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
                    <CardContent className="pt-6">
                        <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                            <Gift className="h-6 w-6 text-primary" />
                            Share & Win!
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Share contests with friends and family. The more people participate, the faster we reach our goals!
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const pageUrl = window.location.href;
                                    const message = `Join the global chanting contests on Aaura! Let's chant together for a cause. ${pageUrl}`;
                                    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                                    toast({ 
                                        title: 'Opening WhatsApp...', 
                                        description: 'Share the contest with your friends!' 
                                    });
                                }}
                                className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-700 dark:text-green-300"
                            >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Share on WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    const pageUrl = window.location.href;
                                    const message = `Join me in the global chanting contests on Aaura! Let's participate together and make a difference. ${pageUrl}`;
                                    
                                    try {
                                        // Try native share API first (mobile)
                                        if (navigator.share) {
                                            await navigator.share({
                                                title: 'Join Aaura Contests',
                                                text: message,
                                                url: pageUrl,
                                            });
                                            toast({ 
                                                title: 'Invitation sent!', 
                                                description: 'Thanks for inviting your friends!' 
                                            });
                                        } else {
                                            // Fallback: copy to clipboard
                                            await navigator.clipboard.writeText(message);
                                            toast({ 
                                                title: 'Invitation link copied!', 
                                                description: 'Share it with your friends via any app!' 
                                            });
                                        }
                                    } catch (error: any) {
                                        // User cancelled or error occurred
                                        if (error.name !== 'AbortError') {
                                            // If not user cancellation, try clipboard as fallback
                                            try {
                                                await navigator.clipboard.writeText(message);
                                                toast({ 
                                                    title: 'Invitation link copied!', 
                                                    description: 'Share it with your friends!' 
                                                });
                                            } catch (clipboardError) {
                                                toast({ 
                                                    variant: 'destructive',
                                                    title: 'Failed to share', 
                                                    description: 'Please try again.' 
                                                });
                                            }
                                        }
                                    }
                                }}
                                className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite Friends
                            </Button>
                            <Badge variant="secondary" className="px-3 py-1.5">
                                <Gift className="mr-1 h-3 w-3" />
                                Earn Rewards
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
