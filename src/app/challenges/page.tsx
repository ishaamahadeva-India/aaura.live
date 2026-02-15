'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from '@/components/ui/card';
import { Trophy, Loader2, Users, Star, Flame, Crown, Shield, Sparkles, Clock, TrendingUp, Filter, Search, Award, BookOpen, Zap, Target, Calendar } from 'lucide-react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import { Challenge, challengeConverter } from '@/lib/challenges';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';

type ChallengeCategory = 'all' | 'epic-saga' | 'deity-worship' | 'ritual' | 'meditation' | 'knowledge';
type ChallengeDifficulty = 'all' | 'beginner' | 'intermediate' | 'advanced';
type SortOption = 'popularity' | 'newest' | 'duration' | 'difficulty';

// Mythological challenge themes
const challengeThemes: Record<string, { icon: typeof Trophy, color: string, gradient: string }> = {
    'epic-saga': { icon: BookOpen, color: 'text-purple-500', gradient: 'from-purple-500/20 to-purple-600/10' },
    'deity-worship': { icon: Sparkles, color: 'text-yellow-500', gradient: 'from-yellow-500/20 to-yellow-600/10' },
    'ritual': { icon: Flame, color: 'text-orange-500', gradient: 'from-orange-500/20 to-orange-600/10' },
    'meditation': { icon: Zap, color: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-600/10' },
    'knowledge': { icon: Target, color: 'text-green-500', gradient: 'from-green-500/20 to-green-600/10' },
};

export default function ChallengesPage() {
    const db = useFirestore();
    const auth = useAuth();
    const { language } = useLanguage();
    const [user] = useAuthState(auth);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ChallengeCategory>('all');
    const [difficultyFilter, setDifficultyFilter] = useState<ChallengeDifficulty>('all');
    const [sortBy, setSortBy] = useState<SortOption>('popularity');
    
    const challengesQuery = useMemo(() => {
        if (!db) return null;
        let q = query(collection(db, 'challenges').withConverter(challengeConverter));
        
        // Add sorting
        if (sortBy === 'popularity') {
            q = query(q, orderBy('participantCount', 'desc'));
        } else if (sortBy === 'newest') {
            q = query(q, orderBy('createdAt', 'desc'));
        } else if (sortBy === 'duration') {
            q = query(q, orderBy('durationDays', 'asc'));
        }
        
        return q;
    }, [db, sortBy]);
    
    const [snapshot, isLoading, error] = useCollection(challengesQuery);
    
    // Get user's challenge progress
    const userChallengesRef = useMemo(() => user ? doc(db, 'users', user.uid) : null, [user, db]);
    const [userData] = useDocumentData(userChallengesRef);

    useEffect(() => {
        if (error) {
            const permissionError = new FirestorePermissionError({
                path: challengesQuery?.path || 'challenges',
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    }, [error, challengesQuery]);

    const challenges = useMemo(() => snapshot?.docs.map(doc => doc.data()) || [], [snapshot]);
    
    // Filter and sort challenges
    const filteredChallenges = useMemo(() => {
        let filtered = [...challenges];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(challenge => {
                const title = (challenge.title_en || '').toLowerCase();
                const description = (challenge.description_en || '').toLowerCase();
                return title.includes(query) || description.includes(query);
            });
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(challenge => {
                const category = (challenge as any).category || 'epic-saga';
                return category === categoryFilter;
            });
        }

        // Difficulty filter
        if (difficultyFilter !== 'all') {
            filtered = filtered.filter(challenge => {
                const difficulty = (challenge as any).difficulty || 'beginner';
                return difficulty === difficultyFilter;
            });
        }

        // Client-side sort
        if (sortBy === 'difficulty') {
            const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
            filtered.sort((a, b) => {
                const diffA = difficultyOrder[(a as any).difficulty || 'beginner' as keyof typeof difficultyOrder] || 0;
                const diffB = difficultyOrder[(b as any).difficulty || 'beginner' as keyof typeof difficultyOrder] || 0;
                return diffA - diffB;
            });
        }

        return filtered;
    }, [challenges, searchQuery, categoryFilter, difficultyFilter, sortBy]);

    // Get user's active challenges count
    const activeChallengesCount = useMemo(() => {
        if (!userData?.activeChallenges) return 0;
        return Object.keys(userData.activeChallenges).length;
    }, [userData]);

    // Get user's completed challenges count
    const completedChallengesCount = useMemo(() => {
        if (!userData?.completedChallenges) return 0;
        return Object.keys(userData.completedChallenges).length;
    }, [userData]);

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
                            Epic Challenges
                        </h1>
                        <p className="text-lg text-muted-foreground mt-2">
                            Embark on Mythological Journeys
                        </p>
                    </div>
                </div>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    Follow in the footsteps of legendary heroes. Complete epic challenges, unlock divine rewards, and become part of the greatest mythological adventures.
                </p>
            </div>

            {/* User Stats */}
            {user && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Challenges</p>
                                    <p className="text-3xl font-bold text-blue-500">{activeChallengesCount}</p>
                                </div>
                                <Target className="h-12 w-12 text-blue-500/50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                    <p className="text-3xl font-bold text-green-500">{completedChallengesCount}</p>
                                </div>
                                <Award className="h-12 w-12 text-green-500/50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Badges Earned</p>
                                    <p className="text-3xl font-bold text-purple-500">
                                        {userData?.badges?.length || 0}
                                    </p>
                                </div>
                                <Crown className="h-12 w-12 text-purple-500/50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search and Filters */}
            <div className="mb-8 max-w-6xl mx-auto space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search challenges by name, deity, or epic..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 text-base"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ChallengeCategory)}>
                            <SelectTrigger className="w-[180px] h-12">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="epic-saga">Epic Sagas</SelectItem>
                                <SelectItem value="deity-worship">Deity Worship</SelectItem>
                                <SelectItem value="ritual">Rituals</SelectItem>
                                <SelectItem value="meditation">Meditation</SelectItem>
                                <SelectItem value="knowledge">Knowledge</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={difficultyFilter} onValueChange={(value) => setDifficultyFilter(value as ChallengeDifficulty)}>
                            <SelectTrigger className="w-[180px] h-12">
                                <SelectValue placeholder="Difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                            <SelectTrigger className="w-[180px] h-12">
                                <SelectValue placeholder="Sort By" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="popularity">Most Popular</SelectItem>
                                <SelectItem value="newest">Newest</SelectItem>
                                <SelectItem value="duration">Shortest First</SelectItem>
                                <SelectItem value="difficulty">Difficulty</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Challenges Grid */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            ) : filteredChallenges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {filteredChallenges.map(challenge => {
                        const category = (challenge as any).category || 'epic-saga';
                        const difficulty = (challenge as any).difficulty || 'beginner';
                        const theme = challengeThemes[category] || challengeThemes['epic-saga'];
                        const Icon = theme.icon;
                        const participantCount = (challenge as any).participantCount || 0;
                        const isActive = userData?.activeChallenges?.[challenge.id];
                        const isCompleted = userData?.completedChallenges?.[challenge.id];
                        const progress = userData?.challengeProgress?.[challenge.id] || 0;

                        return (
                            <Link href={`/challenges/${challenge.id}`} key={challenge.id}>
                                <Card className={cn(
                                    "h-full group hover:border-primary/80 hover:shadow-2xl transition-all duration-300 overflow-hidden relative",
                                    `bg-gradient-to-br ${theme.gradient} border-primary/20`,
                                    isActive && "ring-2 ring-primary/50",
                                    isCompleted && "ring-2 ring-green-500/50"
                                )}>
                                    {/* Featured Badge */}
                                    {(challenge as any).featured && (
                                        <div className="absolute top-3 right-3 z-10">
                                            <Badge variant="default" className="bg-yellow-500 text-white">
                                                <Star className="h-3 w-3 mr-1" />
                                                Featured
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Completion Badge */}
                                    {isCompleted && (
                                        <div className="absolute top-3 left-3 z-10">
                                            <Badge variant="default" className="bg-green-500 text-white">
                                                <Award className="h-3 w-3 mr-1" />
                                                Completed
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Mythological Art Background */}
                                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                                    </div>

                                    <CardHeader className="relative z-10">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className={cn("p-3 rounded-lg bg-background/50", theme.color)}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <Badge variant={
                                                difficulty === 'beginner' ? 'default' :
                                                difficulty === 'intermediate' ? 'secondary' : 'destructive'
                                            }>
                                                {difficulty}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                                            {challenge.title_en}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 mt-2">
                                            {challenge.description_en}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="relative z-10 space-y-4">
                                        {/* Progress Bar */}
                                        {isActive && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>Progress</span>
                                                    <span>{Math.round(progress)}%</span>
                                                </div>
                                                <Progress value={progress} className="h-2" />
                                            </div>
                                        )}

                                        {/* Challenge Stats */}
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{challenge.durationDays} Days</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Users className="h-4 w-4" />
                                                    <span>{participantCount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn(theme.color, "border-current")}>
                                                {(challenge as any).badgeName || challenge.badgeId}
                                            </Badge>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Trophy className={cn("h-4 w-4", theme.color)} />
                                            <span className="text-sm text-muted-foreground">
                                                {challenge.tasks.length} Tasks
                                            </span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="group-hover:text-primary">
                                            {isActive ? 'Continue' : isCompleted ? 'Review' : 'Start Journey'}
                                            <span className="ml-2">→</span>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <Card className="w-full max-w-2xl mx-auto text-center">
                    <CardHeader>
                        <Trophy className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                        <CardTitle>No Challenges Found</CardTitle>
                        <CardDescription>
                            {searchQuery || categoryFilter !== 'all' || difficultyFilter !== 'all'
                                ? "Try adjusting your search or filters to find epic challenges."
                                : "Exciting mythological challenges are being prepared. Embark on legendary journeys soon!"}
                        </CardDescription>
                    </CardHeader>
                    {(searchQuery || categoryFilter !== 'all' || difficultyFilter !== 'all') && (
                        <CardFooter className="justify-center">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery('');
                                    setCategoryFilter('all');
                                    setDifficultyFilter('all');
                                }}
                            >
                                Clear Filters
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            )}

            {/* Mythological Quote */}
            <div className="mt-16 text-center max-w-4xl mx-auto">
                <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
                    <CardContent className="pt-6">
                        <blockquote className="text-2xl font-serif italic text-foreground/90 mb-4">
                            "The journey of a thousand miles begins with a single step, but the journey of enlightenment begins with a single challenge."
                        </blockquote>
                        <p className="text-sm text-muted-foreground">— Ancient Wisdom</p>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
