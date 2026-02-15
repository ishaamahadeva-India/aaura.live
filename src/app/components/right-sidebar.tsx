
'use client';
import { useLanguage } from "@/hooks/use-language";
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, limit, query, where, DocumentData, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/lib/firebase/provider';
import { Loader2, Trophy, BookOpen, Palmtree } from "lucide-react";


export function RightSidebar() {
  const { language, t } = useLanguage();
  const db = useFirestore();

  const festivalsQuery = query(collection(db, 'festivals'), limit(1));
  const [upcomingFestivals, festivalsLoading] = useCollectionData(festivalsQuery, { idField: 'id' });

  const deitiesQuery = query(collection(db, 'deities'), limit(1));
  const [suggestedDeities, deitiesLoading] = useCollectionData(deitiesQuery, { idField: 'id' });

  const contestsQuery = query(collection(db, 'contests'), where('status', '==', 'active'), limit(1));
  const [activeContests, contestsLoading] = useCollectionData(contestsQuery, { idField: 'id' });

  const storiesQuery = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(1));
  const [featuredSagas, sagasLoading] = useCollectionData(storiesQuery, { idField: 'id' });

  const templesQuery = query(collection(db, 'temples'), limit(1));
  const [popularTemples, templesLoading] = useCollectionData(templesQuery, { idField: 'id' });

  return (
    <div className="space-y-8 sticky top-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="text-primary"/> Active Contests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contestsLoading ? <Loader2 className="mx-auto animate-spin" /> : activeContests?.map((contest: DocumentData) => {
            const imageUrl = contest.imageUrl;
            return (
              <Link href={`/contests`} key={contest.id} className="block group">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-secondary">
                    {imageUrl && <Image src={imageUrl} alt={contest.title} data-ai-hint={contest.imageHint} fill className="object-cover" />}
                  </div>
                  <div>
                      <p className="font-semibold text-sm group-hover:text-primary line-clamp-2">{contest.title}</p>
                  </div>
                </div>
              </Link>
            )
          })}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/contests">{t.rightSidebar.viewAll}</Link>
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="text-primary"/> Featured Sagas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sagasLoading ? <Loader2 className="mx-auto animate-spin" /> : featuredSagas?.map((saga: DocumentData) => {
            const title = saga.title?.[language] || saga.title?.en;
            const imageUrl = saga.image?.url;
            return (
              <Link href={`/stories/${saga.slug}`} key={saga.id} className="block group">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-secondary">
                      {imageUrl && <Image src={imageUrl} alt={title} data-ai-hint={saga.image.hint} fill className="object-cover" />}
                  </div>
                  <div>
                      <p className="font-semibold text-sm group-hover:text-primary line-clamp-2">{title}</p>
                  </div>
                </div>
              </Link>
            )
          })}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/stories">{t.rightSidebar.viewAll}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palmtree className="text-primary"/> Popular Temples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templesLoading ? <Loader2 className="mx-auto animate-spin" /> : popularTemples?.map((temple: DocumentData) => {
            const title = temple.name?.[language] || temple.name?.en;
            const imageUrl = temple.media?.images?.[0]?.url;
            return (
              <Link href={`/temples/${temple.slug}`} key={temple.id} className="block group">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-secondary">
                      {imageUrl && <Image src={imageUrl} alt={title} data-ai-hint={temple.media.images[0].hint} fill className="object-cover" />}
                  </div>
                  <div>
                      <p className="font-semibold text-sm group-hover:text-primary line-clamp-2">{title}</p>
                       <p className="text-xs text-muted-foreground">{temple.location.city}</p>
                  </div>
                </div>
              </Link>
            )
          })}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/temples">{t.rightSidebar.viewAll}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.rightSidebar.trendingFestivals}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {festivalsLoading ? <Loader2 className="mx-auto animate-spin" /> : upcomingFestivals?.map((festival: DocumentData) => {
            const imageUrl = festival.image?.url;
            return (
              <Link href={`/festivals/${festival.slug}`} key={festival.id} className="block group">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-secondary">
                    {imageUrl && <Image src={imageUrl} alt={festival.name[language] || festival.name.en} fill className="object-cover" />}
                  </div>
                  <div>
                      <p className="font-semibold text-sm group-hover:text-primary">{festival.name[language] || festival.name.en}</p>
                      <p className="text-xs text-muted-foreground">{new Date(festival.date).toLocaleDateString(language, { month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              </Link>
            )
          })}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/festivals">{t.rightSidebar.viewAll}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.rightSidebar.suggestedDeities}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deitiesLoading ? <Loader2 className="mx-auto animate-spin" /> : suggestedDeities?.map((deity: DocumentData) => {
            const imageUrl = deity.images?.[0]?.url;
            return (
              <Link href={`/deities/${deity.slug}`} key={deity.id} className="block group">
                  <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-secondary">
                          {imageUrl && <Image src={imageUrl} alt={deity.name[language] || deity.name.en} fill className="object-cover" />}
                      </div>
                      <div>
                          <p className="font-semibold text-sm group-hover:text-primary">{deity.name[language] || deity.name.en}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{deity.description[language] || deity.description.en}</p>
                      </div>
                  </div>
              </Link>
            )
          })}
           <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/deities">{t.rightSidebar.viewAll}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
