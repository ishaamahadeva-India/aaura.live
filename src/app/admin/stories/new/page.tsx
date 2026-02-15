
'use client';

import { StoryForm } from '../StoryForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewStoryPage() {
  const router = useRouter();
  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Content
        </Button>
        <StoryForm />
    </main>
  )
}
