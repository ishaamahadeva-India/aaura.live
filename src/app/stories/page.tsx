
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ScrollText, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';


export default function StoriesPage() {
  const { language, t } = useLanguage();
  const db = useFirestore();
  const storiesQuery = query(collection(db, 'stories'), where('status', '==', 'published'));
  const [stories, isLoading] = useCollectionData(storiesQuery, { idField: 'id' });
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const isSuperAdmin = user?.uid === '9RwsoEEkWPR3Wpv6wKZmhos1xTG2' || user?.email === 'smr@aaura.com';

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
            <div className="text-left">
                <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
                    <ScrollText className="h-10 w-10" /> {t.stories.title}
                </h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    {t.stories.description}
                </p>
            </div>
            {isSuperAdmin && (
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/admin/stories/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Saga
                    </Link>
                </Button>
            )}
        </div>
        
        {isLoading ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories?.map((story: any) => {
            const title = story.title[language] || story.title.en;
            const summary = story.summary[language] || story.summary.en;

            return (
                <Card key={story.id} className="flex flex-col overflow-hidden group border-primary/20 hover:border-primary/50 transition-colors duration-300">
                    <CardContent className="p-0">
                        <div className="aspect-video relative">
                            <Image
                                src={story.image.url}
                                alt={title}
                                data-ai-hint={story.image.hint}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                    </CardContent>
                    <CardHeader>
                        <CardTitle className="text-primary">{title}</CardTitle>
                        <CardDescription className="line-clamp-3">{summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto">
                        <Button asChild className="w-full">
                            <Link href={`/stories/${story.slug}`}>
                                {t.buttons.readStory} <ArrowRight className="ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            );
            })}
            </div>
        )}
    </main>
  );
}
