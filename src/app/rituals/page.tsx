'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookHeart, Loader2, Search, Filter, X, Star, TrendingUp, Clock, Award, Sparkles, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/use-language';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, DocumentData, orderBy, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SortOption = 'popularity' | 'name' | 'difficulty' | 'newest';

export default function RitualsPage() {
  const { language, t } = useLanguage();
  const db = useFirestore();

  const ritualsQuery = useMemo(() => query(collection(db, 'rituals'), where('status', '==', 'published'), orderBy('popularity', 'desc')), [db]);
  const [rituals, isLoading] = useCollectionData(ritualsQuery, { idField: 'id' });
  
  const deitiesQuery = useMemo(() => query(collection(db, 'deities'), where('status', '==', 'published')), [db]);
  const [deities, loadingDeities] = useCollectionData(deitiesQuery, { idField: 'id' });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDeity, setFilterDeity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [filteredRituals, setFilteredRituals] = useState<DocumentData[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Create a map of deity name to deity slug for filtering
  const deityNameToSlug = useMemo(() => {
    const map = new Map<string, string>();
    deities?.forEach((deity: any) => {
      // Map all language variations of deity name to slug
      Object.values(deity.name || {}).forEach((name: any) => {
        if (name) map.set(name.toLowerCase().trim(), deity.slug);
      });
      map.set(deity.slug, deity.slug); // Also map slug to slug
    });
    return map;
  }, [deities]);

  // Create a map of deity slug to deity data for images
  const deitySlugToData = useMemo(() => {
    const map = new Map<string, any>();
    deities?.forEach((deity: any) => {
      map.set(deity.slug, deity);
      // Also map by name variations
      Object.values(deity.name || {}).forEach((name: any) => {
        if (name) map.set(name.toLowerCase().trim(), deity);
      });
    });
    return map;
  }, [deities]);

  // Get deity image for a ritual
  const getDeityImage = (ritual: any) => {
    if (!deities || !ritual) return null;
    
    const deityName = (ritual.deity?.[language] || ritual.deity?.en || '').toLowerCase().trim();
    const deity = deitySlugToData.get(deityName) || deitySlugToData.get(ritual.deitySlug || '');
    
    return deity?.images?.[0]?.url || null;
  };

  // Get deity slug for a ritual
  const getDeitySlug = (ritual: any): string | null => {
    if (!ritual) return null;
    
    // First check if ritual has deitySlug field
    if (ritual.deitySlug) return ritual.deitySlug;
    
    // Otherwise, try to match by deity name
    const deityName = (ritual.deity?.[language] || ritual.deity?.en || '').toLowerCase().trim();
    return deityNameToSlug.get(deityName) || null;
  };

  useEffect(() => {
    if (rituals) {
        let updatedRituals = [...rituals];

        // Search filter
        if (searchQuery.trim() !== '') {
          const lowercasedQuery = searchQuery.toLowerCase();
          updatedRituals = updatedRituals.filter(ritual => {
            const name = (ritual.name?.[language] || ritual.name?.en || '').toLowerCase();
            const description = (ritual.description?.[language] || ritual.description?.en || '').toLowerCase();
            const deity = (ritual.deity?.[language] || ritual.deity?.en || '').toLowerCase();
            const keywords = (ritual.keywords || []).join(' ').toLowerCase();
            const significance = (ritual.significance?.[language] || ritual.significance?.en || '').toLowerCase();
            
            return name.includes(lowercasedQuery) ||
                   description.includes(lowercasedQuery) ||
                   deity.includes(lowercasedQuery) ||
                   keywords.includes(lowercasedQuery) ||
                   significance.includes(lowercasedQuery);
          });
        }

        // Deity filter
        if (filterDeity !== 'all') {
          updatedRituals = updatedRituals.filter(ritual => {
            const ritualDeitySlug = getDeitySlug(ritual);
            return ritualDeitySlug === filterDeity;
          });
        }

        // Difficulty filter
        if (difficultyFilter !== 'all') {
          updatedRituals = updatedRituals.filter(ritual => {
            return ritual.difficulty === difficultyFilter;
          });
        }

        // Sort
        updatedRituals.sort((a, b) => {
          switch (sortBy) {
            case 'popularity':
              return (b.popularity || 0) - (a.popularity || 0);
            case 'name':
              const nameA = (a.name?.[language] || a.name?.en || '').toLowerCase();
              const nameB = (b.name?.[language] || b.name?.en || '').toLowerCase();
              return nameA.localeCompare(nameB);
            case 'difficulty':
              const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
              return (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0) - 
                     (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0);
            case 'newest':
              return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
            default:
              return 0;
          }
        });
        
        setFilteredRituals(updatedRituals);
    }
  }, [searchQuery, filterDeity, sortBy, difficultyFilter, rituals, language, deityNameToSlug]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterDeity !== 'all') count++;
    if (difficultyFilter !== 'all') count++;
    if (sortBy !== 'popularity') count++;
    return count;
  }, [filterDeity, difficultyFilter, sortBy]);

  const clearFilters = () => {
    setFilterDeity('all');
    setDifficultyFilter('all');
    setSortBy('popularity');
    setSearchQuery('');
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center justify-center gap-3">
                <BookHeart className="h-10 w-10" /> {t.rituals.title}
            </h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                {t.rituals.description}
            </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search rituals by name, deity, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="h-12 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg border border-border">
              <div>
                <label className="text-sm font-semibold mb-2 block">Filter by Deity</label>
                <Select value={filterDeity} onValueChange={setFilterDeity}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Deities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Deities</SelectItem>
                    {deities?.map((deity: any) => (
                      <SelectItem key={deity.slug} value={deity.slug}>
                        <div className="flex items-center gap-2">
                          {deity.images?.[0]?.url ? (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={deity.images[0].url} alt={deity.name.en} />
                              <AvatarFallback>
                                <ImageIcon className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                          <span>{deity.name[language] || deity.name.en}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-semibold mb-2 block">Difficulty Level</label>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Popularity
                      </div>
                    </SelectItem>
                    <SelectItem value="name">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Name (A-Z)
                      </div>
                    </SelectItem>
                    <SelectItem value="difficulty">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Difficulty
                      </div>
                    </SelectItem>
                    <SelectItem value="newest">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Newest
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Results Count */}
          {filteredRituals.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredRituals.length} of {rituals?.length || 0} rituals
            </div>
          )}
        </div>

        {/* Rituals Grid */}
        {isLoading || loadingDeities ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        ) : filteredRituals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredRituals.map((ritual: any) => {
              const name = ritual.name?.[language] || ritual.name?.en || '';
              const description = ritual.description?.[language] || ritual.description?.en || '';
              const deityName = ritual.deity?.[language] || ritual.deity?.en || '';
              const deityImage = getDeityImage(ritual);
              const difficulty = ritual.difficulty || 'Beginner';
              const popularity = ritual.popularity || 0;

              return (
                <Card 
                  key={ritual.id} 
                  className="flex flex-col overflow-hidden group border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-card to-secondary/30"
                >
                  <CardContent className="p-0 relative">
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={ritual.image?.url || '/placeholder.jpg'}
                        alt={name}
                        data-ai-hint={ritual.image?.hint}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        priority={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {difficulty && (
                          <Badge 
                            variant={difficulty === 'Beginner' ? 'default' : difficulty === 'Intermediate' ? 'secondary' : 'destructive'}
                            className="shadow-lg"
                          >
                            {difficulty}
                          </Badge>
                        )}
                      </div>
                      {popularity > 0 && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-white font-semibold">{popularity}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-primary text-lg line-clamp-2 group-hover:text-primary/80 transition-colors flex-1">
                        {name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {deityImage ? (
                        <Avatar className="h-6 w-6 border-2 border-primary/30">
                          <AvatarImage src={deityImage} alt={deityName} />
                          <AvatarFallback>
                            <Sparkles className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                      <Badge variant="secondary" className="text-xs">
                        {deityName}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button asChild className="w-full group/button">
                      <Link href={`/rituals/${ritual.slug}`}>
                        {t.buttons.viewProcedure}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <BookHeart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No rituals found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterDeity !== 'all' || difficultyFilter !== 'all'
                  ? "Try adjusting your filters or search terms."
                  : "No rituals available at the moment."}
              </p>
              {(searchQuery || filterDeity !== 'all' || difficultyFilter !== 'all') && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        )}
    </main>
  );
}
