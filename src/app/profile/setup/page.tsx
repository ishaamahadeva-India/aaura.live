
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Save, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, serverTimestamp, writeBatch, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTransition, useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { generateOnboardingInsights, type OnboardingInsightsOutput } from '@/ai/flows/onboarding-insights';
import { deities } from '@/lib/deities';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { formSchema, step1Schema, step2Schema, FormValues } from '@/lib/profile-setup-schemas';
import { debounce } from 'lodash';

const getZodiacSign = (date: Date): string => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
};


const steps = [
    { title: 'Tell us about yourself', schema: step1Schema, fields: ['fullName', 'username', 'birthDate', 'timeOfBirth', 'placeOfBirth'] as const },
    { title: 'Select your interests', schema: step2Schema, fields: ['favoriteDeities'] as const },
    { title: 'Get your first horoscope', schema: z.object({}), fields: [] },
  ];

export default function ProfileSetupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: user?.displayName || '',
      username: '',
      placeOfBirth: '',
      timeOfBirth: '12:00',
      favoriteDeities: [],
    },
     mode: "onBlur",
  });
  
  const checkUsernameUniqueness = useMemo(
    () =>
      debounce(async (username: string) => {
        if (username.length < 3) return;
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          form.setError('username', {
            type: 'manual',
            message: 'This username is already taken.',
          });
        } else {
            form.clearErrors('username');
        }
      }, 500),
    [db, form]
  );
  
  const watchedUsername = form.watch("username");
  
  useEffect(() => {
    if(watchedUsername) {
        checkUsernameUniqueness(watchedUsername);
    }
  }, [watchedUsername, checkUsernameUniqueness]);


  const nextStep = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep((prev) => prev - 1);


  const onSubmit = (data: FormValues) => {
    if (!auth?.currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to complete your profile.' });
      return;
    }
    
    if (!data.birthDate || !(data.birthDate instanceof Date)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a valid birth date.' });
      form.setError("birthDate", { type: "manual", message: "A valid birth date is required." });
      return;
    }

    const currentUser = auth.currentUser;

    startTransition(async () => {
        let insights: OnboardingInsightsOutput | null = null;
        const formattedBirthDate = format(data.birthDate, 'yyyy-MM-dd');
        const zodiacSign = getZodiacSign(data.birthDate);

        try {
          insights = await generateOnboardingInsights({
            zodiacSign,
            birthDate: formattedBirthDate,
            favoriteDeities: data.favoriteDeities,
          });
        } catch (aiError: any) {
          console.error("AI Insight generation failed:", aiError);
          if (aiError.message && aiError.message.includes('429')) {
             toast({
                variant: "destructive",
                title: "AI Service Busy",
                description: "The horoscope service is currently busy. Your profile will be saved without it. Please try again later.",
             });
          } else {
            toast({
              variant: "destructive",
              title: "AI Insights Failed",
              description: "Could not generate welcome message. Your profile will be saved without it.",
            });
          }
        }
        
        await updateProfile(currentUser, { displayName: data.fullName });

        const batch = writeBatch(db);

        const userProfileRef = doc(db, `users/${currentUser.uid}`);
        const userProfileData = {
          email: currentUser.email,
          fullName: data.fullName,
          username: data.username,
          birthDate: formattedBirthDate,
          timeOfBirth: data.timeOfBirth,
          placeOfBirth: data.placeOfBirth,
          zodiacSign,
          profileComplete: true,
          creationTimestamp: serverTimestamp(),
          followerCount: 0,
          followingCount: 0,
          welcomeMessage: insights?.welcomeMessage || null, 
        };
        batch.set(userProfileRef, userProfileData, { merge: true });

        if (insights) {
          const horoscopeRef = doc(db, `users/${currentUser.uid}/horoscopes/daily`);
          const horoscopeData = {
            userId: currentUser.uid,
            date: format(new Date(), 'yyyy-MM-dd'),
            zodiacSign: zodiacSign,
            text_en: insights.horoscope,
            text_hi: insights.horoscope,
          };
          batch.set(horoscopeRef, horoscopeData, { merge: true });
        }

        const badgeRef = doc(db, `users/${currentUser.uid}/badges/spiritual-seeker`);
        batch.set(badgeRef, {
            id: 'spiritual-seeker',
            name: 'Spiritual Seeker',
            description: 'Completed the initial onboarding.',
            awardedAt: serverTimestamp(),
        });
        
        try {
            await batch.commit();
            toast({
                title: 'Profile Complete!',
                description: 'Welcome to aaura! Your spiritual journey begins now.',
            });
            router.push('/');
        } catch (serverError: any) {
            const isPermissionError = serverError.code === 'permission-denied';

            if (isPermissionError) {
                const permissionError = new FirestorePermissionError({
                    path: userProfileRef.path,
                    operation: 'write',
                    requestResourceData: userProfileData,
                });
                errorEmitter.emit('permission-error', permissionError);
            } else {
                 toast({
                    variant: "destructive",
                    title: "Save Failed",
                    description: "An unexpected error occurred while saving your profile.",
                });
                console.error("Firestore batch commit failed:", serverError);
            }
        }
    });
  };


  return (
    <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center">
        <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>
                A few more details will help us personalize your spiritual journey.
            </CardDescription>
            <Progress value={((currentStep + 1) / steps.length) * 100} className="w-full mt-2" />
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {currentStep === 0 && (
                    <>
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                <Input placeholder="Your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., spiritual_seeker" {...field} />
                                </FormControl>
                                <FormDescription>This will be your unique public name on Aaura.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="birthDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Birth Date</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-[240px] pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? (
                                        format(field.value, "PPP")
                                        ) : (
                                        <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                                    initialFocus
                                    fromYear={1900}
                                    toYear={new Date().getFullYear()}
                                    captionLayout="dropdown-buttons"
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormDescription>This helps us generate your horoscope.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="timeOfBirth"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Time of Birth</FormLabel>
                                <FormControl>
                                <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="placeOfBirth"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Place of Birth</FormLabel>
                                <FormControl>
                                <Input placeholder="City, Country" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </>
                )}

                {currentStep === 1 && (
                     <FormField
                        control={form.control}
                        name="favoriteDeities"
                        render={() => (
                            <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Favorite Deities</FormLabel>
                                <FormDescription>
                                Select a few deities you feel connected to. This will help us personalize your feed.
                                </FormDescription>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {deities.map((item) => (
                                <FormField
                                key={item.id}
                                control={form.control}
                                name="favoriteDeities"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={item.id}
                                        className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(item.slug)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), item.slug])
                                                : field.onChange(
                                                    field.value?.filter(
                                                    (value) => value !== item.slug
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal text-foreground">
                                           {item.name.en}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {currentStep === 2 && (
                    <div className="text-center p-8">
                        <h3 className="text-xl font-semibold">Almost there!</h3>
                        <p className="text-muted-foreground mt-2">Click below to generate your first personalized horoscope and start your journey on Aaura.</p>
                    </div>
                )}
                
                <div className="flex justify-between pt-4">
                    {currentStep > 0 ? (
                        <Button type="button" variant="outline" onClick={prevStep}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                    ) : (
                         <Button type="button" variant="ghost" onClick={() => router.push('/')}>
                            Back to Home
                        </Button>
                    )}
                    {currentStep < steps.length - 1 && (
                         <Button type="button" onClick={nextStep} className="ml-auto">
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                     {currentStep === steps.length - 1 && (
                        <Button type="submit" disabled={isPending} className="ml-auto">
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save and Complete
                            </>
                        )}
                        </Button>
                     )}
                </div>
            </form>
            </Form>
        </CardContent>
        </Card>
    </main>
  );
}
