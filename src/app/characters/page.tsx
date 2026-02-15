
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, UserSquare, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/use-language';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';

export default function CharactersPage() {
  const { language, t } = useLanguage();
  const db = useFirestore();
  const charactersQuery = query(collection(db, 'epicHeroes'), where('status', '==', 'published'));
  const [characters, isLoading] = useCollectionData(charactersQuery, { idField: 'id' });

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
            <div className="text-left">
                <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center justify-center gap-3">
                    <UserSquare className="h-10 w-10" /> {t.sidebar.characters}
                </h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    Discover the heroes, villains, gods, and sages of Hindu mythology.
                </p>
            </div>
             <Button asChild>
                <Link href="/admin/characters/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Hero
                </Link>
            </Button>
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {characters?.map((character: any) => {
            const name = character.name[language] || character.name.en;
            const description = character.description;
            return (
                <Card key={character.id} className="flex flex-col overflow-hidden group border-primary/20 hover:border-primary/50 transition-colors duration-300">
                    <CardContent className="p-0">
                        <div className="aspect-video relative">
                            <Image
                                src={character.imageUrl}
                                alt={name}
                                data-ai-hint={character.imageHint}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                    </CardContent>
                    <CardHeader>
                        <CardTitle className="text-primary">{name}</CardTitle>
                        <Badge variant="secondary" className="w-fit">{character.epicAssociation.join(', ')}</Badge>
                        <CardDescription className="line-clamp-3 pt-2">{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto">
                        <Button asChild className="w-full">
                            <Link href={`/characters/${character.slug}`}>
                                {t.buttons.learnMore} <ArrowRight className="ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )
            })}
            </div>
        )}
    </main>
  );
}
