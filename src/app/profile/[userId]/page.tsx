

'use client';

import { useParams, notFound, useRouter } from 'next/navigation';
import { useDocumentData, useCollectionData } from 'react-firebase-hooks/firestore';
import { doc, writeBatch, increment, serverTimestamp, collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';
import { Loader2, User, CheckCircle, PlusCircle, UserPlus, Mail, Cake, List, UserMinus, Phone, Palmtree, Edit2, MapPin, Calendar, Users as UsersIcon, Briefcase, Heart, Award } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { FollowListDialog } from '@/components/FollowListDialog';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { PostCard } from '@/components/PostCard';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useMemo, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { temples as allTemples } from '@/lib/temples';
import type { Temple } from '@/lib/temples';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function AboutTab({ profile, isOwner }: { profile: any; isOwner: boolean }) {
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Bio Section */}
            {profile.bio && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            About
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                    </CardContent>
                </Card>
            )}

            {/* Contact Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Contact Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">{profile.email || 'Not provided'}</span>
                    </div>
                    {profile.mobile && (
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground"/>
                            <span className="text-sm">{profile.mobile}</span>
                        </div>
                    )}
                    {(profile.address || profile.city || profile.state) && (
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5"/>
                            <div className="text-sm">
                                {profile.address && <p>{profile.address}</p>}
                                {(profile.city || profile.state) && (
                                    <p className="text-muted-foreground">
                                        {[profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Personal Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Personal Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {profile.birthDate && (
                        <div className="flex items-center gap-3">
                            <Cake className="h-4 w-4 text-muted-foreground"/>
                            <div>
                                <p className="text-sm font-medium">Birth Date</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(profile.birthDate), 'MMMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                    )}
                    {profile.zodiacSign && (
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-muted-foreground"/>
                            <div>
                                <p className="text-sm font-medium">Zodiac Sign</p>
                                <p className="text-sm text-muted-foreground">{profile.zodiacSign}</p>
                            </div>
                        </div>
                    )}
                    {profile.placeOfBirth && (
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground"/>
                            <div>
                                <p className="text-sm font-medium">Place of Birth</p>
                                <p className="text-sm text-muted-foreground">{profile.placeOfBirth}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Family Details */}
            {profile.familyMembers && profile.familyMembers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UsersIcon className="h-5 w-5" />
                            Family Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.familyMembers.map((member: any, index: number) => (
                                <div key={index} className="p-3 rounded-lg border bg-secondary/30">
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {member.relation} {member.age && `• Age ${member.age}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg border bg-secondary/30">
                            <p className="text-2xl font-bold text-primary">{profile.followerCount || 0}</p>
                            <p className="text-xs text-muted-foreground">Followers</p>
                        </div>
                        <div className="text-center p-3 rounded-lg border bg-secondary/30">
                            <p className="text-2xl font-bold text-primary">{profile.followingCount || 0}</p>
                            <p className="text-xs text-muted-foreground">Following</p>
                        </div>
                        <div className="text-center p-3 rounded-lg border bg-secondary/30">
                            <p className="text-2xl font-bold text-primary">{profile.postsCount || 0}</p>
                            <p className="text-xs text-muted-foreground">Posts</p>
                        </div>
                        <div className="text-center p-3 rounded-lg border bg-secondary/30">
                            <p className="text-2xl font-bold text-primary">{profile.badgesCount || 0}</p>
                            <p className="text-xs text-muted-foreground">Badges</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ActivityTab({ userId }: { userId: string }) {
    const db = useFirestore();
    const postsQuery = useMemo(() => query(collection(db, 'posts'), where('authorId', '==', userId), orderBy('createdAt', 'desc')), [db, userId]);
    const [posts, loadingPosts] = useCollectionData(postsQuery, { idField: 'id' });

    return (
        <div>
            {loadingPosts ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : posts && posts.length > 0 ? (
                <div className="space-y-6">
                    {posts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <List className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h2 className="mt-6 text-2xl font-semibold text-foreground">No Activity Yet</h2>
                    <p className="mt-2 text-muted-foreground">This user hasn't posted anything yet.</p>
                </div>
            )}
        </div>
    );
}

function TempleJourneyTab({ profile }: { profile: any }) {

    const templesVisited = useMemo(() => allTemples.filter(t => profile.templesVisited?.includes(t.slug)), [profile.templesVisited]);
    const templesPlanning = useMemo(() => allTemples.filter(t => profile.templesPlanning?.includes(t.slug)), [profile.templesPlanning]);

    const TempleGrid = ({ temples }: { temples: Temple[] }) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {temples.map(temple => (
                 <Link href={`/temples/${temple.slug}`} key={temple.id}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative aspect-video">
                            <Image src={temple.media.images[0].url} alt={temple.name.en} fill className="object-cover" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-base">{temple.name.en}</CardTitle>
                            <CardDescription>{temple.location.city}, {temple.location.state}</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
    );
    
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary"><Palmtree /> Temples Visited</h3>
                {templesVisited.length > 0 ? <TempleGrid temples={templesVisited} /> : <p className="text-muted-foreground">No temples visited yet.</p>}
            </div>
            <div>
                 <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary"><Palmtree /> Planning to Visit</h3>
                {templesPlanning.length > 0 ? <TempleGrid temples={templesPlanning} /> : <p className="text-muted-foreground">No temples in the travel plan yet.</p>}
            </div>
        </div>
    );
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { language, t } = useLanguage();
  const db = useFirestore();
  const auth = useAuth();
  const [currentUser] = useAuthState(auth);
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const profileRef = useMemo(() => doc(db, 'users', userId), [db, userId]);
  const [profile, loadingProfile] = useDocumentData(profileRef, { idField: 'id' });

  const handleProfileUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const followingRef = useMemo(() => currentUser ? doc(db, `users/${currentUser.uid}/following`, userId) : undefined, [currentUser, db, userId]);
  const [following, loadingFollowing] = useDocumentData(followingRef);
  
  const isFollowing = !!following;
  const isOwner = currentUser?.uid === userId;

  const handleFollow = async () => {
    if (!currentUser || !followingRef) {
      toast({ variant: 'destructive', title: 'You must be logged in to follow a user.' });
      return;
    }
     if (isOwner) {
        toast({ variant: 'destructive', title: "You cannot follow yourself." });
        return;
    }

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', userId);
    const followerRef = doc(db, `users/${userId}/followers`, currentUser.uid);
    
    const batch = writeBatch(db);

    if (isFollowing) {
      batch.delete(followingRef);
      batch.delete(followerRef);
      batch.update(currentUserRef, { followingCount: increment(-1) });
      batch.update(targetUserRef, { followerCount: increment(-1) });
    } else {
      batch.set(followingRef, { userId: userId, followedAt: serverTimestamp() });
      batch.set(followerRef, { userId: currentUser.uid, followedAt: serverTimestamp() });
      batch.update(currentUserRef, { followingCount: increment(1) });
      batch.update(targetUserRef, { followerCount: increment(1) });
    }

    batch.commit()
    .then(() => {
        toast({
          title: isFollowing ? 'Unfollowed' : 'Followed!',
          description: `You are ${isFollowing ? 'no longer following' : 'now following'} ${profile?.fullName}.`
        });
    })
    .catch((serverError) => {
        const operation = isFollowing ? 'delete' : 'create';
        toast({ variant: "destructive", title: `Failed to ${operation} user`});
        const permissionError = new FirestorePermissionError({
            path: followingRef.path,
            operation: operation
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  if (loadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden mb-8">
        <div className="relative h-48 w-full bg-secondary">
            <Image
                src={`https://picsum.photos/seed/${userId}-banner/1200/400`}
                alt={`${profile.fullName} banner`}
                data-ai-hint="abstract spiritual background"
                layout="fill"
                objectFit="cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 -mt-20">
            <div className="relative h-32 w-32 shrink-0 mx-auto sm:mx-0">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage 
                  src={profile.photoURL || currentUser?.photoURL || `https://picsum.photos/seed/${userId}/200/200`}
                  alt={profile.fullName}
                />
                <AvatarFallback className="text-2xl">
                  {profile.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {isOwner && (
                <div className="absolute bottom-0 right-0">
                  <ProfileEditDialog profile={profile} onProfileUpdate={handleProfileUpdate} />
                </div>
              )}
            </div>
            <div className="flex-grow">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                    <div className="text-center sm:text-left">
                        <CardTitle className="text-3xl font-bold flex items-center justify-center sm:justify-start gap-2">
                            {profile.fullName}
                            {profile.verified && (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                        </CardTitle>
                        {profile.username && (
                          <p className="text-muted-foreground mt-1">@{profile.username}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        {currentUser && !isOwner && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant={isFollowing ? 'secondary' : 'default'} size="lg" disabled={loadingFollowing} >
                                        {loadingFollowing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                                            isFollowing ? <><UserMinus className="mr-2 h-4 w-4" /> Unfollow</> : <><UserPlus className="mr-2 h-4 w-4" /> Follow</>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {isFollowing ? "Unfollow" : "Follow"} {profile.fullName}?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You can always change your mind later.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t.buttons.cancel}</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleFollow}>{isFollowing ? 'Unfollow' : 'Follow'}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {isOwner && (
                          <ProfileEditDialog profile={profile} onProfileUpdate={handleProfileUpdate} />
                        )}
                    </div>
                </div>
                 <div className="mt-4 flex justify-center sm:justify-start items-center gap-6 text-sm">
                    <FollowListDialog userId={userId} type="followers" trigger={<div className="text-center cursor-pointer hover:bg-secondary p-2 rounded-md transition-colors"><p className="font-bold text-lg">{profile.followerCount || 0}</p><p className="text-muted-foreground">{t.topnav.followers}</p></div>} />
                    <FollowListDialog userId={userId} type="following" trigger={<div className="text-center cursor-pointer hover:bg-secondary p-2 rounded-md transition-colors"><p className="font-bold text-lg">{profile.followingCount || 0}</p><p className="text-muted-foreground">{t.topnav.following}</p></div>} />
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

        <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="temples">Temple Journey</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-6">
                <div className="max-w-2xl mx-auto">
                    <ActivityTab userId={userId} />
                </div>
            </TabsContent>
            <TabsContent value="temples" className="mt-6">
                 <TempleJourneyTab profile={profile} />
            </TabsContent>
            <TabsContent value="about" className="mt-6">
                <AboutTab profile={profile} isOwner={isOwner} />
            </TabsContent>
        </Tabs>
    </main>
  );
}
