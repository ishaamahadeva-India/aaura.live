'use client';

import { useParams, notFound, useSearchParams } from 'next/navigation';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useDocument, useDocumentData, useCollectionData } from 'react-firebase-hooks/firestore';
import { doc, writeBatch, arrayUnion, arrayRemove, collection, query, where, orderBy, limit, increment, serverTimestamp } from 'firebase/firestore';
import { Loader2, Trophy, Check, Circle, ExternalLink, Star, Flame, Crown, Shield, Sparkles, Clock, Users, TrendingUp, Award, BookOpen, Zap, Target, ChevronRight, ChevronLeft, Play, Pause, Share2, Heart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useTransition, useMemo, useEffect, useState } from 'react';
import { Challenge, challengeConverter } from '@/lib/challenges';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

function TaskLink({ taskType, contentId, challengeId, day }: { taskType: string, contentId: string, challengeId: string, day: number }) {
    let href = '#';
    if (taskType === 'read-story') {
        href = `/stories/${contentId}`;
    } else if (taskType === 'watch-media') {
        href = `/watch/${contentId}?challengeId=${challengeId}&day=${day}`;
    } else if (taskType === 'perform-ritual') {
        href = `/rituals/${contentId}`;
    } else if (taskType === 'visit-temple') {
        href = `/temples/${contentId}`;
    }
    
    if (taskType === 'recite-mantra' || taskType === 'meditation' || taskType === 'prayer') {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="italic">{contentId}</span>
            </div>
        );
    }
    return (
        <Button variant="link" size="sm" asChild className="p-0 h-auto">
            <Link href={href} target={taskType !== 'perform-ritual' && taskType !== 'visit-temple' ? '_blank' : undefined}>
                View Task <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
        </Button>
    );
}

