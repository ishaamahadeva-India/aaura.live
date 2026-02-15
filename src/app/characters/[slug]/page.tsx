
'use client';

import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, Users, Shield, Award, AlertTriangle, Lightbulb, UserSquare, Star, BookHeart, Link as LinkIcon, Quote } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';

export default function CharacterDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language, t } = useLanguage();
  const db = useFirestore();
  
  const characterRef = doc(db, 'epicHeroes', slug);
  const [character, isLoading] = useDocumentData(characterRef);
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  if (!isLoading && !character) {
    notFound();
  }

  if (!character) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  const name = character.name[language] || character.name.en;
  
  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
              <Card className="bg-transparent border-primary/20">
                    <div className="aspect-square relative rounded-t-lg overflow-hidden">
                      <Image
                          src={character.imageUrl}
                          alt={name}
                          data-ai-hint={character.imageHint}
                          fill
                          className="object-cover"
                      />
                  </div>
                  <CardHeader>
                      <CardTitle className="text-4xl font-headline text-primary">{name}</CardTitle>
                      <p className="text-lg text-muted-foreground">{character.description}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                          {character.epicAssociation.map((epic: string) => <Badge key={epic} variant="default">{epic}</Badge>)}
                      </div>
                  </CardHeader>
              </Card>
               {character.relatedContent && (
                    <Card className="bg-transparent border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-lg"><LinkIcon />Associated Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                           {character.relatedContent.deities?.length > 0 && <Link href={`/deities/${character.relatedContent.deities[0]}`} className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10"><UserSquare className="h-4 w-4 text-primary" /> View Related Deities</Link>}
                           {character.relatedContent.sacredTales?.length > 0 && <Link href={`/stories/${character.relatedContent.sacredTales[0]}`} className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10"><BookOpen className="h-4 w-4 text-primary" /> Read Related Saga</Link>}
                           {character.relatedContent.rituals?.length > 0 && <Link href={`/rituals/${character.relatedContent.rituals[0]}`} className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10"><BookHeart className="h-4 w-4 text-primary" /> Explore Related Rituals</Link>}
                        </CardContent>
                    </Card>
                )}
          </div>
          <div className="md:col-span-2 space-y-6">
                <Card className="bg-transparent border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Quote />Inspirational Quote</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <blockquote className="text-xl italic text-foreground/90 border-l-4 border-primary pl-4">
                            "{character.quote.text}"
                        </blockquote>
                        <p className="text-right mt-2 text-muted-foreground">- {character.quote.source}</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-transparent border-primary/20">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-primary"><Star />Prominence</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-foreground/90">{character.prominence}</p>
                         <p className="mt-4 text-sm text-foreground/80"><strong className="text-primary">Modern Relevance:</strong> {character.modernRelevance}</p>
                    </CardContent>
                </Card>

                <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
                    <AccordionItem value="item-1" className="bg-transparent border-primary/20 border rounded-lg px-4">
                        <AccordionTrigger className="text-primary text-xl font-semibold hover:no-underline">
                            <div className="flex items-center gap-3"><Users /> Background & Family</div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                            <div>
                                <h4 className="font-bold text-md">Birth & Early Life</h4>
                                <p className="text-muted-foreground">{character.background.earlyLife}</p>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-bold text-md">Family</h4>
                                <p className="text-sm text-muted-foreground"><strong>Parents:</strong> {character.background.family.parents?.join(', ')}</p>
                                <p className="text-sm text-muted-foreground"><strong>Siblings:</strong> {character.background.family.siblings?.join(', ')}</p>
                                <p className="text-sm text-muted-foreground"><strong>Spouses:</strong> {character.background.family.spouses?.join(', ')}</p>
                                <p className="text-sm text-muted-foreground"><strong>Children:</strong> {character.background.family.children?.join(', ')}</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2" className="bg-transparent border-primary/20 border rounded-lg px-4">
                        <AccordionTrigger className="text-primary text-xl font-semibold hover:no-underline">
                            <div className="flex items-center gap-3"><Shield /> Qualities & Achievements</div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                             <div>
                                <h4 className="font-bold text-md">Qualities</h4>
                                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                    {character.qualities.map((q: string, i: number) => <li key={i}>{q}</li>)}
                                </ul>
                            </div>
                            <Separator />
                             <div>
                                <h4 className="font-bold text-md">Achievements</h4>
                                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                    {character.achievements.map((a: string, i: number) => <li key={i}>{a}</li>)}
                                </ul>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                     <AccordionItem value="item-3" className="bg-transparent border-primary/20 border rounded-lg px-4">
                        <AccordionTrigger className="text-primary text-xl font-semibold hover:no-underline">
                             <div className="flex items-center gap-3"><AlertTriangle /> Mistakes & Learnings</div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                             <div>
                                <h4 className="font-bold text-md">Mistakes</h4>
                                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                    {character.mistakes.map((m: string, i: number) => <li key={i}>{m}</li>)}
                                </ul>
                            </div>
                            <Separator />
                             <div>
                                <h4 className="font-bold text-md text-green-600 flex items-center gap-2"><Lightbulb/> Learnings for Children</h4>
                                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                    {character.learningsForChildren.map((l: string, i: number) => <li key={i}>{l}</li>)}
                                </ul>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
          </div>
      </div>
    </main>
  );
}
