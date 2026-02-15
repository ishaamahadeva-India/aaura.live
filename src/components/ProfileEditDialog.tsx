'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ImageUpload';
import { Loader2, Edit2, Save, User, Mail, Phone, Users, Calendar, CalendarIcon } from 'lucide-react';
import { useAuth, useFirestore, useStorage } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  email: z.string().email('Invalid email address.').optional(),
  mobile: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters.').optional(),
  birthDate: z.date().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  // Family details
  familyMembers: z.array(z.object({
    name: z.string(),
    relation: z.string(),
    age: z.number().optional(),
  })).optional(),
  profileImageFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditDialogProps {
  profile: any;
  onProfileUpdate?: () => void;
}

export function ProfileEditDialog({ profile, onProfileUpdate }: ProfileEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const [user] = useAuthState(auth);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName || '',
      email: profile?.email || user?.email || '',
      mobile: profile?.mobile || '',
      bio: profile?.bio || '',
      birthDate: profile?.birthDate ? new Date(profile.birthDate) : undefined,
      address: profile?.address || '',
      city: profile?.city || '',
      state: profile?.state || '',
      pincode: profile?.pincode || '',
      familyMembers: profile?.familyMembers || [],
    },
  });

  useEffect(() => {
    if (profile && open) {
      form.reset({
        fullName: profile.fullName || '',
        email: profile.email || user?.email || '',
        mobile: profile.mobile || '',
        bio: profile.bio || '',
        birthDate: profile.birthDate ? new Date(profile.birthDate) : undefined,
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
        familyMembers: profile.familyMembers || [],
      });
    }
  }, [profile, open, form, user]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to update your profile.',
      });
      return;
    }

    startTransition(async () => {
      try {
        let finalPhotoUrl = profile?.photoURL || user.photoURL;

        // Upload profile image if selected
        if (data.profileImageFile) {
          toast({ title: 'Uploading profile picture...' });
          const filePath = `users/${user.uid}/profileImage/${Date.now()}_${data.profileImageFile.name}`;
          const storageRef = ref(storage, filePath);
          const snapshot = await uploadBytes(storageRef, data.profileImageFile);
          finalPhotoUrl = await getDownloadURL(snapshot.ref);
          toast({ title: 'Profile picture uploaded!' });
        }

        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, {
          displayName: data.fullName,
          photoURL: finalPhotoUrl,
        });

        // Update Firestore profile
        const userRef = doc(db, `users/${user.uid}`);
        const updateData: any = {
          fullName: data.fullName,
          email: data.email || user.email,
          mobile: data.mobile,
          bio: data.bio,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          photoURL: finalPhotoUrl,
          updatedAt: serverTimestamp(),
        };

        if (data.birthDate) {
          updateData.birthDate = format(data.birthDate, 'yyyy-MM-dd');
        }

        if (data.familyMembers && data.familyMembers.length > 0) {
          updateData.familyMembers = data.familyMembers;
        }

        await updateDoc(userRef, updateData);

        toast({
          title: 'Profile Updated!',
          description: 'Your profile has been successfully updated.',
        });

        setOpen(false);
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      } catch (error: any) {
        console.error('Profile update error:', error);
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message || 'Failed to update profile. Please try again.',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be reflected immediately.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture */}
            <FormField
              control={form.control}
              name="profileImageFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <ImageUpload
                      onFileSelect={(file) => form.setValue('profileImageFile', file)}
                      initialUrl={profile?.photoURL || user?.photoURL}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a new profile picture. Recommended size: 400x400px
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" placeholder="Your full name" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" type="email" placeholder="your@email.com" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Your email address for account notifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mobile */}
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" type="tel" placeholder="+91 9876543210" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bio */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Birth Date */}
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
                            "w-full pl-3 text-left font-normal",
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
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Street address" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="Pincode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Family Members - Simplified for now */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                <FormLabel>Family Details</FormLabel>
              </div>
              <FormDescription className="mb-4">
                Family member details can be added in future updates.
              </FormDescription>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

