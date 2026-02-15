
'use client';

import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Music, BookOpen, Sunrise, Sunset, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { DeityDailyRelevanceOutput } from '@/ai/flows/deity-daily-relevance';
import { useLanguage } from '@/hooks/use-language';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { query, collection, where } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import type { Deity } from '@/lib/deities';

export default function DeityDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language, t } = useLanguage();
  const [dailyContent, setDailyContent] = useState<DeityDailyRelevanceOutput | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const db = useFirestore();

  const deitiesQuery = useMemo(() => {
    if (!db) return undefined;
    return query(collection(db, 'deities'), where('slug', '==', slug));
  }, [db, slug]);
  const [deities, isDeitiesLoading] = useCollectionData(deitiesQuery, { idField: 'id' });
  const deity = useMemo(() => {
    if (!deities || deities.length === 0) return undefined;
    return deities[0] as Deity;
  }, [deities]);

  useEffect(() => {
    if (deity) {
      // MOCK DATA: Using static content to avoid API rate limits during development.
      setDailyContent({
          todaysRelevance: `Today is a powerful day to connect with the energy of ${deity.name.en}. Focus on their core attributes, such as overcoming obstacles, to navigate your day with wisdom and strength.`,
          tomorrowsImportance: `Tomorrow, carry the blessings of ${deity.name.en} with you. It is an auspicious time to start new projects, knowing that divine guidance is supporting your endeavors.`
      });
    }
  }, [deity]);
  
  if (isDeitiesLoading) {
     return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  if (!isDeitiesLoading && !deity) {
    notFound();
  }
  
  if (!deity) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  const name = (deity.name as any)[language] || deity.name.en;
  const description = (deity.description as any)[language] || deity.description.en;

  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary">{name}</h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{description}</p>
        </div>

        <Carousel className="w-full max-w-4xl mx-auto mb-12">
        <CarouselContent>
            {deity.images.map((image: any, index: number) => (
            <CarouselItem key={index}>
                <div className="aspect-video relative rounded-lg overflow-hidden border-2 border-accent/20">
                <Image
                    src={image.url}
                    alt={`${name} image ${index + 1}`}
                    data-ai-hint={image.hint}
                    fill
                    className="object-cover"
                />
                </div>
            </CarouselItem>
            ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
        </Carousel>

        {isLoadingContent ? (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        ) : dailyContent && (
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-8">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-primary"><Sunrise /> {t.deityDetail.todaysRelevance}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-foreground/90">{dailyContent.todaysRelevance}</p>
                </CardContent>
            </Card>
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-primary"><Sunset /> {t.deityDetail.tomorrowsImportance}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-foreground/90">{dailyContent.tomorrowsImportance}</p>
                </CardContent>
            </Card>
        </div>
        )}


        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-primary"><Music /> {t.deityDetail.mantras}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {deity.mantras?.map((mantra: any, index: number) => {
                    const translationKey = `translation_${language}` as keyof typeof mantra;
                    const translation = (mantra as any)[translationKey] || mantra.translation_en;
                    return (
                        <div key={index}>
                            <p className="text-xl font-semibold font-body text-foreground">{mantra.sanskrit}</p>
                            <p className="text-muted-foreground italic">{translation}</p>
                        </div>
                    );
                    })}
                </CardContent>
            </Card>

            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-primary"><BookOpen /> {t.deityDetail.stotras}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {deity.stotras?.map((stotra: any, index: number) => {
                    const title = (stotra.title as any)[language] || stotra.title.en;
                    const translationKey = `translation_${language}` as keyof typeof stotra;
                    const translation = (stotra as any)[translationKey] || stotra.translation_en;
                    return(
                        <div key={index}>
                            <h4 className="font-semibold text-lg text-foreground">{title}</h4>
                            <p className="font-body text-foreground/80 mt-1">{stotra.sanskrit}</p>
                            <p className="text-muted-foreground text-sm mt-1 italic">{translation}</p>
                        </div>
                    )
                    })}
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
