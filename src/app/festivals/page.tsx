'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, PartyPopper, Loader2, Search, Filter, X, Calendar, Sparkles, TrendingUp, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, isAfter, isBefore, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/use-language';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useFirestore, useAuth } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, DocumentData, orderBy, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { isSuperAdmin } from '@/lib/admin';

type SortOption = 'date' | 'name' | 'popularity';

export default function FestivalsPage() {
  const { language, t } = useLanguage();
  const db = useFirestore();
  const auth = useAuth();
  const [user] = useAuthState(auth);

  const festivalsQuery = useMemo(() => query(collection(db, 'festivals'), where('status', '==', 'published'), orderBy('date', 'asc')), [db]);
  const [festivals, isLoading] = useCollectionData(festivalsQuery, { idField: 'id' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [filteredFestivals, setFilteredFestivals] = useState<DocumentData[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = isSuperAdmin(user);

  useEffect(() => {
    if (festivals) {
      let updatedFestivals = [...festivals];

      // Search filter
      if (searchQuery.trim() !== '') {
        const lowercasedQuery = searchQuery.toLowerCase();
        updatedFestivals = updatedFestivals.filter((festival) => {
          const name = ((festival.name as any)?.[language] || festival.name?.en || '').toLowerCase();
          const description = ((festival.description as any)?.[language] || festival.description?.en || '').toLowerCase();
          const significance = ((festival.significance as any)?.[language] || festival.significance?.en || '').toLowerCase();
          return name.includes(lowercasedQuery) || 
                 description.includes(lowercasedQuery) ||
                 significance.includes(lowercasedQuery);
        });
      }

      // Date filter
      const now = new Date();
      if (filterType === 'upcoming') {
        updatedFestivals = updatedFestivals.filter((festival) => {
          const festivalDate = festival.date?.toDate ? festival.date.toDate() : new Date(festival.date);
          return isAfter(festivalDate, now) || isSameDay(festivalDate, now);
        });
      } else if (filterType === 'past') {
        updatedFestivals = updatedFestivals.filter((festival) => {
          const festivalDate = festival.date?.toDate ? festival.date.toDate() : new Date(festival.date);
          return isBefore(festivalDate, now);
        });
      }

      // Sort
      updatedFestivals.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return dateA.getTime() - dateB.getTime();
          case 'name':
            const nameA = ((a.name as any)?.[language] || a.name?.en || '').toLowerCase();
            const nameB = ((b.name as any)?.[language] || b.name?.en || '').toLowerCase();
            return nameA.localeCompare(nameB);
          case 'popularity':
            return (b.popularity || 0) - (a.popularity || 0);
          default:
            return 0;
        }
      });

      setFilteredFestivals(updatedFestivals);
    }
  }, [searchQuery, sortBy, filterType, festivals, language]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'upcoming') count++;
    if (sortBy !== 'date') count++;
    return count;
  }, [filterType, sortBy]);

  const clearFilters = () => {
    setFilterType('upcoming');
    setSortBy('date');
    setSearchQuery('');
  };

  const getFestivalStatus = (festivalDate: Date) => {
    const now = new Date();
    if (isBefore(festivalDate, now)) return 'past';
    const daysUntil = Math.ceil((festivalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return 'soon';
    return 'upcoming';
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center justify-center gap-3">
                <PartyPopper className="h-10 w-10" /> {t.festivals.title}
            </h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                {t.festivals.description}
            </p>
            {isAdmin && (
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link href="/admin/festivals/new">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Add New Festival
                  </Link>
                </Button>
              </div>
            )}
        </div>

        {/* Search and Filters */}
        <div className="mb-8 max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search festivals by name, description..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg border border-border">
              <div>
                <label className="text-sm font-semibold mb-2 block">Filter by Date</label>
                <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'upcoming' | 'past')}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Festivals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Festivals</SelectItem>
                    <SelectItem value="upcoming">Upcoming Festivals</SelectItem>
                    <SelectItem value="past">Past Festivals</SelectItem>
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
                    <SelectItem value="date">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date
                      </div>
                    </SelectItem>
                    <SelectItem value="name">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Name (A-Z)
                      </div>
                    </SelectItem>
                    <SelectItem value="popularity">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Popularity
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Results Count */}
          {filteredFestivals.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredFestivals.length} of {festivals?.length || 0} festivals
            </div>
          )}
        </div>

        {/* Festivals Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        ) : filteredFestivals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredFestivals.map((festival: any) => {
              const name = festival.name?.[language] || festival.name?.en || '';
              const description = festival.description?.[language] || festival.description?.en || '';
              const festivalDate = festival.date?.toDate ? festival.date.toDate() : new Date(festival.date);
              const status = getFestivalStatus(festivalDate);
              const daysUntil = Math.ceil((festivalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

              return (
                <Card 
                  key={festival.id} 
                  className="flex flex-col overflow-hidden group border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-card to-secondary/30"
                >
                  <CardContent className="p-0 relative">
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={festival.image?.url || '/placeholder.jpg'}
                        alt={name}
                        data-ai-hint={festival.image?.hint}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        priority={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        {status === 'soon' && (
                          <Badge variant="default" className="bg-orange-500 shadow-lg animate-pulse">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          </Badge>
                        )}
                        {status === 'upcoming' && (
                          <Badge variant="secondary" className="bg-green-500/80 shadow-lg">
                            <Calendar className="h-3 w-3 mr-1" />
                            Upcoming
                          </Badge>
                        )}
                        {status === 'past' && (
                          <Badge variant="outline" className="bg-gray-500/80 shadow-lg">
                            Past
                          </Badge>
                        )}
                      </div>
                      {festival.popularity > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                          <Sparkles className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-white font-semibold">{festival.popularity}</span>
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
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(festivalDate, 'MMM do, yyyy')}
                      </Badge>
                      {festival.duration && (
                        <Badge variant="outline" className="text-xs">
                          {festival.duration}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button asChild className="w-full group/button">
                      <Link href={`/festivals/${festival.slug}`}>
                        {t.buttons.learnMore}
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
              <PartyPopper className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No festivals found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType !== 'upcoming' || sortBy !== 'date'
                  ? "Try adjusting your filters or search terms."
                  : "No festivals available at the moment."}
              </p>
              {(searchQuery || filterType !== 'upcoming' || sortBy !== 'date') && (
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
