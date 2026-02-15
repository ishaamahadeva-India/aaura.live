'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Search, Filter, Star, TrendingUp, Percent, Gift, Truck, Shield, Flower, Eye, Clock, ArrowRight, X, ChevronDown, ChevronUp, Check, Plus, Minus, Sparkles, Calendar, Star as StarIcon } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import Link from 'next/link';
import { doc, setDoc, serverTimestamp, runTransaction, increment, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { productConverter, type Product } from '@/lib/products';
import { Badge } from '@/components/ui/badge';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular' | 'discount';
type FilterOption = 'all' | 'on-sale' | 'new' | 'bestseller';

// Product Card Component with Like and Quantity
function ProductCard({ 
  product, 
  language, 
  isAdding, 
  likingProductId,
  quantity, 
  onQuantityChange, 
  onAddToCart, 
  onLike,
  festivals = []
}: { 
  product: Product;
  language: string;
  isAdding: boolean;
  likingProductId: string | null;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  onLike: (isLiked: boolean) => void;
  festivals?: any[];
}) {
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  
  const likeRef = user ? doc(db, `products/${product.id}/likes/${user.uid}`) : undefined;
  const [likeDoc] = useDocumentData(likeRef);
  const isLiked = !!likeDoc;
  
  const name = product[`name_${language}` as keyof typeof product] || product.name_en;
  const description = product[`description_${language}` as keyof typeof product] || product.description_en;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  const rating = (product as any).rating || 4.5;
  const reviews = (product as any).reviews || Math.floor(Math.random() * 100) + 10;
  const inStock = (product as any).inStock !== false;
  const stock = (product as any).stock || 'Available';
  const likesCount = (product as any).likes || 0;
  
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
    // Common festival names mapping
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
    <Card className="flex flex-col h-full overflow-hidden group border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-0 relative flex-shrink-0">
        <div className="aspect-square relative overflow-hidden bg-secondary">
          <Link href={`/shop/${product.id}`}>
            <Image
              src={product.imageUrl || `https://placehold.co/600x600/e5e7eb/9ca3af?text=${encodeURIComponent(name as string)}`}
              alt={name as string}
              data-ai-hint={product.imageHint || "product image"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Link>
          {/* Discount Badge */}
          {hasDiscount && (
            <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1 z-10">
              <Percent className="h-3 w-3 mr-1" />
              {discountPercent}% OFF
            </Badge>
          )}
          {/* New Badge */}
          {(product as any).isNew && (
            <Badge className="absolute top-3 right-3 bg-green-500 text-white z-10">
              NEW
            </Badge>
          )}
          {/* Bestseller Badge */}
          {(product as any).isBestseller && (
            <Badge className="absolute bottom-3 left-3 bg-yellow-500 text-white z-10">
              <TrendingUp className="h-3 w-3 mr-1" />
              Bestseller
            </Badge>
          )}
          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-20">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/shop/${product.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Quick View
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardHeader className="flex-1 flex flex-col p-4 pb-2 min-h-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {name as string}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "shrink-0 transition-opacity h-8 w-8",
              user ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={() => onLike(isLiked)}
            disabled={likingProductId === product.id}
          >
            {likingProductId === product.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flower className={cn("h-4 w-4", isLiked && "fill-pink-500 text-pink-500")} />
            )}
          </Button>
        </div>
        
        {/* Rating and Likes */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              ({reviews} reviews)
            </span>
          </div>
          {user && likesCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
              <Flower className="h-3 w-3" />
              <span>{likesCount}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <p className="text-2xl font-bold text-primary">₹{product.price.toFixed(2)}</p>
          {hasDiscount && (
            <>
              <p className="text-lg text-muted-foreground line-through">₹{product.originalPrice!.toFixed(2)}</p>
              <Badge variant="secondary" className="bg-green-500/20 text-green-700 text-xs">
                Save ₹{(product.originalPrice! - product.price).toFixed(2)}
              </Badge>
            </>
          )}
        </div>

        {/* Stock Status */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {inStock ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-xs">
              <Check className="h-3 w-3 mr-1" />
              {stock}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30 text-xs">
              Out of Stock
            </Badge>
          )}
          {hasDiscount && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30 text-xs">
              <Gift className="h-3 w-3 mr-1" />
              Special Offer
            </Badge>
          )}
        </div>

        {/* Relevance Information */}
        {(festivalNames.length > 0 || relevantOccasions.length > 0 || relevantDeities.length > 0) && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Perfect For:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {festivalNames.map((festival: { slug: string; name: string }, index: number) => (
                <Link key={index} href={`/festivals/${festival.slug}`}>
                  <Badge 
                    variant="outline" 
                    className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 border-purple-500/30 hover:border-purple-500/50 cursor-pointer transition-colors text-xs"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {festival.name}
                  </Badge>
                </Link>
              ))}
              {relevantOccasions.map((occasion: string, index: number) => (
                <Badge 
                  key={`occasion-${index}`}
                  variant="outline" 
                  className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 border-blue-500/30 text-xs"
                >
                  <StarIcon className="h-3 w-3 mr-1" />
                  {occasion}
                </Badge>
              ))}
              {relevantDeities.map((deitySlug: string, index: number) => (
                <Link key={index} href={`/deities/${deitySlug}`}>
                  <Badge 
                    variant="outline" 
                    className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 text-orange-700 border-orange-500/30 hover:border-orange-500/50 cursor-pointer transition-colors text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {deitySlug.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            <span>Free Shipping</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Authentic</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 p-4 pt-2 flex-shrink-0">
        {/* Quantity Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Quantity:</span>
          <div className="flex items-center gap-2 rounded-md border p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onQuantityChange(-1)} 
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-bold w-8 text-center">{quantity}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onQuantityChange(1)} 
              disabled={quantity >= 99}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button 
          onClick={onAddToCart} 
          disabled={isAdding || !inStock}
          className="w-full"
          size="lg"
        >
          {isAdding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : !inStock ? (
            'Out of Stock'
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add {quantity > 1 ? `${quantity} x ` : ''}to Cart
            </>
          )}
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/shop/${product.id}`}>
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ShopPage() {
  const { t, language } = useLanguage();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [likingProductId, setLikingProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const productsQuery = useMemo(() => db ? collection(db, 'products').withConverter(productConverter) : undefined, [db]);
  const [productsSnapshot, isLoading] = useCollection(productsQuery);
  
  // Fetch festivals for relevance display
  const festivalsQuery = useMemo(() => db ? collection(db, 'festivals') : undefined, [db]);
  const [festivalsSnapshot] = useCollection(festivalsQuery);
  const festivals = useMemo(() => 
    festivalsSnapshot?.docs.map(doc => ({ id: doc.id, slug: doc.data().slug, ...doc.data() })) || [],
    [festivalsSnapshot]
  );

  const products = useMemo(() => 
    productsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [],
    [productsSnapshot]
  );

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: Product) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product: Product) => {
        const name = ((product[`name_${language}` as keyof typeof product] || product.name_en) as string).toLowerCase();
        const description = ((product[`description_${language}` as keyof typeof product] || product.description_en) as string).toLowerCase();
        const category = (product.category || '').toLowerCase();
        const relevantFestivals = ((product as any).relevantFestivals || (product as any).relatedFestivals || []).join(' ').toLowerCase();
        const relevantOccasions = ((product as any).relevantOccasions || (product as any).bestFor || []).join(' ').toLowerCase();
        const relevantDeities = ((product as any).relevantDeities || (product as any).associatedDeities || []).join(' ').toLowerCase();
        return name.includes(query) || 
               description.includes(query) || 
               category.includes(query) ||
               relevantFestivals.includes(query) ||
               relevantOccasions.includes(query) ||
               relevantDeities.includes(query);
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((product: Product) => product.category === selectedCategory);
    }

    // Special filters
    if (filterBy === 'on-sale') {
      filtered = filtered.filter((product: Product) => product.originalPrice && product.originalPrice > product.price);
    } else if (filterBy === 'new') {
      // Assuming new products are those added recently
      filtered = filtered.slice(0, Math.min(filtered.length, 10));
    } else if (filterBy === 'bestseller') {
      // Assuming bestsellers are products with high ratings or popularity
      filtered = filtered.filter((product: Product) => (product as any).rating >= 4 || (product as any).popularity > 50);
    }

    // Sort
    filtered.sort((a: Product, b: Product) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'discount':
          const aDiscount = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
          const bDiscount = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
          return bDiscount - aDiscount;
        case 'popular':
          const aPop = (a as any).popularity || 0;
          const bPop = (b as any).popularity || 0;
          return bPop - aPop;
        case 'newest':
        default:
          return 0; // Keep original order for newest
      }
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, filterBy, sortBy, language]);

  // Initialize quantities
  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    products.forEach((product: Product) => {
      initialQuantities[product.id] = 1;
    });
    setProductQuantities(initialQuantities);
  }, [products]);

  const handleQuantityChange = (productId: string, delta: number) => {
    setProductQuantities(prev => {
      const current = prev[productId] || 1;
      const newQuantity = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [productId]: newQuantity };
    });
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: "Login Required",
        description: "You must be logged in to add items to your cart.",
      });
      return;
    }
    
    const quantity = productQuantities[product.id] || 1;
    setAddingProductId(product.id);

    runTransaction(db, async (transaction) => {
        const cartRef = doc(db, 'users', user.uid, 'cart', product.id);
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
    }).then(() => {
        toast({
            title: "Added to Cart",
            description: `${quantity} x ${product.name_en} has been added to your shopping cart.`,
        });
        // Reset quantity after adding
        setProductQuantities(prev => ({ ...prev, [product.id]: 1 }));
    }).catch((error) => {
        console.error("Error adding to cart: ", error);
         toast({
            variant: "destructive",
            title: "Failed to Add",
            description: "Could not add the item to your cart. Please try again.",
         });
    }).finally(() => {
        setAddingProductId(null);
    });
  };

  // Get like status for each product
  const productLikes = useMemo(() => {
    if (!user || !products.length) return {};
    const likes: Record<string, boolean> = {};
    // This will be populated by individual useDocumentData hooks in the component
    return likes;
  }, [user, products]);

  const handleLike = async (product: Product, isCurrentlyLiked: boolean) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: "Login Required",
        description: "You must be logged in to like products.",
      });
      return;
    }

    setLikingProductId(product.id);
    const productRef = doc(db, 'products', product.id);
    const likeRef = doc(db, `products/${product.id}/likes/${user.uid}`);
    
    try {
      const batch = writeBatch(db);
      
      if (isCurrentlyLiked) {
        batch.delete(likeRef);
        batch.update(productRef, { 
          likes: increment(-1)
        });
      } else {
        batch.set(likeRef, { 
          createdAt: serverTimestamp(),
          userId: user.uid 
        });
        batch.update(productRef, { 
          likes: increment(1)
        });
      }
      
      await batch.commit();
      
      toast({
        title: isCurrentlyLiked ? "Removed from favorites" : "Added to favorites",
        description: isCurrentlyLiked ? "Product removed from your favorites." : "Product added to your favorites.",
      });
    } catch (error: any) {
      console.error("Error toggling like: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update like status. Please try again.",
      });
      const permissionError = new FirestorePermissionError({
        path: likeRef.path,
        operation: isCurrentlyLiked ? 'delete' : 'create',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setLikingProductId(null);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const onSale = products.filter((p: Product) => p.originalPrice && p.originalPrice > p.price).length;
    const totalProducts = products.length;
    const avgDiscount = products
      .filter((p: Product) => p.originalPrice && p.originalPrice > p.price)
      .reduce((sum, p) => {
        const discount = ((p.originalPrice! - p.price) / p.originalPrice!) * 100;
        return sum + discount;
      }, 0) / (onSale || 1);
    
    return { onSale, totalProducts, avgDiscount: Math.round(avgDiscount) };
  }, [products]);

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary mb-4">
          {t.shop?.title || 'Spiritual Marketplace'}
        </h1>
        <p className="max-w-3xl mx-auto text-lg text-muted-foreground">
          {t.shop?.description || 'Discover authentic spiritual products, puja items, and sacred artifacts'}
        </p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalProducts}</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Sale</p>
                <p className="text-3xl font-bold text-red-600">{stats.onSale}</p>
              </div>
              <Percent className="h-12 w-12 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Discount</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.avgDiscount}%</p>
              </div>
              <TrendingUp className="h-12 w-12 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Free Shipping</p>
                <p className="text-lg font-bold text-blue-600">On ₹500+</p>
              </div>
              <Truck className="h-12 w-12 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search products by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="on-sale">On Sale</SelectItem>
              <SelectItem value="new">New Arrivals</SelectItem>
              <SelectItem value="bestseller">Bestsellers</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="discount">Highest Discount</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || selectedCategory !== 'all' || filterBy !== 'all' || sortBy !== 'newest') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setFilterBy('all');
                setSortBy('newest');
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedProducts.length} of {products.length} products
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : filteredAndSortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedProducts.map((product: Product) => {
            const isAdding = addingProductId === product.id;
            const quantity = productQuantities[product.id] || 1;

            return (
              <ProductCard
                key={product.id}
                product={product}
                language={language}
                isAdding={isAdding}
                likingProductId={likingProductId}
                quantity={quantity}
                onQuantityChange={(delta) => handleQuantityChange(product.id, delta)}
                onAddToCart={() => handleAddToCart(product)}
                onLike={(isLiked) => handleLike(product, isLiked)}
                festivals={festivals}
              />
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-16">
          <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground/50 mb-4" />
          <CardTitle className="text-2xl mb-2">No Products Found</CardTitle>
          <CardDescription className="mb-4">
            {searchQuery || selectedCategory !== 'all' || filterBy !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No products available at the moment.'}
          </CardDescription>
          {(searchQuery || selectedCategory !== 'all' || filterBy !== 'all') && (
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setFilterBy('all');
            }}>
              Clear Filters
            </Button>
          )}
        </Card>
      )}
    </main>
  );
}
