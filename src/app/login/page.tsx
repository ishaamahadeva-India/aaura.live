
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Icons } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  phoneNumber: z.string().optional(),
  termsAccepted: z.boolean().optional(),
});

const signupSchema = loginSchema.extend({
    phoneNumber: z
      .string()
      .min(10, { message: 'Enter a valid phone number (10 digits).' })
      .regex(/^\+?[0-9]{10,15}$/, { message: 'Phone must contain only numbers (optionally prefixed with +).' }),
    termsAccepted: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms and conditions to sign up." }),
    }),
});


type FormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user, loading] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      phoneNumber: '',
      termsAccepted: false,
    },
  });

  const checkAndRedirectUser = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists() && docSnap.data().profileComplete) {
        router.push('/feed');
      } else {
        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            id: user.uid,
            email: user.email,
            fullName: user.displayName || '',
            photoURL: user.photoURL || '',
            profileComplete: false,
            creationTimestamp: serverTimestamp(),
            followerCount: 0,
            followingCount: 0,
          }, { merge: true });
        }
        router.push('/profile/setup');
      }
    } catch (error: any) {
      console.error('Error checking/creating user document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to set up your account. Please try again.',
      });
    }
  };

  useEffect(() => {
    if (!loading && user) {
      checkAndRedirectUser(user);
    }
  }, [user, loading, router, db]);
  
const handleAuthAction = async (action: 'signIn' | 'signUp', data: FormValues) => {
    setIsSubmitting(true);
    const wasSignUp = action === 'signUp';
    setIsSignUp(wasSignUp);

    // Clear previous errors
    form.clearErrors();

    // Validate with the correct schema
    const schemaToUse = wasSignUp ? signupSchema : loginSchema;
    const result = schemaToUse.safeParse(data);
    
    if (!result.success) {
      // Set form errors
      result.error.errors.forEach((error) => {
        const field = error.path[0] as keyof FormValues;
        if (field) {
          form.setError(field, { message: error.message });
        }
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      let userCredential;
      if (action === 'signIn') {
        userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: 'Success!', description: 'You are now signed in.' });
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          phoneNumber: data.phoneNumber,
          fullName: userCredential.user.displayName || '',
          photoURL: userCredential.user.photoURL || '',
          profileComplete: false,
          creationTimestamp: serverTimestamp(),
          followerCount: 0,
          followingCount: 0,
        }, { merge: true });
        toast({ title: 'Account Created!', description: 'Let\'s set up your profile.' });
      }
      // User will be handled by useEffect hook
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Authentication service is not available. Please refresh the page.',
      });
      return;
    }

    if (!db) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database service is not available. Please refresh the page.',
      });
      return;
    }

    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    
    // Add additional scopes if needed
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters to allow account selection
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Immediately create/update user document in Firestore for Google sign-in
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (!docSnap.exists()) {
          // Create user document if it doesn't exist
          await setDoc(userDocRef, {
            id: user.uid,
            email: user.email || '',
            fullName: user.displayName || '',
            photoURL: user.photoURL || '',
            profileComplete: false,
            creationTimestamp: serverTimestamp(),
            followerCount: 0,
            followingCount: 0,
          }, { merge: true });
        } else {
          // Update existing document with latest Google profile info
          await setDoc(userDocRef, {
            email: user.email || docSnap.data()?.email || '',
            fullName: user.displayName || docSnap.data()?.fullName || '',
            photoURL: user.photoURL || docSnap.data()?.photoURL || '',
          }, { merge: true });
        }
      } catch (firestoreError: any) {
        console.error('Error creating/updating user document:', firestoreError);
        // Don't block sign-in if document creation fails, but log it
        toast({
          variant: 'destructive',
          title: 'Warning',
          description: 'Signed in successfully, but there was an issue saving your profile. Please try again.',
        });
      }
      
      // User document creation and redirection will be handled by useEffect hook
      toast({ title: 'Success!', description: 'You are now signed in with Google.' });
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthError = (error: any) => {
      let description = 'An unexpected error occurred.';
      let title = 'Authentication Failed';
      
      // Log the full error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Auth error details:', {
          code: error.code,
          message: error.message,
          email: error.email,
          credential: error.credential,
        });
      }
      
      switch (error.code) {
        case 'auth/user-not-found':
          description = 'No account found with this email. Please sign up.';
          break;
        case 'auth/wrong-password':
          description = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          description = 'This email is already in use. Please sign in.';
          break;
        case 'auth/weak-password':
          description = 'The password is too weak. Please choose a stronger password.';
          break;
        case 'auth/invalid-credential':
          description = 'Invalid credentials. Please check your email and password.';
          break;
        case 'auth/popup-closed-by-user':
          description = 'Sign-in was cancelled.';
          title = 'Sign-in Cancelled';
          break;
        case 'auth/popup-blocked':
          description = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
          title = 'Popup Blocked';
          break;
        case 'auth/account-exists-with-different-credential':
          description = 'An account already exists with the same email address but different sign-in credentials. Please use email/password to sign in.';
          break;
        case 'auth/operation-not-allowed':
          description = 'Google sign-in is not enabled in Firebase. Please contact support or use email/password sign-in.';
          break;
        case 'auth/unauthorized-domain':
          description = 'This domain is not authorized for Google sign-in. Please contact support.';
          break;
        case 'auth/network-request-failed':
          description = 'Network error. Please check your internet connection and try again.';
          break;
        case 'auth/too-many-requests':
          description = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/configuration-not-found':
          description = 'Google sign-in is not properly configured. Please contact support.';
          break;
        default:
          description = error.message || 'An unexpected error occurred. Please try again.';
          // Include error code in description if available
          if (error.code) {
            description += ` (Error: ${error.code})`;
          }
          break;
      }
      toast({
        variant: 'destructive',
        title: title,
        description: description,
      });
  }

  if (loading || user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 flex justify-center items-center">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Beautiful Brand Logo above Login/Signup */}
          <div className="mb-8 flex justify-center">
            <BrandLogo variant="large" showOm={true} href="#" className="pointer-events-none" />
          </div>
          <Card className="w-full bg-card">
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Sign in or create an account to continue</CardDescription>
            </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
                    Sign in with Google
                </Button>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="you@example.com" 
                          autoComplete={isSignUp ? "username" : "email"}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            {...field} 
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isSignUp && (
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+91XXXXXXXXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isSignUp && (
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Accept Terms and Conditions
                          </FormLabel>
                          <FormDescription>
                            By signing up, you agree to our{' '}
                            <Link href="/policies/terms-of-use" className="underline hover:text-primary">Terms of Use</Link>,{' '}
                            <Link href="/policies/privacy" className="underline hover:text-primary">Privacy Policy</Link>, and other related policies.
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="button"
                    variant={isSignUp ? "outline" : "default"}
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsSignUp(false);
                      handleAuthAction('signIn', form.getValues());
                    }}
                  >
                    {isSubmitting && !isSignUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    variant={isSignUp ? "default" : "outline"}
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsSignUp(true);
                      handleAuthAction('signUp', form.getValues());
                    }}
                  >
                    {isSubmitting && isSignUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign Up
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      </main>
  );
}
