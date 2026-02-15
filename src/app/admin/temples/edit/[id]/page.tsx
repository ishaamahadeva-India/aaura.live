
'use client';

import { useParams, useRouter } from 'next/navigation';
import { TempleForm } from '../../TempleForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import type { Temple } from '@/lib/temples';

export default function EditTemplePage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const id = params.id as string;
  
  const templeRef = doc(db, 'temples', id);
  const [temple, isLoading] = useDocumentData(templeRef);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
        <TempleForm temple={temple as Temple} />
    </main>
  );
}
