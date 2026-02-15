
'use client';

import { useParams, notFound } from 'next/navigation';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Users, CheckCircle, PlusCircle } from 'lucide-react';
import { Posts } from '@/components/Posts';
import { useLanguage } from '@/hooks/use-language';
import Image from 'next/image';
import Link from 'next/link';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { t } = useLanguage();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const groupRef = doc(db, 'groups', groupId);
  const [group, loading, error] = useDocumentData(groupRef, { idField: "id" });

  const userGroupRef = user ? doc(db, `users/${user.uid}/groups`, groupId) : undefined;
  const [userGroupMembership] = useDocumentData(userGroupRef, { idField: "id" });
  const isMember = !!userGroupMembership;

  const [loadingStates, setLoadingStates] = useState<{ join: boolean }>({ join: false });

  const handleJoinLeave = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in to join a group.' });
      return;
    }

    if (!group || !group.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not process group action.' });
      return;
    }

    setLoadingStates({ join: true });
    
    const batch = writeBatch(db);
    const wasMember = isMember;

    try {
      if (wasMember) {
        batch.delete(userGroupRef!);
        batch.update(groupRef, { memberCount: increment(-1) });
        await batch.commit();
        toast({ title: `You have left the "${group.name}" group.` });
      } else {
        const joinData = { groupId: group.id, joinedAt: serverTimestamp() };
        batch.set(userGroupRef!, joinData);
        batch.update(groupRef, { memberCount: increment(1) });
        await batch.commit();
        toast({ title: `Welcome to the "${group.name}" group!` });
      }
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: userGroupRef!.path,
        operation: wasMember ? 'delete' : 'create',
        requestResourceData: wasMember ? undefined : { groupId: group.id }
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setLoadingStates({ join: false });
    }
  };

  if (loading) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (error || !group) {
    return notFound();
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/forum">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forum
          </Link>
        </Button>

        <Card className="overflow-hidden">
          <div className="relative h-48 md:h-64 bg-secondary">
            {group.coverImageUrl && (
              <Image
                src={group.coverImageUrl}
                alt={group.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold">{group.name}</CardTitle>
                <CardDescription className="mt-2 text-base">{group.description}</CardDescription>
              </div>
              {user && (
                <Button
                  variant={isMember ? 'secondary' : 'default'}
                  size="lg"
                  onClick={handleJoinLeave}
                  disabled={loadingStates.join}
                >
                  {loadingStates.join ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isMember ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Joined
                        </>
                      ) : (
                        <>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Join
                        </>
                      )}
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <Users className="h-4 w-4" />
              <span>{group.memberCount || 0} Members</span>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discussion</CardTitle>
            <CardDescription>Share your thoughts and connect with other members</CardDescription>
          </CardHeader>
          <CardContent>
            <Posts contextId={groupId} contextType="group" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
