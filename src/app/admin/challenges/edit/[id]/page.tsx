
'use client';

import { useParams, useRouter, notFound } from 'next/navigation';
import { ChallengeForm } from '../../ChallengeForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import { challengeConverter } from '@/lib/challenges';
import type { Challenge } from '@/lib/challenges';
import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';


export default function EditChallengePage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const id = params.id as string;

  const challengeRef = doc(db, 'challenges', id).withConverter(challengeConverter);
  const [snapshot, isLoading, error] = useDocument(challengeRef);
  const challenge = snapshot?.data() as Challenge | undefined;

  useEffect(() => {
    if (error) {
        const permissionError = new FirestorePermissionError({
            path: challengeRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  }, [error, challengeRef]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoading && !challenge) {
    return notFound();
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Content
        </Button>
        <ChallengeForm challenge={challenge} />
    </main>
  );
}
