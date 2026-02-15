'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, Sunrise, Sunset, Moon, Star, AlertTriangle, PartyPopper, Loader2, BookHeart, Sparkles, BrainCircuit, Clock, MapPin, RefreshCw, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { getPanchangForDate, getCurrentPanchangInfo, type Panchang } from '@/lib/panchang';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { personalizePanchang, type PersonalizedPanchangOutput } from '@/ai/flows/personalize-panchang';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { PanchangTimeline } from './PanchangTimeline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Major Indian cities with coordinates
const INDIAN_CITIES = [
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    { name: 'Varanasi', lat: 25.3176, lng: 82.9739 },
    { name: 'Ujjain', lat: 23.1793, lng: 75.7849 },
    { name: 'Haridwar', lat: 29.9457, lng: 78.1642 },
];

export default function PanchangPage() {
    const { t, language } = useLanguage();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [panchang, setPanchang] = useState<Panchang | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [aiContent, setAiContent] = useState<PersonalizedPanchangOutput | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedCity, setSelectedCity] = useState('Delhi');
    const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2090 });
    
    const auth = useAuth();
    const db = useFirestore();
    const [user] = useAuthState(auth);
    const userDocRef = user ? doc(db, 'users', user.uid) : undefined;
    const [userData] = useDocumentData(userDocRef);

    // Real-time clock update
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000); // Update every second

        return () => clearInterval(timer);
    }, []);

    // Update panchang when date or location changes
    useEffect(() => {
        setIsLoading(true);
        const data = getPanchangForDate(selectedDate, location.lat, location.lng);
        setPanchang(data);
        setIsLoading(false);

        // Load AI content
        if (user && userData?.zodiacSign && data) {
          setIsAiLoading(true);
          const mockAiContent: PersonalizedPanchangOutput = {
            recommendations: [
              `As a ${userData.zodiacSign}, today's ${data.nakshatra.en} nakshatra is a great time for introspection. Consider journaling your thoughts.`,
              `The energy of ${data.tithi.en} tithi supports selfless service. Try a small act of kindness today.`,
              "Today is favorable for creative pursuits. Spend 15 minutes on a hobby you love.",
            ]
          };
          setAiContent(mockAiContent);
          setIsAiLoading(false);
        } else {
            setAiContent(null);
        }
    }, [selectedDate, user, userData, location]);

    // Handle city selection
    const handleCityChange = (cityName: string) => {
        setSelectedCity(cityName);
        const city = INDIAN_CITIES.find(c => c.name === cityName);
        if (city) {
            setLocation({ lat: city.lat, lng: city.lng });
        }
    };

    // Get current panchang info with real-time updates
    const currentInfo = useMemo(() => {
        if (!panchang) return null;
        return getCurrentPanchangInfo(panchang, currentTime);
    }, [panchang, currentTime]);

    if (isLoading) {
      return (
        <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
      )
    }

    if (!panchang) {
       return (
          <main className="flex-grow container mx-auto px-4 py-8 md:py-16 text-center">
            <h1 className="text-2xl font-semibold">Panchang data for the selected date is not available.</h1>
          </main>
       )
    }

    const panchangItems = [
        { icon: Star, label: "Tithi", value: panchang.tithi[language] || panchang.tithi.en, detail: panchang.paksha.en },
        { icon: Star, label: "Nakshatra", value: panchang.nakshatra[language] || panchang.nakshatra.en },
        { icon: Star, label: "Yoga", value: panchang.yoga[language] || panchang.yoga.en },
        { icon: Star, label: "Karana", value: panchang.karana[language] || panchang.karana.en },
        { icon: CalendarDays, label: "Var", value: panchang.var[language] || panchang.var.en },
        { icon: Moon, label: "Paksha", value: panchang.paksha[language] || panchang.paksha.en },
    ];

    const zodiacInsight = panchang.zodiacInsights[userData?.zodiacSign?.toLowerCase() || 'aries'];

    // Format current time
    const formattedTime = format(currentTime, 'hh:mm:ss a');
    const formattedDate = format(currentTime, 'EEEE, MMMM d, yyyy');

    // Check if current time is in any muhurat
    const isInMuhurat = (muhuratTime: string): boolean => {
        const [start, end] = muhuratTime.split(' - ');
        const parseTime = (timeStr: string): Date => {
            const [time, period] = timeStr.trim().split(' ');
            const [hour, min] = time.split(':').map(Number);
            const date = new Date(selectedDate);
            const hour24 = period === 'PM' && hour !== 12 ? hour + 12 : (period === 'AM' && hour === 12 ? 0 : hour);
            date.setHours(hour24, min, 0, 0);
            return date;
        };
        
        const startTime = parseTime(start);
        const endTime = parseTime(end);
        return currentTime >= startTime && currentTime <= endTime;
    };

  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
        {/* Header with Real-time Clock */}
        <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
                    <CalendarDays className="h-10 w-10" /> {t.panchang?.title || 'Daily Panchang'}
                </h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{formattedTime}</span>
                </div>
                <Badge variant="secondary" className="text-sm">
                    {formattedDate}
                </Badge>
            </div>
            <p className="mt-2 max-w-3xl mx-auto text-lg text-muted-foreground">
                {panchang.date} • {selectedCity}
            </p>
        </div>

        {/* Location Selector */}
        <div className="flex justify-center mb-8 gap-4">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        <span>{format(selectedDate, "PPP")}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(day) => day && setSelectedDate(day)}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            <Select value={selectedCity} onValueChange={handleCityChange}>
                <SelectTrigger className="w-[200px]">
                    <MapPin className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                    {INDIAN_CITIES.map(city => (
                        <SelectItem key={city.name} value={city.name}>
                            {city.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Festivals Card */}
            {panchang.festivals && panchang.festivals.length > 0 && (
                <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <PartyPopper className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="text-primary">{t.panchang?.todaysFestivals || "Today's Festivals"}</CardTitle>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {panchang.festivals.map((festival) => (
                                        <Link key={festival.id} href={`/festivals/${festival.id}`}>
                                            <Badge variant="default" className="cursor-pointer hover:bg-primary/80 text-sm px-3 py-1">
                                                {festival.name}
                                            </Badge>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* Next Muhurat Countdown */}
            {currentInfo?.nextMuhurat && (
                <Card className="bg-gradient-to-r from-accent/20 to-accent/10 border-accent/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Timer className="h-5 w-5 text-accent" />
                            Next Muhurat: {currentInfo.nextMuhurat.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Time</p>
                                <p className="text-lg font-semibold">{currentInfo.nextMuhurat.time}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Time Remaining</p>
                                <p className="text-2xl font-bold text-accent">{currentInfo.nextMuhurat.timeRemaining}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Panchang Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {panchangItems.map((item, index) => (
                    <Card key={index} className="bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg">
                        <CardHeader className="pb-3">
                            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                                <item.icon className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-sm text-center text-foreground">{item.label}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="font-semibold text-center text-primary text-sm">{item.value}</p>
                            {item.detail && (
                                <p className="text-xs text-center text-muted-foreground mt-1">{item.detail}</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Timeline */}
            <PanchangTimeline panchang={panchang} currentTime={currentTime} />

            {/* Muhurat Timings */}
            <Tabs defaultValue="auspicious" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="auspicious">Auspicious Timings</TabsTrigger>
                    <TabsTrigger value="inauspicious">Inauspicious Timings</TabsTrigger>
                </TabsList>
                <TabsContent value="auspicious" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className={`border-2 ${isInMuhurat(panchang.brahmaMuhurta) ? 'border-green-500 bg-green-500/10' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Sunrise className="h-4 w-4 text-orange-500" />
                                    Brahma Muhurta
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-semibold">{panchang.brahmaMuhurta}</p>
                                <p className="text-xs text-muted-foreground mt-1">Best for meditation & spiritual practices</p>
                                {isInMuhurat(panchang.brahmaMuhurta) && (
                                    <Badge variant="default" className="mt-2 bg-green-500">Active Now</Badge>
                                )}
                            </CardContent>
                        </Card>
                        <Card className={`border-2 ${isInMuhurat(panchang.abhijitMuhurta) ? 'border-green-500 bg-green-500/10' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    Abhijit Muhurta
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-semibold">{panchang.abhijitMuhurta}</p>
                                <p className="text-xs text-muted-foreground mt-1">Most auspicious for new beginnings</p>
                                {isInMuhurat(panchang.abhijitMuhurta) && (
                                    <Badge variant="default" className="mt-2 bg-green-500">Active Now</Badge>
                                )}
                            </CardContent>
                        </Card>
                        <Card className={`border-2 ${isInMuhurat(panchang.amritKalam) ? 'border-green-500 bg-green-500/10' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    Amrit Kalam
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-semibold">{panchang.amritKalam}</p>
                                <p className="text-xs text-muted-foreground mt-1">Favorable for important activities</p>
                                {isInMuhurat(panchang.amritKalam) && (
                                    <Badge variant="default" className="mt-2 bg-green-500">Active Now</Badge>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="inauspicious" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className={`border-2 ${isInMuhurat(panchang.rahukalam) ? 'border-red-500 bg-red-500/10' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    Rahu Kalam
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-semibold">{panchang.rahukalam}</p>
                                <p className="text-xs text-muted-foreground mt-1">Avoid starting new ventures</p>
                                {isInMuhurat(panchang.rahukalam) && (
                                    <Badge variant="destructive" className="mt-2">Active Now</Badge>
                                )}
                            </CardContent>
                        </Card>
                        <Card className={`border-2 ${isInMuhurat(panchang.yamaGandam) ? 'border-red-500 bg-red-500/10' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    Yama Gandam
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-semibold">{panchang.yamaGandam}</p>
                                <p className="text-xs text-muted-foreground mt-1">Avoid important decisions</p>
                                {isInMuhurat(panchang.yamaGandam) && (
                                    <Badge variant="destructive" className="mt-2">Active Now</Badge>
                                )}
                            </CardContent>
                        </Card>
                        <Card className={`border-2 ${isInMuhurat(panchang.gulikaKalam) ? 'border-red-500 bg-red-500/10' : ''}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    Gulika Kalam
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-semibold">{panchang.gulikaKalam}</p>
                                <p className="text-xs text-muted-foreground mt-1">Avoid significant activities</p>
                                {isInMuhurat(panchang.gulikaKalam) && (
                                    <Badge variant="destructive" className="mt-2">Active Now</Badge>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Sunrise/Sunset Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sunrise className="h-5 w-5 text-orange-500" />
                            Sunrise & Sunset
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Sunrise</span>
                            <span className="font-semibold">{panchang.sunrise}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Sunset</span>
                            <span className="font-semibold">{panchang.sunset}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Moon className="h-5 w-5 text-indigo-500" />
                            Moonrise & Moonset
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Moonrise</span>
                            <span className="font-semibold">{panchang.moonrise}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Moonset</span>
                            <span className="font-semibold">{panchang.moonset}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* AI Personalized Content */}
            {isAiLoading ? (
                <div className="flex justify-center items-center h-24"><Loader2 className="animate-spin" /></div>
            ) : aiContent && (
                 <Card className="bg-gradient-to-tr from-accent/10 to-background border-accent/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-accent">
                            <BrainCircuit className="h-5 w-5" /> Personalized Guidance for you
                        </CardTitle>
                        <CardDescription>Based on your zodiac sign, {userData?.zodiacSign}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {aiContent.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-accent mt-1 shrink-0" />
                            <p className="text-foreground/90">{rec}</p>
                          </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Expanded Guidance */}
            <Accordion type="single" collapsible className="w-full space-y-4">
                 <AccordionItem value="item-1" className="border-primary/20 border rounded-lg px-4 bg-transparent">
                     <AccordionTrigger className="text-lg font-semibold hover:no-underline">Today's Guidance & Activities</AccordionTrigger>
                     <AccordionContent className="pt-4 space-y-6">
                        {zodiacInsight && userData?.zodiacSign && (
                            <div>
                                <h3 className="font-semibold text-md mb-2 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" /> For {userData.zodiacSign}
                                </h3>
                                <p className="text-muted-foreground text-sm">{zodiacInsight}</p>
                            </div>
                        )}
                        <Separator />
                        <div>
                            <h3 className="font-semibold text-md mb-2 flex items-center gap-2">
                                <Star className="h-4 w-4 text-green-500" /> Auspicious Activities
                            </h3>
                             <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                {panchang.auspiciousActivities.map((act, i) => <li key={i}>{act}</li>)}
                             </ul>
                        </div>
                         <Separator />
                          <div>
                            <h3 className="font-semibold text-md mb-2 flex items-center gap-2">
                                <BookHeart className="h-4 w-4 text-blue-500" /> Wellness Tip
                            </h3>
                             <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                {panchang.wellnessTips.map((tip, i) => <li key={i}>{tip}</li>)}
                             </ul>
                        </div>
                         {panchang.relatedRituals.length > 0 && (
                            <>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-md mb-2">Related Rituals</h3>
                                 <div className="flex flex-wrap gap-2">
                                    {panchang.relatedRituals.map(slug => {
                                        const normalizedSlug = slug.trim().toLowerCase();
                                        return (
                                            <Button key={slug} variant="outline" size="sm" asChild>
                                                <Link href={`/rituals/${normalizedSlug}`}>
                                                    {slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </Link>
                                            </Button>
                                        );
                                    })}
                                 </div>
                            </div>
                            </>
                         )}
                     </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </main>
  );
}
