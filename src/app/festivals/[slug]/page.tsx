'use client';

import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckSquare, Sparkles, Loader2, Music, PlayCircle, ShoppingCart, ArrowLeft, Share2, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { isSuperAdmin } from '@/lib/admin';
import { Comments } from '@/components/comments';

export default function FestivalDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language, t } = useLanguage();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const festivalQuery = useMemo(() => query(collection(db, 'festivals'), where('slug', '==', slug)), [db, slug]);
  const [festivals, isLoading] = useCollectionData(festivalQuery, { idField: 'id' });
  const festival = useMemo(() => festivals?.[0], [festivals]);
  
  const deitySlugs = useMemo(() => festival?.associatedDeities || [], [festival]);
  const productIds = useMemo(() => festival?.relatedProducts || [], [festival]);
  
  const deitiesQuery = useMemo(() => deitySlugs.length > 0 ? query(collection(db, 'deities'), where('__name__', 'in', deitySlugs.slice(0, 30))) : undefined, [db, deitySlugs]);
  const [associatedDeities, loadingDeities] = useCollectionData(deitiesQuery, { idField: 'id' });
  
  const productsQuery = useMemo(() => productIds.length > 0 ? query(collection(db, 'products'), where('__name__', 'in', productIds.slice(0, 30))) : undefined, [db, productIds]);
  const [relatedProducts, loadingProducts] = useCollectionData(productsQuery, { idField: 'id' });

  const isAdmin = isSuperAdmin(user);

  const handleShare = async () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/festivals/${festival?.slug}`;
    const shareData = {
      title: festival?.name?.[language] || festival?.name?.en || 'Festival',
      text: `Check out ${festival?.name?.[language] || festival?.name?.en || 'this festival'} on Aaura`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: "Shared!", description: "Festival shared successfully." });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link Copied!", description: "The festival link has been copied to your clipboard." });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({ title: "Link Copied!", description: "The festival link has been copied to your clipboard." });
        } catch (clipboardError) {
          toast({ variant: 'destructive', title: 'Share Failed', description: 'Could not share the festival.' });
        }
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  if (!isLoading && !festival) {
    notFound();
  }
  
  if (!festival) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  const name = (festival.name as any)?.[language] || festival.name?.en || '';
  const description = (festival.description as any)?.[language] || festival.description?.en || '';
  const significance = (festival.significance as any)?.[language] || festival.significance?.en || '';
  const rituals = (festival.rituals as any)?.[language] || festival.rituals?.en || [];
  const festivalDate = festival.date?.toDate ? festival.date.toDate() : new Date(festival.date);
  const isUpcoming = festivalDate >= new Date();
  const daysUntil = Math.ceil((festivalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-6xl mx-auto">
            <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <header className="text-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
                  <Badge variant="default" className="text-lg px-4 py-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> 
                    {format(festivalDate, 'MMMM do, yyyy')}
                  </Badge>
                  {festival.duration && (
                    <Badge variant="secondary" className="text-lg px-4 py-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {festival.duration}
                    </Badge>
                  )}
                  {isUpcoming && daysUntil <= 7 && (
                    <Badge variant="default" className="bg-orange-500 text-lg px-4 py-2 animate-pulse">
                      {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow!' : `${daysUntil} days to go!`}
                    </Badge>
                  )}
                </div>
                <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary mb-4">{name}</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{description}</p>
                <div className="mt-4 flex justify-center items-center gap-4 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/festivals/edit/${festival.id}`}>
                        Edit Festival
                      </Link>
                    </Button>
                  )}
                </div>
            </header>

            <div className="aspect-video relative rounded-lg overflow-hidden border-2 border-accent/20 mb-8 shadow-xl">
                <Image
                    src={festival.image?.url || '/placeholder.jpg'}
                    alt={name}
                    data-ai-hint={festival.image?.hint}
                    fill
                    className="object-cover"
                    priority
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                      <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary">
                              <Sparkles className="h-5 w-5" /> 
                              {t.festivalDetail.significance}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground/90 leading-relaxed text-lg">{significance}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary">
                              <CheckSquare className="h-5 w-5" /> 
                              {t.festivalDetail.keyRituals}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside space-y-3 text-foreground/90">
                                {rituals && rituals.length > 0 ? (
                                  rituals.map((ritual: string, index: number) => (
                                    <li key={index} className="text-lg">{ritual}</li>
                                  ))
                                ) : (
                                  <li className="text-muted-foreground">No rituals listed.</li>
                                )}
                            </ul>
                        </CardContent>
                      </Card>

                      <Separator className="my-8" />

                      {/* Comments Section */}
                      <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary">
                              <Music className="h-5 w-5" />
                              Community Discussion
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Comments contentId={festival.slug} contentType="festival" />
                        </CardContent>
                      </Card>
                </div>

                <div className="space-y-6 lg:sticky top-24 h-fit">
                    {associatedDeities && associatedDeities.length > 0 && (
                    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary">
                              <Sparkles className="h-5 w-5" />
                              {t.festivalDetail.associatedDeities}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {associatedDeities.map((deity: any) => (
                                <Link 
                                  key={deity.id} 
                                  href={`/deities/${deity.slug}`} 
                                  className="group flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 border border-border hover:border-primary/50 transition-all"
                                >
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-primary/20">
                                        <Image 
                                          src={deity.images?.[0]?.url || '/placeholder.jpg'} 
                                          alt={deity.name?.[language] || deity.name?.en || ''} 
                                          data-ai-hint={deity.images?.[0]?.hint} 
                                          fill 
                                          className="object-cover group-hover:scale-110 transition-transform" 
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                          {deity.name?.[language] || deity.name?.en || ''}
                                        </p>
                                        {deity.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                            {deity.description?.[language] || deity.description?.en || ''}
                                          </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                    )}

                    {festival.recommendedPlaylist && (
                        <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-primary">
                                  <Music className="h-5 w-5" /> 
                                  Festival Playlist
                                </CardTitle>
                                <CardDescription>{festival.recommendedPlaylist.title}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline" className="w-full">
                                  <Link href={`/playlists/${festival.recommendedPlaylist.id}`}>
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Listen Now
                                  </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {relatedProducts && relatedProducts.length > 0 && (
                        <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-primary">
                                  <ShoppingCart className="h-5 w-5" /> 
                                  Shop Essentials
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                               {relatedProducts.map((product: any) => (
                                   <Link 
                                     key={product.id} 
                                     href={`/shop/${product.id}`} 
                                     className="group flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 border border-border hover:border-primary/50 transition-all"
                                   >
                                       <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border-2 border-primary/20">
                                           <Image 
                                             src={product.imageUrl || '/placeholder.jpg'} 
                                             alt={product.name_en || product.id} 
                                             data-ai-hint={product.imageHint} 
                                             fill 
                                             className="object-cover group-hover:scale-110 transition-transform" 
                                           />
                                       </div>
                                       <div className="flex-1">
                                           <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                             {product.name_en || product.id}
                                           </p>
                                           <p className="text-xs text-muted-foreground">₹{product.price?.toFixed(2) || '0.00'}</p>
                                       </div>
                                   </Link>
                               ))}
                               <Button asChild variant="outline" className="w-full mt-4">
                                 <Link href="/shop">
                                   <ShoppingCart className="mr-2 h-4 w-4" />
                                   View All Products
                                 </Link>
                               </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </article>
    </main>
  );
}
