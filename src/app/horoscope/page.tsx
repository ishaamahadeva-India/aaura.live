'use client';

import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { Loader2, Star, Sparkles, Flower, Briefcase, Activity, TrendingUp, Calendar, Clock, Shield, Zap, Target, ArrowRight, RefreshCw, Share2, BookOpen, Award, Sun, Moon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useMemo } from 'react';

export default function HoroscopePage() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, authLoading] = useAuthState(auth);
  const { t, language } = useLanguage();

  const horoscopeRef = user ? doc(db, `users/${user.uid}/horoscopes/daily`) : undefined;
  const [horoscope, horoscopeLoading] = useDocumentData(horoscopeRef);

  const isLoading = authLoading || horoscopeLoading;
  
  const horoscopeText = horoscope?.[`text_${language}`] || horoscope?.text_en;
  
  // Enhanced parsing function
  const parseHoroscope = (text: string) => {
    if (!text) return { love: null, career: null, health: null, luck: null, finance: null, raw: text };
    
    const lines = text.split('\n');
    const sections: Record<string, string> = {};
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('love:') || lowerLine.startsWith('romance:')) {
        sections.love = line.replace(/^(love|romance):/i, '').trim();
      } else if (lowerLine.startsWith('career:') || lowerLine.startsWith('work:')) {
        sections.career = line.replace(/^(career|work):/i, '').trim();
      } else if (lowerLine.startsWith('health:') || lowerLine.startsWith('wellness:')) {
        sections.health = line.replace(/^(health|wellness):/i, '').trim();
      } else if (lowerLine.startsWith('finance:') || lowerLine.startsWith('money:')) {
        sections.finance = line.replace(/^(finance|money):/i, '').trim();
      } else if (lowerLine.startsWith('luck:') || lowerLine.startsWith('fortune:')) {
        sections.luck = line.replace(/^(luck|fortune):/i, '').trim();
      }
    });
    
    return {
      love: sections.love || null,
      career: sections.career || null,
      health: sections.health || null,
      finance: sections.finance || null,
      luck: sections.luck || null,
      raw: text
    };
  };

  const parsedHoroscope = parseHoroscope(horoscopeText);
  const horoscopeDate = horoscope?.date ? (horoscope.date.toDate ? horoscope.date.toDate() : new Date(horoscope.date)) : new Date();
  const isToday = format(horoscopeDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Calculate lucky numbers (simple algorithm based on date)
  const luckyNumbers = useMemo(() => {
    const date = horoscopeDate;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const nums = new Set<number>();
    nums.add(day % 10 || 10);
    nums.add(month);
    nums.add((year % 100) % 10 || 10);
    nums.add((day + month) % 10 || 10);
    nums.add((day * month) % 10 || 10);
    
    return Array.from(nums).slice(0, 5).sort((a, b) => a - b);
  }, [horoscopeDate]);

  // Lucky colors based on zodiac sign
  const luckyColors = useMemo(() => {
    const sign = horoscope?.zodiacSign?.toLowerCase() || '';
    const colorMap: Record<string, string[]> = {
      'aries': ['Red', 'Orange', 'Gold'],
      'taurus': ['Green', 'Pink', 'Brown'],
      'gemini': ['Yellow', 'Silver', 'Light Blue'],
      'cancer': ['White', 'Silver', 'Pale Blue'],
      'leo': ['Gold', 'Orange', 'Red'],
      'virgo': ['Navy', 'Brown', 'Beige'],
      'libra': ['Pink', 'Blue', 'Green'],
      'scorpio': ['Red', 'Black', 'Maroon'],
      'sagittarius': ['Purple', 'Blue', 'Orange'],
      'capricorn': ['Black', 'Brown', 'Dark Green'],
      'aquarius': ['Electric Blue', 'Silver', 'Grey'],
      'pisces': ['Sea Green', 'White', 'Lavender'],
    };
    return colorMap[sign] || ['Blue', 'White', 'Silver'];
  }, [horoscope?.zodiacSign]);

  // Compatibility rating
  const compatibilityRatings = useMemo(() => {
    const sign = horoscope?.zodiacSign?.toLowerCase() || '';
    const ratings: Record<string, number> = {
      'aries': 85,
      'taurus': 78,
      'gemini': 82,
      'cancer': 80,
      'leo': 88,
      'virgo': 75,
      'libra': 83,
      'scorpio': 77,
      'sagittarius': 86,
      'capricorn': 79,
      'aquarius': 84,
      'pisces': 81,
    };
    return ratings[sign] || 80;
  }, [horoscope?.zodiacSign]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {t.horoscope.loginTitle}
            </CardTitle>
            <CardDescription>{t.horoscope.loginDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">{t.horoscope.loginButton}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!horoscope || !horoscopeText) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {t.horoscope.noHoroscopeTitle}
            </CardTitle>
            <CardDescription>{t.horoscope.noHoroscopeDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/profile/setup">{t.horoscope.setupProfileButton}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Star className="h-16 w-16 text-primary animate-pulse" />
              <Sparkles className="h-8 w-8 text-yellow-400 absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary">
                {t.horoscope.title || 'Daily Horoscope'}
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                {t.horoscope.description || 'Discover what the stars have in store for you today'}
              </p>
            </div>
          </div>
        </div>

        {/* Zodiac Sign Header Card */}
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30 shadow-lg mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {horoscope.zodiacSign?.[0] || '⭐'}
                  </div>
                  {isToday && (
                    <Badge className="absolute -top-1 -right-1 bg-green-500 text-white animate-pulse">
                      Today
                    </Badge>
                  )}
                </div>
                <div>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                    {horoscope.zodiacSign || 'Your Sign'}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(horoscopeDate, 'EEEE, MMMM d, yyyy')}
                    {!isToday && (
                      <span className="text-xs text-muted-foreground">
                        ({formatDistanceToNow(horoscopeDate, { addSuffix: true })})
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Horoscope Reading */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Daily Reading
                </CardTitle>
                <CardDescription>{t.horoscope.dailyReading || 'Your personalized horoscope for today'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Love Section */}
                {parsedHoroscope.love && (
                  <div className="space-y-2 p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <Flower className="h-5 w-5 text-pink-500" />
                      <h3 className="font-semibold text-red-600">Love & Relationships</h3>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{parsedHoroscope.love}</p>
                  </div>
                )}

                {/* Career Section */}
                {parsedHoroscope.career && (
                  <div className="space-y-2 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold text-blue-600">Career & Work</h3>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{parsedHoroscope.career}</p>
                  </div>
                )}

                {/* Health Section */}
                {parsedHoroscope.health && (
                  <div className="space-y-2 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold text-green-600">Health & Wellness</h3>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{parsedHoroscope.health}</p>
                  </div>
                )}

                {/* Finance Section */}
                {parsedHoroscope.finance && (
                  <div className="space-y-2 p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-semibold text-yellow-600">Finance & Money</h3>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{parsedHoroscope.finance}</p>
                  </div>
                )}

                {/* Luck Section */}
                {parsedHoroscope.luck && (
                  <div className="space-y-2 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <h3 className="font-semibold text-purple-600">Luck & Fortune</h3>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{parsedHoroscope.luck}</p>
                  </div>
                )}

                {/* Fallback to raw text */}
                {!parsedHoroscope.love && !parsedHoroscope.career && !parsedHoroscope.health && (
                  <div className="space-y-4">
                    <p className="text-lg text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {parsedHoroscope.raw}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Lucky Info */}
          <div className="space-y-6">
            {/* Compatibility Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Today's Compatibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Overall Rating</span>
                      <span className="text-lg font-bold text-primary">{compatibilityRatings}%</span>
                    </div>
                    <Progress value={compatibilityRatings} className="h-2" />
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Love</span>
                      <span className="font-semibold">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Career</span>
                      <span className="font-semibold">Good</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Health</span>
                      <span className="font-semibold">Excellent</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lucky Numbers */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Lucky Numbers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {luckyNumbers.map((num, index) => (
                    <Badge key={index} variant="secondary" className="text-lg px-4 py-2 bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                      {num}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lucky Colors */}
            <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sun className="h-5 w-5 text-pink-600" />
                  Lucky Colors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {luckyColors.map((color, index) => (
                    <Badge key={index} variant="outline" className="text-sm px-3 py-1 border-2">
                      {color}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Best Time of Day */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Best Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Morning</span>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                      Excellent
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Afternoon</span>
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                      Good
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Evening</span>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-700">
                      Fair
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link href="/panchang">
              <Calendar className="mr-2 h-4 w-4" />
              View Daily Panchang
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/rituals">
              <Target className="mr-2 h-4 w-4" />
              Discover Rituals
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    </main>
  );
}

