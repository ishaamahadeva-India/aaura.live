
'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, doc, writeBatch, increment, where, serverTimestamp, DocumentData } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Users, Loader2, PlusCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import Image from 'next/image';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';

export default function ForumPage() {
    const { t } = useLanguage();
    const auth = useAuth();
    const db = useFirestore();
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const groupsQuery = query(collection(db, 'groups'));
    const [groupsSnapshot, isLoading] = useCollection(groupsQuery);
    
    const groups = useMemo(() => {
        return groupsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
    }, [groupsSnapshot]);

    const userGroupsQuery = user ? query(collection(db, `users/${user.uid}/groups`)) : undefined;
    const [userGroupMemberships, loadingUserGroups] = useCollection(userGroupsQuery);
    
    const userJoinedGroups = useMemo(() => {
      if (!userGroupMemberships) return new Set();
      return new Set(userGroupMemberships.docs.map(doc => doc.id));
    }, [userGroupMemberships]);


    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const handleJoinLeave = async (group: DocumentData) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in to join a group.' });
            return;
        }

        if (!group || !group.id) {
            console.error("handleJoinLeave called with invalid group:", group);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not process group action.' });
            return;
        }

        setLoadingStates(prev => ({ ...prev, [group.id]: true }));
        
        const groupRef = doc(db, 'groups', group.id);
        const userGroupRef = doc(db, `users/${user.uid}/groups`, group.id);

        const batch = writeBatch(db);
        const isMember = userJoinedGroups.has(group.id);

        try {
            if (isMember) {
                batch.delete(userGroupRef);
                batch.update(groupRef, { memberCount: increment(-1) });
                await batch.commit();
                toast({ title: `You have left the "${group.name}" group.` });
            } else {
                const joinData = { groupId: group.id, joinedAt: serverTimestamp() };
                batch.set(userGroupRef, joinData);
                batch.update(groupRef, { memberCount: increment(1) });
                await batch.commit();
                toast({ title: `Welcome to the "${group.name}" group!` });
            }
        } catch (error) {
             const permissionError = new FirestorePermissionError({
                path: userGroupRef.path, // Correctly point to the subcollection path that failed
                operation: isMember ? 'delete' : 'create',
                requestResourceData: isMember ? undefined : { groupId: group.id }
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setLoadingStates(prev => ({ ...prev, [group.id]: false }));
        }
    };
    
    if (!isClient) {
        return (
            <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            </main>
        );
    }
    
    if (isLoading) {
        return (
            <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            </main>
        );
    }
    
    return (
        <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
                <div className="text-left">
                    <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
                        <Users className="h-10 w-10" /> Community Groups
                    </h1>
                    <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
                        Find and join groups based on your interests to connect with fellow seekers.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/groups/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Group
                    </Link>
                </Button>
            </div>

            {groups && groups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group, index) => {
                        if (!group || !group.id) {
                            return null;
                        }
                        const isMember = user ? userJoinedGroups.has(group.id) : false;
                        const loadingMembership = loadingStates[group.id] || loadingUserGroups;
                        
                        return (
                             <Card key={group.id || `group-${index}`} className="overflow-hidden border-primary/20 hover:border-primary/50 transition-colors duration-300 h-full flex flex-col">
                                <Link href={`/forum/${group.id}`} className="group block flex flex-col flex-grow">
                                    <div className="relative aspect-video bg-secondary">
                                        <Image src={group.coverImageUrl || `https://picsum.photos/seed/${group.id}/600/400`} alt={group.name} fill className="object-cover" />
                                    </div>
                                    <CardHeader>
                                        <CardTitle className="text-md font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary">
                                            {group.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {group.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="mt-auto flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-4 w-4" />
                                            <span>{group.memberCount || 0} Members</span>
                                        </div>
                                    </CardFooter>
                                </Link>
                                {user && (
                                    <CardFooter>
                                        <Button variant={isMember ? 'secondary' : 'default'} size="sm" onClick={() => handleJoinLeave(group)} disabled={loadingMembership} className="w-full">
                                            {loadingMembership ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                                isMember ? <><CheckCircle className="mr-2 h-4 w-4" /> Joined</> : <><PlusCircle className="mr-2 h-4 w-4" /> Join</>
                                            )}
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Users className="mx-auto h-24 w-24 text-muted-foreground/50" />
                    <h2 className="mt-6 text-2xl font-semibold text-foreground">No Groups Found</h2>
                    <p className="mt-2 text-muted-foreground">
                        It looks like there are no community groups yet.
                    </p>
                </div>
            )}
        </main>
    );
}
