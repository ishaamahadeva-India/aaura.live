
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2, PlusCircle, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { Input } from '@/components/ui/input';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import type { Deity } from '@/lib/deities';

export default function DeitiesPage() {
  const { language, t } = useLanguage();
  const db = useFirestore();
  const deitiesRef = useMemo(() => collection(db, 'deities'), [db]);
  const deitiesQuery = useMemo(() => query(deitiesRef, where('status', '==', 'published')), [deitiesRef]);
  const [deities, isLoading] = useCollectionData(deitiesQuery, { idField: 'id' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDeities, setFilteredDeities] = useState<Deity[]>([]);

  useEffect(() => {
    if (deities) {
      if (searchQuery.trim() === '') {
        setFilteredDeities(deities as Deity[]);
      } else {
        const lowercasedQuery = searchQuery.toLowerCase();
        const filtered = (deities as Deity[]).filter((deity) => {
          const name = (deity.name as any)[language] || deity.name.en;
          return name.toLowerCase().includes(lowercasedQuery);
        });
        setFilteredDeities(filtered);
      }
    }
  }, [searchQuery, deities, language]);

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
            <div className="text-left">
                <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
                    <Sparkles className="h-10 w-10" /> {t.deities.title}
                </h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    {t.deities.description}
                </p>
            </div>
             <Button asChild>
                <Link href="/admin/deities/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t.deities.addDeity}
                </Link>
            </Button>
        </div>

        <div className="mb-8 max-w-lg mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for a deity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        ) : filteredDeities && filteredDeities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDeities.map((deity: Deity) => {
                const name = (deity.name as any)[language] || deity.name.en;
                const description = (deity.description as any)[language] || deity.description.en;
                const imageUrl = deity.images?.[0]?.url || `https://picsum.photos/seed/${deity.slug}/600/400`;
                const imageHint = deity.images?.[0]?.hint || 'deity';
                return (
                <Card key={deity.id} className="flex flex-col overflow-hidden group bg-card border-border hover:border-primary/50 transition-colors duration-300">
                <CardContent className="p-0">
                    <div className="aspect-video relative">
                        <Image
                            src={imageUrl}
                            alt={name}
                            data-ai-hint={imageHint}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                </CardContent>
                <CardHeader>
                    <CardTitle className="text-primary">{name}</CardTitle>
                    <CardDescription className="line-clamp-3">{description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                    <Button asChild className="w-full">
                        <Link href={`/deities/${deity.slug}`}>
                            {t.buttons.explore} <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </CardContent>
                </Card>
            )})}
            </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No deities found matching your search.</p>
          </div>
        )}
    </main>
  );
}
