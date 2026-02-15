
'use client';

import { useParams, useRouter } from 'next/navigation';
import { CharacterForm } from '../../CharacterForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import type { EpicHero } from '@/lib/characters';

export default function EditCharacterPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const id = params.id as string;

  const characterRef = doc(db, 'epicHeroes', id);
  const [character, isLoading] = useDocumentData(characterRef);
  
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
            Back to Content
        </Button>
        <CharacterForm character={character as EpicHero} />
    </main>
  );
}
