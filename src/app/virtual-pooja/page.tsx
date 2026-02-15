'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { deities, type Deity } from '@/lib/deities';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import Image from 'next/image'; 

// Flower component with improved animation
const RisingFlower = ({ id, delay, x }: { id: number, delay: number, x: number }) => {
  const flowerTypes = ['🌺', '🌸', '🌷', '🌻', '🌼', '💐', '🌹'];
  const randomFlower = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
  
  return (
    <div
      key={id}
      className="absolute text-4xl md:text-5xl animate-flower-rise pointer-events-none z-50"
      style={{ 
        left: `${x}%`,
        bottom: '0%',
        animationDelay: `${delay}s`,
        animationDuration: `${4 + Math.random() * 2}s`,
        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 12px rgba(255, 192, 203, 0.6))',
        transform: 'translateX(-50%)',
        willChange: 'transform, opacity',
      }}
    >
      {randomFlower}
    </div>
  );
};

// Aarti component with clockwise rotation
const AartiFlame = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
      <div className="relative w-64 h-64">
        {/* Aarti plate with flame rotating clockwise */}
        <div className="absolute inset-0 animate-aarti-rotate">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              {/* Flame */}
              <div className="w-8 h-12 bg-gradient-to-t from-yellow-400 via-orange-400 to-red-500 rounded-full blur-sm animate-flame-flicker" 
                   style={{ 
                     filter: 'drop-shadow(0 0 10px #ffc107) drop-shadow(0 0 20px #ff9800)',
                     transform: 'rotate(0deg)',
                   }} 
              />
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-yellow-300 rounded-full blur-md opacity-80 animate-pulse" />
              {/* Aarti plate */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-yellow-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Indian Diya component
const DiyaComponent = ({ isLit }: { isLit: boolean }) => {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {/* Diya base */}
      <div className="absolute bottom-0 w-12 h-8 bg-gradient-to-t from-amber-800 to-amber-600 rounded-b-full" />
      
      {/* Diya oil container */}
      <div className="absolute bottom-2 w-10 h-4 bg-gradient-to-t from-yellow-700 to-yellow-600 rounded-full opacity-60" />
      
      {/* Wick */}
      <div className="absolute bottom-6 w-0.5 h-6 bg-gray-400" />
      
      {/* Flame when lit */}
      {isLit && (
        <>
          {/* Main flame */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-4 h-6 bg-gradient-to-t from-yellow-300 via-orange-400 to-red-500 rounded-full blur-sm animate-flame-flicker"
               style={{ 
                 filter: 'drop-shadow(0 0 8px #ffc107) drop-shadow(0 0 15px #ff9800)',
               }} 
          />
          {/* Inner glow */}
          <div className="absolute bottom-9 left-1/2 transform -translate-x-1/2 w-3 h-4 bg-yellow-200 rounded-full blur-md opacity-90 animate-pulse" />
          {/* Outer glow */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-orange-400 rounded-full blur-2xl opacity-40 animate-pulse-glow" />
        </>
      )}
    </div>
  );
};

export default function VirtualPoojaPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedDeity, setSelectedDeity] = useState<Deity | null>(null);
  const [activeInteraction, setActiveInteraction] = useState<string | null>(null);
  const [flowers, setFlowers] = useState<Array<{ id: number, x: number, delay?: number }>>([]);
  const [diyaLit, setDiyaLit] = useState(false);
  const [showAarti, setShowAarti] = useState(false);

  // Fetch deities from Firestore (with images) or use static fallback
  const deitiesQuery = useMemo(() => {
    if (!db) return undefined;
    return query(collection(db, 'deities'), where('status', '==', 'published'));
  }, [db]);
  
  const [firestoreDeities, isLoadingDeities] = useCollectionData(deitiesQuery, { idField: 'id' });
  
  // Use Firestore deities if available, otherwise fallback to static deities
  const availableDeities = useMemo(() => {
    if (firestoreDeities && firestoreDeities.length > 0) {
      return firestoreDeities as Deity[];
    }
    return deities; // Fallback to static deities
  }, [firestoreDeities]);

  // Initialize bell audio with user's custom temple bell sound
  useEffect(() => {
    bellAudioRef.current = new Audio('/sounds/temple-bell.mp3');
    bellAudioRef.current.volume = 0.7;
    bellAudioRef.current.preload = 'auto'; // Preload the audio for better performance
    
    return () => {
      if (bellAudioRef.current) {
        bellAudioRef.current.pause();
        bellAudioRef.current = null;
      }
    };
  }, []);

  const handleInteraction = async (interaction: 'ring-bell' | 'offer-flower' | 'light-diya' | 'offer-aarti') => {
    if (!user && interaction !== 'ring-bell') {
      toast({
        variant: 'destructive',
        title: 'Please log in',
        description: 'You must be logged in to perform pooja actions.',
      });
      return;
    }
    
    setActiveInteraction(interaction);
    setTimeout(() => setActiveInteraction(null), 500);

    switch (interaction) {
      case 'ring-bell':
        if (bellAudioRef.current) {
          bellAudioRef.current.currentTime = 0; // Reset to start of audio
          bellAudioRef.current.play().catch(e => {
            console.error("Error playing bell audio:", e);
            toast({ 
              variant: 'destructive',
              title: "Audio Error", 
              description: "Unable to play bell sound. Please check your browser settings." 
            });
          });
        }
        toast({ title: "🔔 Bell Ringing", description: "The divine sound resonates..." });
        break;
        
      case 'offer-flower':
        // Create more flowers with better distribution across the screen
        const flowerCount = 15; // Increased from 8 to 15
        const newFlowers = Array.from({ length: flowerCount }, (_, i) => ({
          id: Date.now() + i + Math.random() * 1000, // Better unique IDs
          x: 5 + (i * (90 / flowerCount)) + (Math.random() * 5 - 2.5), // Better spread across screen
          delay: Math.random() * 0.5, // Stagger the animation
        }));
        setFlowers(prev => [...prev, ...newFlowers]);
        
        // Remove flowers after animation completes
        setTimeout(() => {
          setFlowers(prev => prev.filter(f => !newFlowers.some(nf => nf.id === f.id)));
        }, 6000); // Increased timeout to match longer animation
        
        toast({ title: "🌸 Flowers Offered", description: "Your devotion rises like flowers..." });
        break;
        
      case 'light-diya':
        setDiyaLit(!diyaLit);
        if (!diyaLit) {
          toast({ title: "🪔 Diya Lit", description: "The divine light illuminates..." });
        } else {
          toast({ title: "🪔 Diya Extinguished", description: "The light fades..." });
        }
        break;
        
      case 'offer-aarti':
        if (showAarti) return;
        setShowAarti(true);
        toast({ title: "🕯️ Aarti Performed", description: "The divine flame circles..." });
        
        // Play aarti sound if available
        // Try local file first, fallback to external URL if local file doesn't exist
        const aartiAudio = new Audio('/sounds/aarti.mp3');
        aartiAudio.volume = 0.5;
        
        // Handle error when local file fails to load (404, etc.)
        aartiAudio.addEventListener('error', () => {
          // Local file doesn't exist, use external URL
          try {
            const fallbackAudio = new Audio('https://www.soundjay.com/human/sounds/woman-humming-1.mp3');
            fallbackAudio.volume = 0.5;
            fallbackAudio.play().catch(e => {
              // Silently fail if external URL also fails
              console.warn("Aarti audio unavailable:", e);
            });
          } catch (fallbackError) {
            // Silently fail if fallback creation fails
            console.warn("Aarti audio unavailable:", fallbackError);
          }
        });
        
        // Try to play local file
        aartiAudio.play().catch(() => {
          // If play fails, the error event will trigger the fallback
          // This catch is just to prevent unhandled promise rejection
        });
        
        setTimeout(() => {
          setShowAarti(false);
        }, 8000);
        break;
    }

    if (user) {
      try {
        const offeringsCollection = collection(db, `users/${user.uid}/virtualOfferings`);
        await addDoc(offeringsCollection, {
          userId: user.uid,
          interaction: interaction,
          deity: selectedDeity?.slug || 'general',
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error("Failed to record interaction:", error);
        toast({ variant: "destructive", title: 'Something went wrong.', description: "Your interaction could not be saved." });
      }
    }
  };
  
  if (!selectedDeity) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-start bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 pt-16 pb-20">
        <div className="text-center mb-8 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-primary mb-4">
            Select a Deity for Pooja
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground">
            Choose a deity to begin your virtual worship and spiritual journey
          </p>
        </div>
        
        {/* Improved grid layout with better spacing */}
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {availableDeities.map((deity, index) => {
              // Get deity image - use first image from Firestore or static data
              const deityImage = deity.images?.[0]?.url || `https://picsum.photos/seed/${deity.slug}/600/400`;
              const imageHint = deity.images?.[0]?.hint || `${deity.name.en} deity`;
              
              return (
                <Card 
                  key={deity.id} 
                  onClick={() => setSelectedDeity(deity)} 
                  className="cursor-pointer group overflow-hidden border-2 border-primary/20 hover:border-primary/70 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-gray-700"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-600">
                    {deityImage ? (
                      <>
                        <Image
                          src={deityImage}
                          alt={deity.name.en}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-4xl md:text-5xl font-bold text-amber-700 dark:text-amber-200 drop-shadow">
                          {deity.name.en.slice(0, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-3 bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-gray-700">
                    <CardTitle className="text-center text-sm md:text-base font-semibold group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {deity.name.en}
                    </CardTitle>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-between overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Flower animations layer */}
      <div className="fixed inset-0 z-30 pointer-events-none overflow-visible">
        {flowers.map((flower) => (
          <RisingFlower key={flower.id} id={flower.id} delay={flower.delay || 0} x={flower.x} />
        ))}
      </div>
      
      {/* Aarti animation layer */}
      <AartiFlame isActive={showAarti} />

      {/* Deity background with image */}
      <div className="absolute inset-0 z-0">
        {selectedDeity.images?.[0]?.url ? (
          <>
            <Image
              src={selectedDeity.images[0].url}
              alt={selectedDeity.name.en}
              fill
              className="object-cover opacity-30"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-80" />
        )}
      </div>

      {/* Deity Image Display - Large centered image */}
      {selectedDeity.images?.[0]?.url && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 rounded-full blur-2xl" />
            <Image
              src={selectedDeity.images[0].url}
              alt={selectedDeity.name.en}
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(max-width: 768px) 256px, (max-width: 1024px) 320px, 384px"
            />
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/30 rounded-full" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative z-20 text-center text-white pt-16 px-4">
        <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-amber-300 drop-shadow-lg mb-2">
          Virtual Pooja
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-amber-100 drop-shadow-md">
          Offering prayers to <span className="font-semibold text-amber-200">{selectedDeity.name.en}</span>
        </p>
        {!user && (
          <Button asChild className="mt-6 bg-amber-600 hover:bg-amber-700 text-white">
            <Link href="/login">Login to Participate</Link>
          </Button>
        )}
      </div>
      
      {/* Change Deity Button */}
      <div className="absolute z-40 top-4 left-4">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedDeity(null)} 
          className="text-white hover:bg-white/20 hover:text-white backdrop-blur-sm border border-white/20"
        >
          ← Change Deity
        </Button>
      </div>

      {/* Pooja Actions */}
      <div className="relative z-20 grid grid-cols-4 gap-4 md:gap-6 w-full max-w-2xl mb-8 px-4">
        <button 
          onClick={() => handleInteraction('ring-bell')} 
          className={cn(
            "flex flex-col items-center p-4 rounded-xl transition-all duration-300 pooja-button bg-gradient-to-br from-amber-600/20 to-amber-800/20 backdrop-blur-sm border border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-600/30",
            activeInteraction === 'ring-bell' && 'animate-bell-ring scale-110'
          )}
        >
          <Bell className="w-12 h-12 md:w-16 md:h-16 text-amber-300 drop-shadow-lg" />
          <p className="text-amber-200 mt-3 font-semibold text-xs md:text-sm">Ring Bell</p>
        </button>

        <button 
          onClick={() => handleInteraction('offer-flower')} 
          className={cn(
            "flex flex-col items-center p-4 rounded-xl transition-all duration-300 pooja-button bg-gradient-to-br from-pink-600/20 to-rose-800/20 backdrop-blur-sm border border-pink-400/30 hover:border-pink-400/60 hover:bg-pink-600/30",
            activeInteraction === 'offer-flower' && 'scale-110'
          )}
        >
          <span className="text-5xl md:text-6xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 192, 203, 0.8))' }}>🌸</span>
          <p className="text-pink-200 mt-3 font-semibold text-xs md:text-sm">Offer Flowers</p>
        </button>

        <button 
          onClick={() => handleInteraction('light-diya')} 
          className={cn(
            "flex flex-col items-center p-4 rounded-xl transition-all duration-300 pooja-button bg-gradient-to-br from-orange-600/20 to-red-800/20 backdrop-blur-sm border border-orange-400/30 hover:border-orange-400/60 hover:bg-orange-600/30",
            activeInteraction === 'light-diya' && 'scale-110'
          )}
        >
          <DiyaComponent isLit={diyaLit} />
          <p className={cn("mt-3 font-semibold text-xs md:text-sm transition-colors", diyaLit ? "text-orange-200" : "text-gray-300")}>
            {diyaLit ? 'Diya Lit' : 'Light Diya'}
          </p>
        </button>

        <button 
          onClick={() => handleInteraction('offer-aarti')} 
          className={cn(
            "flex flex-col items-center p-4 rounded-xl transition-all duration-300 pooja-button bg-gradient-to-br from-yellow-600/20 to-orange-800/20 backdrop-blur-sm border border-yellow-400/30 hover:border-yellow-400/60 hover:bg-yellow-600/30",
            activeInteraction === 'offer-aarti' && 'scale-110'
          )}
        >
          <div className="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center">
            <Flame className="w-full h-full text-orange-400 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 165, 0, 0.8))' }} />
            <div className="absolute inset-0 bg-orange-400/30 rounded-full blur-md animate-pulse" />
          </div>
          <p className="text-orange-300 mt-3 font-semibold text-xs md:text-sm">Offer Aarti</p>
        </button>
      </div>

      <style jsx>{`
        .pooja-button {
          transform-style: preserve-3d;
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
          animation: float 6s ease-in-out infinite;
        }
        .pooja-button:hover {
          transform: translateY(-8px) translateZ(10px) scale(1.05);
          box-shadow: 0 10px 30px rgba(251, 191, 36, 0.3);
        }
        .pooja-button:active {
          transform: translateY(-2px) translateZ(0px) scale(0.98);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .pooja-button:nth-child(1) { animation-delay: 0s; }
        .pooja-button:nth-child(2) { animation-delay: 1.5s; }
        .pooja-button:nth-child(3) { animation-delay: 3s; }
        .pooja-button:nth-child(4) { animation-delay: 4.5s; }
        
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-15deg); }
          20% { transform: rotate(15deg); }
          30% { transform: rotate(-10deg); }
          40% { transform: rotate(10deg); }
          50% { transform: rotate(-5deg); }
          60% { transform: rotate(5deg); }
          70% { transform: rotate(-2deg); }
          80% { transform: rotate(2deg); }
          90% { transform: rotate(0deg); }
        }
        .animate-bell-ring {
          animation: bell-ring 0.5s ease-in-out;
        }
        
        @keyframes flower-rise {
          0% {
            transform: translateX(-50%) translateY(100vh) rotate(0deg) scale(0.5);
            opacity: 1;
          }
          20% {
            transform: translateX(-50%) translateY(80vh) rotate(72deg) scale(0.7);
            opacity: 1;
          }
          40% {
            transform: translateX(-50%) translateY(50vh) rotate(144deg) scale(0.9);
            opacity: 0.9;
          }
          60% {
            transform: translateX(-50%) translateY(20vh) rotate(216deg) scale(1.1);
            opacity: 0.7;
          }
          80% {
            transform: translateX(-50%) translateY(-10vh) rotate(288deg) scale(1.2);
            opacity: 0.4;
          }
          100% {
            transform: translateX(-50%) translateY(-30vh) rotate(360deg) scale(1.3);
            opacity: 0;
          }
        }
        .animate-flower-rise {
          animation-name: flower-rise;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
        }
        
        @keyframes aarti-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-aarti-rotate {
          animation: aarti-rotate 3s linear infinite;
        }
        
        @keyframes flame-flicker {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          25% { 
            transform: scale(1.1) rotate(-2deg);
            opacity: 0.9;
          }
          50% { 
            transform: scale(0.95) rotate(2deg);
            opacity: 0.85;
          }
          75% { 
            transform: scale(1.05) rotate(-1deg);
            opacity: 0.95;
          }
        }
        .animate-flame-flicker {
          animation: flame-flicker 0.3s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.2);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
        }
      `}</style>
    </main>
  );
}
