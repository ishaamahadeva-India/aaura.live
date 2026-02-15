
'use client';

import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, ShoppingBasket, Clock, Loader2, BookOpen, Lightbulb, AlertTriangle, Sparkles, Music, PlayCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useState, useTransition, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, serverTimestamp, increment, query, where, collection, DocumentData } from 'firebase/firestore';
import { useDocumentData, useCollectionData } from 'react-firebase-hooks/firestore';

export default function RitualDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const [isAddingToCart, startTransition] = useTransition();
  
  const ritualQuery = useMemo(() => query(collection(db, 'rituals'), where('slug', '==', slug)), [db, slug]);
  const [rituals, isLoading] = useCollectionData(ritualQuery, { idField: 'id' });
  const ritual = useMemo(() => rituals?.[0], [rituals]);
  
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  
  const productIds = useMemo(() => ritual?.itemsRequired?.en?.map((item: any) => item.productId) || [], [ritual]);
  const productsQuery = useMemo(() => productIds.length > 0 ? query(collection(db, 'products'), where('__name__', 'in', productIds)) : undefined, [db, productIds]);
  const [products, loadingProducts] = useCollectionData(productsQuery, { idField: 'id' });

  const handleAddToCart = (productId: string, name: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: "Login Required",
        description: "You must be logged in to add items to your cart.",
      });
      return;
    }
     if (!productId) return;

    startTransition(async () => {
        try {
            const product = products?.find(p => p.id === productId);
            if (!product) throw new Error("Product not found");
            
            const cartRef = doc(db, 'users', user.uid, 'cart', productId);

            await runTransaction(db, async (transaction) => {
                const cartDoc = await transaction.get(cartRef);
                if (cartDoc.exists()) {
                    transaction.update(cartRef, { quantity: increment(1) });
                } else {
                     transaction.set(cartRef, {
                        productId: product.id,
                        quantity: 1,
                        addedAt: serverTimestamp(),
                        price: product.price,
                        name_en: product.name_en,
                        imageUrl: product.imageUrl,
                    });
                }
            });

            toast({
                title: "Added to Cart",
                description: `${name} has been added to your shopping cart.`,
            });
            setCheckedItems(prev => [...prev, name]);
        } catch (error) {
             console.error("Error adding to cart: ", error);
             toast({
                variant: "destructive",
                title: "Failed to Add",
                description: "Could not add the item to your cart. Please try again.",
             });
        }
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  if (!isLoading && !ritual) {
    notFound();
  }

  if (!ritual) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  const name = (ritual.name as any)[language] || ritual.name.en;
  const description = (ritual.description as any)[language] || ritual.description.en;
  const deity = (ritual.deity as any)[language] || ritual.deity.en;
  const auspiciousTime = ritual.auspiciousTime.en;
  const procedure = ritual.procedure.en || [];
  const itemsRequired = ritual.itemsRequired.en || [];
  const significance = (ritual.significance as any)[language] || ritual.significance.en;
  const benefits = ritual.benefits.en || [];
  const commonMistakes = ritual.commonMistakes.en || [];


  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-6xl mx-auto">
            <header className="text-center mb-8">
                <Badge variant="default" className="mb-2">{deity}</Badge>
                <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary">{name}</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{description}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="aspect-video relative rounded-lg overflow-hidden border-2 border-accent/20">
                        <Image
                            src={ritual.image.url}
                            alt={name}
                            data-ai-hint={ritual.image.hint}
                            fill
                            className="object-cover"
                        />
                    </div>
                      <Card className="bg-transparent border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary"><Sparkles /> Significance & Benefits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-foreground/90">{significance}</p>
                            <Separator/>
                            <h4 className="font-semibold text-md">Benefits:</h4>
                             <ul className="list-disc list-inside space-y-2 text-foreground/80">
                                {benefits.map((benefit: string, index: number) => (
                                    <li key={index}>{benefit}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                      <Card className="bg-transparent border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary"><CheckSquare /> {t.ritualDetail.procedure}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {procedure.map((section: any, sectionIndex: number) => (
                                <div key={sectionIndex}>
                                    <h3 className="font-bold text-lg mb-2">{section.title}</h3>
                                    <ol className="list-decimal list-inside space-y-3 pl-4 border-l-2 border-primary/20">
                                        {section.steps.map((step: string, index: number) => (
                                            <li key={index}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                      <Card className="bg-transparent border-destructive/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-destructive"><AlertTriangle /> Common Mistakes to Avoid</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ul className="list-disc list-inside space-y-2 text-foreground/80">
                                {commonMistakes.map((mistake: string, index: number) => (
                                    <li key={index}>{mistake}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6 lg:sticky top-24 h-fit">
                    <Card className="bg-transparent border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary"><Clock /> {t.ritualDetail.auspiciousTime}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div>
                                <p className="font-semibold">{auspiciousTime.timing}</p>
                                {auspiciousTime.tithi && <p className="text-sm text-muted-foreground">{auspiciousTime.tithi}</p>}
                                <p className="text-xs text-muted-foreground mt-1">{auspiciousTime.notes}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-primary"><ShoppingBasket /> {t.ritualDetail.itemsRequired}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {itemsRequired.map((item: any, index: number) => (
                                <div key={item.name} className="flex items-center gap-3">
                                  <Checkbox 
                                    id={`item-${index}`} 
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            handleAddToCart(item.productId, item.name);
                                        }
                                    }}
                                    checked={checkedItems.includes(item.name)}
                                    disabled={isAddingToCart}
                                  />
                                  <label htmlFor={`item-${index}`} className="text-sm text-foreground">
                                    {item.name}
                                  </label>
                                </div>
                            ))}
                             <Button asChild className="w-full mt-4">
                                <Link href="/shop">
                                    <ShoppingBasket className="mr-2 h-4 w-4" />
                                    Shop for More Ritual Items
                                </Link>
                             </Button>
                        </CardContent>
                    </Card>
                    {ritual.recommendedPlaylist && (
                        <Card className="bg-transparent border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-primary"><Music /> Recommended Playlist</CardTitle>
                                <CardDescription>{ritual.recommendedPlaylist.title}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {ritual.recommendedPlaylist.tracks.map((track: any, index: number) => (
                                    <div key={index} className="text-sm">
                                        <p className="font-semibold text-foreground">{track.title}</p>
                                        <p className="text-xs text-muted-foreground">{track.artist}</p>
                                    </div>
                                ))}
                                <Button asChild variant="outline" className="w-full mt-2">
                                  <Link href={`/playlists/${ritual.recommendedPlaylist.id}`}>
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Listen to Playlist
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