export default function ChallengeDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const db = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const [isJoining, startJoinTransition] = useTransition();
    const [activeTab, setActiveTab] = useState('tasks');

    const challengeRef = useMemo(() => db ? doc(db, 'challenges', id).withConverter(challengeConverter) : null, [db, id]);
    const [challengeSnapshot, isLoadingChallenge, challengeError] = useDocument(challengeRef);
    const challenge = challengeSnapshot?.data();

    const progressRef = useMemo(() => user ? doc(db, `users/${user.uid}/challenges`, id) : null, [user, db, id]);
    const [progress, isLoadingProgress, progressError] = useDocumentData(progressRef);

    // Get leaderboard
    const leaderboardQuery = useMemo(() => {
        if (!db) return undefined;
        return query(
            collection(db, 'users'),
            where('completedChallenges', 'array-contains', id),
            orderBy('challengeCompletionTime', 'asc'),
            limit(10)
        );
    }, [db, id]);
    const [leaderboard, loadingLeaderboard] = useCollectionData(leaderboardQuery, { idField: 'id' });

    // Check for auto-completion from query params
    useEffect(() => {
        const completedDay = searchParams.get('completedDay');
        if (completedDay && progress && !progress.completedTasks?.includes(Number(completedDay))) {
            handleTaskToggle(Number(completedDay), true, true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, progress]);

    useEffect(() => {
        if(challengeError) {
             const permissionError = new FirestorePermissionError({ path: challengeRef!.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
        }
        if(progressError) {
             const permissionError = new FirestorePermissionError({ path: progressRef!.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
        }
    }, [challengeError, progressError, challengeRef, progressRef]);

    const handleJoinChallenge = () => {
        if (!user || !progressRef || !challengeRef) {
            toast({ variant: 'destructive', title: 'You must be logged in to join.' });
            return;
        }
        startJoinTransition(async () => {
            const batch = writeBatch(db);
            const progressData = {
                challengeId: id,
                startedAt: serverTimestamp(),
                completedTasks: [],
                isCompleted: false,
                currentDay: 1,
            };

            if (progress) { // Leaving the challenge
                batch.delete(progressRef);
                batch.update(challengeRef, { participantCount: increment(-1) });
            } else { // Joining the challenge
                batch.set(progressRef, progressData);
                batch.update(challengeRef, { participantCount: increment(1) });
            }
             try {
                await batch.commit();
                toast({ 
                    title: progress ? 'You have left the challenge.' : 'Challenge Joined!', 
                    description: progress ? 'Your progress has been saved.' : 'Embark on your mythological journey. May the divine guide you!' 
                });
            } catch (error) {
                const permissionError = new FirestorePermissionError({
                    path: progressRef.path,
                    operation: progress ? 'delete' : 'create',
                    requestResourceData: progress ? undefined : progressData,
                });
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    }

     const handleTaskToggle = async (day: number, isCompleted: boolean, silent = false) => {
        if (!user || !progressRef || !challengeRef) return;
        
        const batch = writeBatch(db);
        const taskData = { completedTasks: isCompleted ? arrayUnion(day) : arrayRemove(day) };
        
        // Update progress
        const completedTasks = progress?.completedTasks || [];
        const newCompletedTasks = isCompleted 
            ? [...completedTasks, day]
            : completedTasks.filter((d: number) => d !== day);
        
        const progressPercentage = (newCompletedTasks.length / (challenge?.durationDays || 1)) * 100;
        const isChallengeCompleted = newCompletedTasks.length === challenge?.durationDays;
        
        batch.update(progressRef, {
            ...taskData,
            progress: progressPercentage,
            currentDay: Math.max(...newCompletedTasks, 0) + 1,
            isCompleted: isChallengeCompleted,
            completedAt: isChallengeCompleted ? serverTimestamp() : null,
        });

        // If challenge completed, add to user's completed challenges
        if (isChallengeCompleted && user) {
            const userRef = doc(db, 'users', user.uid);
            batch.update(userRef, {
                completedChallenges: arrayUnion(id),
                challengeCompletionTime: serverTimestamp(),
            });

            // Award badge
            if (challenge?.badgeId) {
                const badgeRef = doc(db, `users/${user.uid}/badges`, challenge.badgeId);
                batch.set(badgeRef, {
                    badgeId: challenge.badgeId,
                    challengeId: id,
                    earnedAt: serverTimestamp(),
                    name: (challenge as any).badgeName || challenge.badgeId,
                });
            }
        }
        
        try {
            await batch.commit();
            if (!silent) {
                if (isChallengeCompleted) {
                    toast({ 
                        title: "🎉 Challenge Completed!", 
                        description: `You've earned the '${(challenge as any).badgeName || challenge.badgeId}' badge!`,
                        variant: 'default',
                    });
                } else {
                    toast({ title: isCompleted ? "✓ Task Completed!" : "Task marked incomplete." });
                }
            }
        } catch (error) {
            if (!silent) {
                const permissionError = new FirestorePermissionError({
                    path: progressRef.path,
                    operation: 'update',
                    requestResourceData: taskData,
                });
                errorEmitter.emit('permission-error', permissionError);
            }
        }
    }

    const handleShare = async () => {
        const shareData = {
            title: challenge?.title_en || 'Challenge',
            text: `Join me in this epic challenge: ${challenge?.title_en}`,
            url: window.location.href,
        };

        try {
            if (navigator.share && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast({
                    title: 'Link copied!',
                    description: 'Challenge link copied to clipboard.',
                });
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (isLoadingChallenge || isLoadingProgress) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin" /></div>
    }

    if (!challenge) {
        return notFound();
    }

    const completedTasksSet = new Set(progress?.completedTasks || []);
    const isChallengeCompleted = completedTasksSet.size === challenge.durationDays;
    const progressPercentage = progress?.progress || (completedTasksSet.size / challenge.durationDays) * 100;
    const category = (challenge as any).category || 'epic-saga';
    const difficulty = (challenge as any).difficulty || 'beginner';
    const participantCount = (challenge as any).participantCount || 0;
    const story = (challenge as any).story || '';
    const rewards = (challenge as any).rewards || [];
    const deity = (challenge as any).deity || null;
    const epicHero = (challenge as any).epicHero || null;

    // Get mythological theme colors
    const themeColors = {
        'epic-saga': { primary: 'purple', gradient: 'from-purple-500/20 to-purple-600/10' },
        'deity-worship': { primary: 'yellow', gradient: 'from-yellow-500/20 to-yellow-600/10' },
        'ritual': { primary: 'orange', gradient: 'from-orange-500/20 to-orange-600/10' },
        'meditation': { primary: 'blue', gradient: 'from-blue-500/20 to-blue-600/10' },
        'knowledge': { primary: 'green', gradient: 'from-green-500/20 to-green-600/10' },
    };
    const theme = themeColors[category as keyof typeof themeColors] || themeColors['epic-saga'];

    return (
        <main className="container mx-auto py-8 px-4">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Hero Section */}
                <Card className={cn("bg-gradient-to-br", theme.gradient, "border-primary/20 overflow-hidden relative")}>
                    <div className="absolute inset-0 opacity-5">
                        <div className="w-full h-full bg-[url('/pattern.svg')] bg-repeat" />
                    </div>
                    <CardHeader className="relative z-10 text-center pb-4">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <Trophy className="h-16 w-16 text-primary animate-pulse" />
                            <div>
                                <CardTitle className="text-4xl md:text-5xl font-headline font-bold text-primary mb-2">
                                    {challenge.title_en}
                                </CardTitle>
                                <CardDescription className="text-lg mt-2">
                                    {challenge.description_en}
                                </CardDescription>
                            </div>
                        </div>
                        
                        {/* Challenge Info */}
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                                <Clock className="h-4 w-4 mr-1" />
                                {challenge.durationDays} Days
                            </Badge>
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                                <Target className="h-4 w-4 mr-1" />
                                {challenge.tasks.length} Tasks
                            </Badge>
                            <Badge variant={difficulty === 'beginner' ? 'default' : difficulty === 'intermediate' ? 'secondary' : 'destructive'} className="text-sm px-3 py-1">
                                {difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-sm px-3 py-1">
                                <Users className="h-4 w-4 mr-1" />
                                {participantCount.toLocaleString()} Participants
                            </Badge>
                            {deity && (
                                <Badge variant="outline" className="text-sm px-3 py-1">
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    {deity}
                                </Badge>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {progress && (
                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Your Progress</span>
                                    <span>{Math.round(progressPercentage)}% Complete</span>
                                </div>
                                <Progress value={progressPercentage} className="h-3" />
                                <p className="text-xs text-muted-foreground text-center mt-1">
                                    {completedTasksSet.size} of {challenge.durationDays} tasks completed
                                </p>
                            </div>
                        )}
                    </CardHeader>
                </Card>

                {/* Mythological Story */}
                {story && (
                    <Card className="bg-gradient-to-r from-accent/10 to-background border-accent/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-accent" />
                                The Epic Journey
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-lg font-serif italic">
                                {story}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="tasks">Tasks</TabsTrigger>
                        <TabsTrigger value="rewards">Rewards</TabsTrigger>
                        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                    </TabsList>

                    {/* Tasks Tab */}
                    <TabsContent value="tasks" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5" />
                                    Your Journey
                                </CardTitle>
                                <CardDescription>
                                    Complete each task to progress through the challenge
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {challenge.tasks.sort((a,b) => a.day - b.day).map(task => {
                                    const isCompleted = completedTasksSet.has(task.day);
                                    const isCurrentDay = progress?.currentDay === task.day;
                                    const canAccess = !progress || isCompleted || task.day === progress.currentDay || task.day <= (progress.currentDay || 1);

                                    return (
                                        <div 
                                            key={task.day} 
                                            className={cn(
                                                "flex items-start gap-4 p-4 rounded-lg border transition-all",
                                                isCompleted 
                                                    ? 'bg-green-500/10 border-green-500/30' 
                                                    : isCurrentDay
                                                    ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                                                    : !canAccess
                                                    ? 'bg-secondary/30 border-border opacity-60'
                                                    : 'bg-secondary/50 border-border hover:border-primary/50'
                                            )}
                                        >
                                            <div className="relative mt-1">
                                                <Checkbox
                                                    id={`task-${task.day}`}
                                                    checked={isCompleted}
                                                    onCheckedChange={(checked) => handleTaskToggle(task.day, !!checked)}
                                                    disabled={!progress || !canAccess}
                                                    className="h-5 w-5"
                                                />
                                                {isCurrentDay && !isCompleted && (
                                                    <div className="absolute -inset-1 bg-primary/20 rounded-full animate-pulse" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <label 
                                                            htmlFor={`task-${task.day}`} 
                                                            className={cn(
                                                                "font-semibold cursor-pointer flex items-center gap-2",
                                                                isCompleted && "text-green-600",
                                                                isCurrentDay && "text-primary"
                                                            )}
                                                        >
                                                            <span className="text-primary font-bold">Day {task.day}</span>
                                                            {isCurrentDay && !isCompleted && (
                                                                <Badge variant="default" className="text-xs">
                                                                    Current
                                                                </Badge>
                                                            )}
                                                            {!canAccess && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Locked
                                                                </Badge>
                                                            )}
                                                        </label>
                                                        <p className="text-sm font-medium mt-1">{task.title}</p>
                                                    </div>
                                                    {isCompleted && (
                                                        <Check className="h-6 w-6 text-green-500 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="mt-2">
                                                    <TaskLink 
                                                        taskType={task.taskType} 
                                                        contentId={task.contentId} 
                                                        challengeId={id} 
                                                        day={task.day} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Rewards Tab */}
                    <TabsContent value="rewards" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-yellow-500" />
                                    Divine Rewards
                                </CardTitle>
                                <CardDescription>
                                    Unlock these rewards upon completing the challenge
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-4">
                                                <Crown className="h-12 w-12 text-yellow-500" />
                                                <div>
                                                    <h3 className="font-bold text-lg">Badge</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {(challenge as any).badgeName || challenge.badgeId}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    {rewards.map((reward: any, index: number) => (
                                        <Card key={index} className="bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30">
                                            <CardContent className="pt-6">
                                                <div className="flex items-center gap-4">
                                                    <Award className="h-12 w-12 text-primary" />
                                                    <div>
                                                        <h3 className="font-bold text-lg">{reward.name}</h3>
                                                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Leaderboard Tab */}
                    <TabsContent value="leaderboard" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Champions of the Realm
                                </CardTitle>
                                <CardDescription>
                                    Top performers who have completed this challenge
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingLeaderboard ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="animate-spin h-6 w-6" />
                                    </div>
                                ) : leaderboard && leaderboard.length > 0 ? (
                                    <div className="space-y-3">
                                        {leaderboard.map((user: any, index: number) => (
                                            <div 
                                                key={user.id} 
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-lg border",
                                                    index === 0 && "bg-yellow-500/10 border-yellow-500/30",
                                                    index === 1 && "bg-gray-400/10 border-gray-400/30",
                                                    index === 2 && "bg-orange-500/10 border-orange-500/30",
                                                    index > 2 && "bg-secondary/50 border-border"
                                                )}
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                                                        index === 0 && "bg-yellow-500 text-white",
                                                        index === 1 && "bg-gray-400 text-white",
                                                        index === 2 && "bg-orange-500 text-white",
                                                        index > 2 && "bg-secondary text-foreground"
                                                    )}>
                                                        {index + 1}
                                                    </div>
                                                    <Avatar>
                                                        <AvatarImage src={user.photoURL} />
                                                        <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="font-semibold">{user.displayName || 'Anonymous'}</p>
                                                        {user.challengeCompletionTime && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Completed {formatDistanceToNow(user.challengeCompletionTime.toDate(), { addSuffix: true })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {index < 3 && (
                                                    <Crown className={cn(
                                                        "h-6 w-6",
                                                        index === 0 && "text-yellow-500",
                                                        index === 1 && "text-gray-400",
                                                        index === 2 && "text-orange-500"
                                                    )} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>Be the first to complete this challenge!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <Card>
                    <CardFooter className="flex flex-col sm:flex-row gap-4">
                        {user && (
                            <>
                                {isChallengeCompleted ? (
                                    <div className="w-full p-4 bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 rounded-lg border border-yellow-500/30 text-center">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <Crown className="h-6 w-6 text-yellow-500" />
                                            <p className="font-bold text-lg text-yellow-600">
                                                Congratulations! You've completed this epic challenge!
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            You've earned the '<strong>{(challenge as any).badgeName || challenge.badgeId}</strong>' badge!
                                        </p>
                                    </div>
                                ) : (
                                    <Button 
                                        onClick={handleJoinChallenge} 
                                        disabled={isJoining} 
                                        className="w-full sm:flex-1 text-lg h-12"
                                        size="lg"
                                    >
                                        {isJoining ? (
                                            <>
                                                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                                {progress ? 'Leaving...' : 'Joining...'}
                                            </>
                                        ) : (
                                            <>
                                                {progress ? (
                                                    <>
                                                        <Circle className="mr-2 h-5 w-5"/>
                                                        Leave Challenge
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trophy className="mr-2 h-5 w-5"/>
                                                        Join Epic Challenge
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Button>
                                )}
                                <Button 
                                    variant="outline" 
                                    onClick={handleShare}
                                    className="w-full sm:w-auto h-12"
                                >
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share Challenge
                                </Button>
                            </>
                        )}
                        {!user && (
                            <Button asChild className="w-full h-12" size="lg">
                                <Link href="/login">
                                    <Trophy className="mr-2 h-5 w-5" />
                                    Login to Join Challenge
                                </Link>
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </main>
    );
}
