'use client';

import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, BookOpen, Sparkles, Building, Utensils, Plane, Users, Bookmark, Loader2, Globe, Phone, Navigation, Mail, ExternalLink, Calendar, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useToast } from '@/hooks/use-toast';
import { getTempleBySlug } from '@/lib/temples';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Posts } from '@/components/Posts';
import { Comments } from '@/components/comments';
import { useFirestore as useFirestoreHook } from '@/lib/firebase/provider';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';


const getText = (field: { [key: string]: string } | undefined, lang: string = 'en') => {
    if (!field) return "";
    return field[lang] || field.en || Object.values(field)[0] || "";
};

function InfoCard({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) {
    return (
        <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-primary"><Icon className="h-5 w-5" />{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                {children}
            </CardContent>
        </Card>
    )
}

function ContactList({ items, type }: { items?: { name?: string, phone?: string, description?: string }[], type?: string }) {
    if (!items || items.length === 0) return <p className="text-muted-foreground">Not available.</p>;
    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <div key={index} className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                            <h5 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.name}</h5>
                            {item.description && (
                                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            )}
                        </div>
                        {item.phone && (
                            <a 
                                href={`tel:${item.phone}`} 
                                className="flex items-center gap-2 text-primary hover:text-primary/80 hover:underline transition-all shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Phone className="h-4 w-4" /> 
                                <span className="text-sm font-medium">{item.phone}</span>
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function PlacesToVisit({ places }: { places?: { name?: string, description?: string }[] }) {
    if (!places || places.length === 0) return <p className="text-muted-foreground">Not available.</p>;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {places.map((place, index) => (
                <Card key={index} className="border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                    <CardContent className="p-4">
                        <h5 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            <Navigation className="h-4 w-4" />
                            {place.name}
                        </h5>
                        {place.description && (
                            <p className="text-sm text-muted-foreground mt-2">{place.description}</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}


function TempleInfo({ temple, language }: { temple: any, language: string }) {
    const { t } = useLanguage();
    const mythologicalImportance = getText(temple.importance.mythological, language);
    const historicalImportance = getText(temple.importance.historical, language);
    const festivals = getText(temple.visitingInfo.festivals, language);
    const timings = getText(temple.visitingInfo.timings, language);
    const dressCode = getText(temple.visitingInfo.dressCode, language);
    const poojaGuidelines = getText(temple.visitingInfo.poojaGuidelines, language);
    
    // Google Maps link
    const mapsLink = `https://www.google.com/maps?q=${temple.location.geo.lat},${temple.location.geo.lng}`;
    
    return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mt-8">
            <div className="lg:col-span-2 space-y-8">
                <InfoCard title={t.templeDetail.significance} icon={BookOpen}>
                    <div>
                        <h4 className="font-semibold text-lg mb-2">{t.templeDetail.mythologicalImportance}</h4>
                        <p className="text-foreground/90 leading-relaxed">{mythologicalImportance}</p>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold text-lg mb-2">{t.templeDetail.historicalImportance}</h4>
                        <p className="text-foreground/90 leading-relaxed">{historicalImportance}</p>
                    </div>
                </InfoCard>
                
                <InfoCard title={t.templeDetail.festivals} icon={Sparkles}>
                    <div className="space-y-2">
                        <p className="text-foreground/90 leading-relaxed">{festivals}</p>
                    </div>
                </InfoCard>

                {/* Location Card */}
                <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-primary">
                            <MapPin className="h-5 w-5" /> Location
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="font-semibold text-foreground">{temple.location.address}</p>
                            <p className="text-muted-foreground">
                                {temple.location.city}, {temple.location.district}, {temple.location.state}
                            </p>
                            <p className="text-muted-foreground">PIN: {temple.location.pincode}</p>
                        </div>
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                            <Button 
                                asChild 
                                variant="outline" 
                                className="flex items-center gap-2"
                            >
                                <a 
                                    href={mapsLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2"
                                >
                                    <Navigation className="h-4 w-4" />
                                    Open in Maps
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </Button>
                            <Button 
                                variant="outline" 
                                className="flex items-center gap-2"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${temple.location.address}, ${temple.location.city}, ${temple.location.state} ${temple.location.pincode}`);
                                    // toast will be handled by parent component
                                }}
                            >
                                <MapPin className="h-4 w-4" />
                                Copy Address
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <InfoCard title={t.templeDetail.visitingInfo} icon={Clock}>
                    <div className="space-y-3">
                        <div>
                            <p className="font-semibold text-foreground mb-1">{t.templeDetail.timings}:</p>
                            <p className="text-foreground/90">{timings}</p>
                        </div>
                        <Separator />
                        <div>
                            <p className="font-semibold text-foreground mb-1">{t.templeDetail.dressCode}:</p>
                            <p className="text-foreground/90">{dressCode}</p>
                        </div>
                        <Separator />
                        <div>
                            <p className="font-semibold text-foreground mb-1">{t.templeDetail.poojaGuidelines}:</p>
                            <p className="text-foreground/90">{poojaGuidelines}</p>
                        </div>
                    </div>
                </InfoCard>

                <InfoCard title={t.templeDetail.travelFacilities} icon={Plane}>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold text-md flex items-center gap-2 mb-2">
                                <Building className="h-4 w-4" />
                                {t.templeDetail.accommodation}
                            </h4>
                            <ContactList items={temple.nearbyInfo.accommodation} />
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-bold text-md flex items-center gap-2 mb-2">
                                <Utensils className="h-4 w-4" />
                                {t.templeDetail.food}
                            </h4>
                            <ContactList items={temple.nearbyInfo.food} />
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-bold text-md flex items-center gap-2 mb-2">
                                <Plane className="h-4 w-4" />
                                {t.templeDetail.transport}
                            </h4>
                            <ContactList items={temple.nearbyInfo.transport} />
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-bold text-md flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4" />
                                Suggested Guides
                            </h4>
                            <ContactList items={temple.nearbyInfo.guides} />
                        </div>
                        {temple.nearbyInfo.placesToVisit && temple.nearbyInfo.placesToVisit.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-bold text-md flex items-center gap-2 mb-2">
                                        <Navigation className="h-4 w-4" />
                                        Nearby Places to Visit
                                    </h4>
                                    <PlacesToVisit places={temple.nearbyInfo.placesToVisit} />
                                </div>
                            </>
                        )}
                    </div>
                </InfoCard>
            </div>
        </div>
    )
}


export default function TempleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language, t } = useLanguage();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const temple = getTempleBySlug(slug);
  const loading = false;

  // Bookmark functionality
  const bookmarkRef = useMemo(() => {
    if (!user || !temple || !db) return undefined;
    return doc(db, `users/${user.uid}/bookmarks`, temple.id);
  }, [user, temple, db]);

  const [bookmark, bookmarkLoading] = useDocumentData(bookmarkRef);

  const handleBookmark = async () => {
    if (!user || !temple) {
        toast({ variant: 'destructive', title: 'You must be logged in to bookmark a temple.' });
        return;
    }
    
    try {
      if (bookmark) {
        await deleteDoc(bookmarkRef!);
        toast({ title: 'Bookmark removed', description: `${temple.name[language] || temple.name.en} has been removed from your bookmarks.` });
      } else {
        await setDoc(bookmarkRef!, {
          templeId: temple.id,
          templeSlug: temple.slug,
          bookmarkedAt: serverTimestamp(),
        });
        toast({ title: 'Bookmarked!', description: `${temple.name[language] || temple.name.en} has been added to your bookmarks.` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to update bookmark', description: 'Please try again.' });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/temples/${temple?.slug}`;
    const shareData = {
      title: temple?.name[language] || temple?.name.en || 'Temple',
      text: `Check out ${temple?.name[language] || temple?.name.en} on Aaura`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: "Shared!", description: "Temple shared successfully." });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link Copied!", description: "The temple link has been copied to your clipboard." });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({ title: "Link Copied!", description: "The temple link has been copied to your clipboard." });
        } catch (clipboardError) {
          toast({ variant: 'destructive', title: 'Share Failed', description: 'Could not share the temple.' });
        }
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>
  }

  if (!loading && !temple) {
    notFound();
  }

  if (!temple) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  const name = getText(temple.name, language);
  const deityName = getText(temple.deity.name, language);
  const mythologicalImportance = getText(temple.importance.mythological, language);
  
  const templeJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: name,
      description: mythologicalImportance,
      image: temple.media.images.map((img: any) => img.url),
      address: {
        '@type': 'PostalAddress',
        streetAddress: temple.location.address,
        addressLocality: temple.location.city,
        addressRegion: temple.location.state,
        postalCode: temple.location.pincode,
        addressCountry: 'IN'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: temple.location.geo.lat,
        longitude: temple.location.geo.lng
      },
      ...(temple.officialWebsite && { url: temple.officialWebsite })
  };


  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(templeJsonLd) }}
        />

        <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary mb-2">{name}</h1>
            <p className="mt-2 text-lg text-muted-foreground flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5" /> {temple.location.city}, {temple.location.state}
            </p>
            <div className="mt-4 flex justify-center items-center gap-4 flex-wrap">
                <Badge variant="secondary" className="text-sm px-3 py-1">Pilgrimage</Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">{deityName}</Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBookmark} 
                  disabled={bookmarkLoading || !user}
                  className="flex items-center gap-2"
                >
                    <Bookmark className={cn("h-4 w-4", bookmark && "fill-yellow-400 text-yellow-500")} /> 
                    {bookmark ? 'Bookmarked' : t.buttons.bookmark}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleShare}
                  className="flex items-center gap-2"
                >
                    <Share2 className="h-4 w-4" /> 
                    Share
                </Button>
                {temple.officialWebsite && (
                     <Button variant="outline" size="sm" asChild className="flex items-center gap-2">
                        <a href={temple.officialWebsite} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4" /> Official Website
                            <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                    </Button>
                )}
            </div>
        </div>

        <Carousel className="w-full max-w-5xl mx-auto mb-12">
            <CarouselContent>
                {temple.media.images.map((image: any, index: number) => (
                <CarouselItem key={index}>
                    <div className="aspect-video relative rounded-lg overflow-hidden border-2 border-accent/20 shadow-xl">
                        <Image
                            src={image.url}
                            alt={`${name} image ${index + 1}`}
                            data-ai-hint={image.hint}
                            fill
                            priority={index === 0}
                            className="object-cover"
                        />
                    </div>
                </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>

        <Tabs defaultValue="info" className="w-full max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Temple Information</TabsTrigger>
                <TabsTrigger value="community">Community Discussion</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-8">
                <TempleInfo temple={temple} language={language} />
            </TabsContent>
            <TabsContent value="community" className="mt-8">
                <div className="max-w-4xl mx-auto">
                     <Posts contextId={temple.slug} contextType="temple" />
                </div>
            </TabsContent>
            <TabsContent value="comments" className="mt-8">
                <div className="max-w-4xl mx-auto">
                     <Comments contentId={temple.slug} contentType="temple" />
                </div>
            </TabsContent>
        </Tabs>
    </main>
  );
}
