
'use client';

import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Plus, Minus, Sparkles, Calendar, Star, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, runTransaction, increment, serverTimestamp, collection } from 'firebase/firestore';
import { useTransition, useState, useMemo } from 'react';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { productConverter, type Product } from '@/lib/products';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const [isAdding, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);

  const productRef = doc(db, 'products', productId).withConverter(productConverter);
  const [product, isLoading] = useDocumentData<Product>(productRef);
  
  // Fetch festivals for relevance display
  const festivalsQuery = useMemo(() => db ? collection(db, 'festivals') : undefined, [db]);
  const [festivalsSnapshot] = useCollection(festivalsQuery);
  const festivals = useMemo(() => 
    festivalsSnapshot?.docs.map(doc => ({ id: doc.id, slug: doc.data().slug, ...doc.data() })) || [],
    [festivalsSnapshot]
  );

  const handleAddToCart = () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: "Login Required",
        description: "You must be logged in to add items to your cart.",
      });
      return;
    }
     if (!product) return;

    startTransition(async () => {
        try {
            const cartRef = doc(db, 'users', user.uid, 'cart', product.id);

            await runTransaction(db, async (transaction) => {
                const cartDoc = await transaction.get(cartRef);
                if (cartDoc.exists()) {
                    transaction.update(cartRef, { quantity: increment(quantity) });
                } else {
                     transaction.set(cartRef, {
                        productId: product.id,
                        quantity: quantity,
                        addedAt: serverTimestamp(),
                        price: product.price,
                        name_en: product.name_en,
                        imageUrl: product.imageUrl,
                        shopId: product.shopId,
                    });
                }
            });

            toast({
                title: "Added to Cart",
                description: `${quantity} x ${name} has been added to your shopping cart.`,
            });
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
  
  if(isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  if (!product) {
    return notFound();
  }

  const name = product[`name_${language}` as keyof typeof product] || product.name_en;
  const description = product[`description_${language}` as keyof typeof product] || product.description_en;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  
  // Get relevance information
  const relevantFestivals = (product as any).relevantFestivals || (product as any).relatedFestivals || [];
  const relevantOccasions = (product as any).relevantOccasions || (product as any).bestFor || [];
  const relevantDeities = (product as any).relevantDeities || (product as any).associatedDeities || [];
  const relevantRituals = (product as any).relevantRituals || [];
  
  // Get festival names
  const getFestivalName = (festivalSlug: string): string => {
    const festival = festivals.find((f: any) => f.slug === festivalSlug);
    if (festival) {
      return festival.name?.[language] || festival.name?.en || festival.name_en || festivalSlug;
    }
    const commonNames: Record<string, string> = {
      'diwali': 'Diwali',
      'karva-chauth': 'Karva Chauth',
      'karva-chauth-purnima': 'Karva Chauth Purnima',
      'dussehra': 'Dussehra',
      'holi': 'Holi',
      'janmashtami': 'Janmashtami',
      'navratri': 'Navratri',
      'rakhi': 'Rakhi',
    };
    return commonNames[festivalSlug] || festivalSlug.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  const festivalNames = relevantFestivals.map((slug: string) => ({
    slug,
    name: getFestivalName(slug)
  }));


  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16 max-w-6xl mx-auto">
        <div>
           <Card className="overflow-hidden">
             <div className="aspect-square relative">
                <Image
                    src={product.imageUrl || `https://placehold.co/800x800/e5e7eb/9ca3af?text=${encodeURIComponent(name)}`}
                    alt={name}
                    data-ai-hint={product.imageHint || 'product'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                />
                 {hasDiscount && (
                    <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-lg">
                        {discountPercent}% OFF
                    </Badge>
                )}
             </div>
           </Card>
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-tight text-primary">{name}</h1>
            <div className="flex items-baseline gap-4 mt-4">
              <p className="text-3xl font-semibold">₹{product.price.toFixed(2)}</p>
               {hasDiscount && (
                  <p className="text-xl text-muted-foreground line-through">₹{product.originalPrice.toFixed(2)}</p>
              )}
          </div>
          {/* Relevance Information */}
          {(festivalNames.length > 0 || relevantOccasions.length > 0 || relevantDeities.length > 0) && (
            <Card className="mt-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Perfect For
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Festivals */}
                {festivalNames.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Festivals
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {festivalNames.map((festival: { slug: string; name: string }, index: number) => (
                        <Link key={index} href={`/festivals/${festival.slug}`}>
                          <Badge 
                            variant="outline" 
                            className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 border-purple-500/30 hover:border-purple-500/50 cursor-pointer transition-colors"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {festival.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Occasions */}
                {relevantOccasions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Occasions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {relevantOccasions.map((occasion: string, index: number) => (
                        <Badge 
                          key={`occasion-${index}`}
                          variant="outline" 
                          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 border-blue-500/30"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {occasion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Deities */}
                {relevantDeities.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Deities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {relevantDeities.map((deitySlug: string, index: number) => (
                        <Link key={index} href={`/deities/${deitySlug}`}>
                          <Badge 
                            variant="outline" 
                            className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 text-orange-700 border-orange-500/30 hover:border-orange-500/50 cursor-pointer transition-colors"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {deitySlug.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card className="mt-6 bg-transparent border-primary/20">
            <CardHeader>
                <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
          
          <div className="flex items-center gap-4 mt-8">
            <div className="flex items-center gap-2 rounded-md border p-2">
                <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="font-bold w-10 text-center">{quantity}</span>
                 <Button variant="ghost" size="icon" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={isAdding}>
                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                {t.buttons.addToCart}
            </Button>
          </div>

        </div>
      </div>
    </main>
  );
}
