'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth, useFirestore, useStorage } from '@/lib/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRazorpay } from '@/hooks/use-razorpay';
import { AD_PACKAGES, AD_PACKAGE_MAP } from '@/data/ad-packages';
import {
  createAdOrderAction,
  finalizeAdCampaignAction,
  finalizeAdCampaignWithWalletAction,
  createWalletTopupOrderAction,
  finalizeWalletTopupAction,
} from '@/app/ads/actions';
import type { AdvertiserProfile } from '@/types/advertiser';
import type { AdCta, AdCategory, AdPackageSelection, AdType } from '@/types/ads';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CTA_OPTIONS } from '@/types/ads';
import { Sparkles, CheckCircle, Loader2, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateCreativeLink } from '@/lib/validation/url';
import { Switch } from '@/components/ui/switch';

const CATEGORY_OPTIONS: { value: AdCategory; label: string }[] = [
  { value: 'temple', label: 'Temple' },
  { value: 'pooja', label: 'Pooja' },
  { value: 'mandapa', label: 'Mandapa' },
];

const DEFAULT_TARGETING_SECTIONS = ['all', 'temples', 'stories', 'videos', 'posts', 'rituals', 'reels'];
const TARGETING_LABELS: Record<string, string> = {
  all: 'All feed',
  temples: 'Temples',
  stories: 'Stories',
  videos: 'Videos',
  posts: 'Articles',
  rituals: 'Rituals',
  reels: 'Reels',
};

const INITIAL_PROFILE: AdvertiserProfile = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  gstNumber: '',
  website: '',
  address: '',
};

export default function PromoteAdsPage() {
  const auth = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { isReady: isRazorpayReady, error: razorpayError } = useRazorpay();
  const [user] = useAuthState(auth);
  const advertiserRef = useMemo(() => (user && db ? doc(db, 'advertisers', user.uid) : null), [db, user]);
  const walletRef = useMemo(() => (user && db ? doc(db, 'advertiserWallets', user.uid) : null), [db, user]);
  const [advertiserDoc, advertiserLoading] = useDocumentData(advertiserRef);
  const [walletDoc] = useDocumentData(walletRef);
  const walletBalance = walletDoc?.balance || 0;

  const [profile, setProfile] = useState<AdvertiserProfile>(INITIAL_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);
  const [placementType, setPlacementType] = useState<AdType>('feed');
  const [selectedPackages, setSelectedPackages] = useState<Record<string, number>>({});
  const [creativeCategory, setCreativeCategory] = useState<AdCategory>('temple');
  const [ctaLabel, setCtaLabel] = useState<AdCta>('learn_more');
  const [creativeTitle, setCreativeTitle] = useState('');
  const [creativeDescription, setCreativeDescription] = useState('');
  const [creativeLink, setCreativeLink] = useState('');
  const [creativeSponsor, setCreativeSponsor] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [topupAmount, setTopupAmount] = useState(2000);
  const [useWallet, setUseWallet] = useState(false);
  const [targetingSections, setTargetingSections] = useState<string[]>(['all']);
  const availableTargetingSections = useMemo(() => {
    const selectionsArray = Object.entries(selectedPackages)
      .filter(([, qty]) => qty > 0)
      .map(([packageId]) => packageId);
    if (!selectionsArray.length) {
      return DEFAULT_TARGETING_SECTIONS;
    }
    const set = new Set<string>();
    selectionsArray.forEach((id) => {
      const pkg = AD_PACKAGE_MAP[id];
      if (pkg?.targetingSections) {
        pkg.targetingSections.forEach((section) => set.add(section));
      }
    });
    return set.size ? Array.from(set) : DEFAULT_TARGETING_SECTIONS;
  }, [selectedPackages]);

  useEffect(() => {
    if (advertiserDoc) {
      setProfile((prev) => ({
        ...prev,
        businessName: advertiserDoc.businessName || '',
        contactName: advertiserDoc.contactName || '',
        email: advertiserDoc.email || user?.email || '',
        phone: advertiserDoc.phone || '',
        gstNumber: advertiserDoc.gstNumber || '',
        website: advertiserDoc.website || '',
        address: advertiserDoc.address || '',
      }));
      setProfileSaved(true);
      if (advertiserDoc.businessName) {
        setCreativeSponsor((s) => s || advertiserDoc.businessName);
      }
    } else if (user?.email) {
      setProfile((prev) => ({ ...prev, email: user.email! }));
    }
  }, [advertiserDoc, user]);

  useEffect(() => {
    setTargetingSections((prev) => {
      const filtered = prev.filter((section) => availableTargetingSections.includes(section));
      if (filtered.length > 0) {
        return filtered;
      }
      return [availableTargetingSections[0]];
    });
  }, [availableTargetingSections]);

  useEffect(() => {
    if (!canUseWallet) {
      setUseWallet(false);
    }
  }, [canUseWallet]);

  useEffect(() => {
    if (razorpayError) {
      toast({
        variant: 'destructive',
        title: 'Payment gateway unavailable',
        description: razorpayError,
      });
    }
  }, [razorpayError, toast]);

  const filteredPackages = useMemo(
    () => AD_PACKAGES.filter((pkg) => pkg.type === placementType),
    [placementType],
  );

  const packageSelections: AdPackageSelection[] = useMemo(
    () =>
      Object.entries(selectedPackages)
        .filter(([, quantity]) => quantity > 0)
        .map(([packageId, quantity]) => ({ packageId, quantity })),
    [selectedPackages],
  );

  const totalAmount = useMemo(
    () =>
      packageSelections.reduce((sum, selection) => {
        const pkg = AD_PACKAGES.find((p) => p.id === selection.packageId);
        if (!pkg) return sum;
        return sum + pkg.price * selection.quantity;
      }, 0),
    [packageSelections],
  );
  const canUseWallet = totalAmount > 0 && walletBalance >= totalAmount;
  const walletShortfall = Math.max(0, totalAmount - walletBalance);

  const handleProfileChange = (field: keyof AdvertiserProfile) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setProfile((prev) => ({ ...prev, [field]: value }));
    setProfileSaved(false);
  };

  const handleSaveProfile = async () => {
    if (!user || !advertiserRef) return;
    try {
      await setDoc(
        advertiserRef,
        {
          ...profile,
          updatedAt: serverTimestamp(),
          createdAt: advertiserDoc?.createdAt || serverTimestamp(),
        },
        { merge: true },
      );
      setProfileSaved(true);
      toast({ title: 'Profile saved' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to save profile', description: error.message });
    }
  };

  const adjustPackageQuantity = (packageId: string, delta: number) => {
    setSelectedPackages((prev) => {
      const next = { ...prev };
      const current = next[packageId] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) {
        delete next[packageId];
      } else {
        next[packageId] = updated;
      }
      return next;
    });
  };

  const uploadCreativeAssets = useCallback(async () => {
    if (!storage || !user) throw new Error('Storage is unavailable.');
    if (!imageFile) throw new Error('A hero image is required.');
    setIsUploading(true);
    setUploadProgress(0);

    const uploadSingle = (file: File, folder: string) =>
      new Promise<string>((resolve, reject) => {
        const storageRef = ref(storage, `ads/${user.uid}/${folder}/${Date.now()}-${file.name}`);
        const task = uploadBytesResumable(storageRef, file);
        task.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => reject(error),
          async () => resolve(await getDownloadURL(task.snapshot.ref)),
        );
      });

    try {
      const imageUrl = await uploadSingle(imageFile, 'images');
      const videoUrl = videoFile ? await uploadSingle(videoFile, 'videos') : undefined;
      return { imageUrl, videoUrl };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [imageFile, storage, user, videoFile]);

  const handleTopup = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Please log in to top up.' });
      return;
    }
    if (topupAmount < 500) {
      toast({ variant: 'destructive', title: 'Minimum top-up is ₹500.' });
      return;
    }
    if (!isRazorpayReady || !window.Razorpay) {
      toast({ variant: 'destructive', title: 'Payment gateway is not ready.' });
      return;
    }
    setIsToppingUp(true);
    try {
      const authToken = await user.getIdToken();
      const order = await createWalletTopupOrderAction({ authToken, amount: topupAmount });
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Aaura Wallet',
        description: 'Ad wallet top-up',
        order_id: order.orderId,
        handler: async (response: any) => {
          await finalizeWalletTopupAction({
            authToken,
            amount: topupAmount,
            payment: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              currency: order.currency || 'INR',
            },
          });
          toast({ title: 'Wallet funded', description: 'Balance updated successfully.' });
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast({ variant: 'destructive', title: 'Top-up failed', description: 'Please try again.' });
      });
      rzp.open();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Unable to top up', description: error.message });
    } finally {
      setIsToppingUp(false);
    }
  };

  const toggleTargetingSection = (section: string) => {
    setTargetingSections((prev) => {
      if (prev.includes(section)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== section);
      }
      return [...prev, section];
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Please log in to promote.' });
      return;
    }
    if (!profileSaved) {
      toast({ variant: 'destructive', title: 'Save your business profile first.' });
      return;
    }
    if (!packageSelections.length) {
      toast({ variant: 'destructive', title: 'Select at least one package.' });
      return;
    }
    if (totalAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid total amount.' });
      return;
    }
    if (!creativeTitle || !creativeDescription || !creativeLink || !creativeSponsor) {
      toast({ variant: 'destructive', title: 'Complete the creative details.' });
      return;
    }
    if (!validateCreativeLink(creativeLink)) {
      toast({ variant: 'destructive', title: 'Please use a valid HTTPS link without query tracking.' });
      return;
    }
    if (!imageFile) {
      toast({ variant: 'destructive', title: 'Upload a hero image.' });
      return;
    }
    if (!isRazorpayReady || !window.Razorpay) {
      toast({ variant: 'destructive', title: 'Payment gateway is not ready yet. Please try again.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { imageUrl, videoUrl } = await uploadCreativeAssets();
      const authToken = await user.getIdToken();

      if (useWallet) {
        await finalizeAdCampaignWithWalletAction({
          authToken,
          packageSelections,
          advertiser: profile,
          creative: {
            title: creativeTitle,
            description: creativeDescription,
            imageUrl,
            videoUrl,
            link: creativeLink,
            ctaLabel,
            sponsoredBy: creativeSponsor,
            category: creativeCategory,
            type: placementType,
            targetingSections,
          },
        });
        toast({ title: 'Campaign submitted!', description: 'Wallet balance debited.' });
        setSelectedPackages({});
        setCreativeTitle('');
        setCreativeDescription('');
        setCreativeLink('');
        setCreativeSponsor(profile.businessName || '');
        setImageFile(null);
        setVideoFile(null);
        return;
      }

      const order = await createAdOrderAction({
        authToken,
        packageSelections,
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Aaura Ads',
        description: 'Promoted Campaign',
        image: '/icons/android-chrome-192x192.png',
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            await finalizeAdCampaignAction({
              authToken,
              packageSelections,
              advertiser: profile,
              creative: {
                title: creativeTitle,
                description: creativeDescription,
                imageUrl,
                videoUrl,
                link: creativeLink,
                ctaLabel,
                sponsoredBy: creativeSponsor,
                category: creativeCategory,
                type: placementType,
                targetingSections,
              },
              payment: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: order.amount,
                currency: order.currency || 'INR',
              },
            });
            toast({
              title: 'Campaign submitted!',
              description: 'Our team will review and approve it shortly.',
            });
            setSelectedPackages({});
            setCreativeTitle('');
            setCreativeDescription('');
            setCreativeLink('');
            setCreativeSponsor(profile.businessName || '');
            setImageFile(null);
            setVideoFile(null);
          } catch (error: any) {
            toast({
              variant: 'destructive',
              title: 'Failed to finalize campaign',
              description: error.message,
            });
          }
        },
        prefill: {
          name: profile.contactName || profile.businessName,
          email: profile.email,
          contact: profile.phone,
        },
        notes: {
          campaign: creativeTitle,
        },
        theme: {
          color: '#c07d1b',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: response.error?.description || 'Please try again.',
        });
      });
      rzp.open();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Unable to start payment',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="container mx-auto px-4 py-20 text-center space-y-6">
        <Sparkles className="w-12 h-12 mx-auto text-amber-500" />
        <h1 className="text-3xl font-bold">Sign in to promote your temple, pooja, or mandapa</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create an account to unlock self-serve ad placements across the Aaura community.
        </p>
        <Button asChild>
          <a href="/login">Login to continue</a>
        </Button>
      </section>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10 space-y-10">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
          Self-Serve Campaigns
        </Badge>
        <h1 className="text-4xl font-headline font-bold">
          Promote your temple experiences to a devotional audience
        </h1>
        <p className="text-muted-foreground">
          Pick a package, upload your creative, and launch sponsored placements in minutes.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>1. Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Business Name</Label>
                <Input value={profile.businessName} onChange={handleProfileChange('businessName')} placeholder="Sri Guruvayur Mandir" />
              </div>
              <div>
                <Label>Contact Name</Label>
                <Input value={profile.contactName} onChange={handleProfileChange('contactName')} placeholder="Mahesh Kumar" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={profile.email} onChange={handleProfileChange('email')} placeholder="you@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={profile.phone} onChange={handleProfileChange('phone')} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>GST Number (optional)</Label>
                <Input value={profile.gstNumber || ''} onChange={handleProfileChange('gstNumber')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <Label>Website (optional)</Label>
                <Input value={profile.website || ''} onChange={handleProfileChange('website')} placeholder="https://yourtemple.com" />
              </div>
              <div>
                <Label>Address (optional)</Label>
                <Input value={profile.address || ''} onChange={handleProfileChange('address')} placeholder="City, State" />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={advertiserLoading}>
              {profileSaved ? 'Profile updated' : 'Save profile'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total packages</span>
              <span className="font-semibold">{packageSelections.length}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Wallet balance</p>
                  <p className="text-lg font-semibold">₹{walletBalance.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Use wallet</span>
                  <Switch checked={useWallet} onCheckedChange={(checked) => setUseWallet(checked)} disabled={!canUseWallet} />
                </div>
              </div>
              {!canUseWallet && totalAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Add ₹{walletShortfall.toLocaleString('en-IN')} to pay entirely with wallet.
                </p>
              )}
              {useWallet && <p className="text-xs text-emerald-600">This campaign will be charged to your wallet.</p>}
            </div>
            <Separator />
            <Button
              onClick={handleCheckout}
              className="w-full"
              disabled={isSubmitting || isUploading || !packageSelections.length}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${totalAmount.toLocaleString('en-IN')}`
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Payments are encrypted & secured via Razorpay.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ad Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Keep a balance to launch campaigns instantly without entering payment details every time.
            </p>
            <div>
              <Label htmlFor="topupAmount">Top-up amount (₹500+)</Label>
              <Input
                id="topupAmount"
                type="number"
                min={500}
                value={topupAmount}
                onChange={(e) => setTopupAmount(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleTopup} disabled={isToppingUp || topupAmount < 500 || !isRazorpayReady}>
              {isToppingUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Add ₹${topupAmount.toLocaleString('en-IN')}`
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Wallet payments auto-generate invoices and show up in your campaign receipts.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">2. Choose your package</h2>
            <p className="text-muted-foreground">Select a placement and adjust quantity.</p>
          </div>
          <Tabs value={placementType} onValueChange={(value) => {
            setPlacementType(value as AdType);
            setSelectedPackages({});
          }}>
            <TabsList>
              <TabsTrigger value="feed">Feed Ads</TabsTrigger>
              <TabsTrigger value="reel">Reel Ads</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {filteredPackages.map((pkg) => {
            const quantity = selectedPackages[pkg.id] || 0;
            return (
              <Card key={pkg.id} className={cn('border-amber-100', quantity > 0 && 'ring-2 ring-amber-300')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{pkg.title}</span>
                    {quantity > 0 && (
                      <Badge variant="secondary">{quantity} selected</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold">₹{pkg.price.toLocaleString('en-IN')}</span>
                    <span className="text-sm text-muted-foreground">{pkg.durationLabel}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{pkg.reachEstimate}</div>
                  <ul className="text-sm space-y-1">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-amber-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => adjustPackageQuantity(pkg.id, -1)} disabled={quantity === 0}>
                      -
                    </Button>
                    <span className="w-10 text-center font-semibold">{quantity}</span>
                    <Button variant="outline" onClick={() => adjustPackageQuantity(pkg.id, 1)}>
                      +
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">3. Upload creative</h2>
          <p className="text-muted-foreground">We’ll show this across Aaura once it’s reviewed.</p>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Campaign Title</Label>
                <Input value={creativeTitle} onChange={(e) => setCreativeTitle(e.target.value)} placeholder="Sacred Mandala Retreat" />
              </div>
              <div>
                <Label>Sponsored By</Label>
                <Input value={creativeSponsor} onChange={(e) => setCreativeSponsor(e.target.value)} placeholder="Sri Guruvayur Trust" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={creativeDescription}
                onChange={(e) => setCreativeDescription(e.target.value)}
                rows={4}
                placeholder="Share the story, rituals, or darshan experience you want seekers to know."
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Destination Link</Label>
                <Input value={creativeLink} onChange={(e) => setCreativeLink(e.target.value)} placeholder="https://example.com/book" />
              </div>
              <div>
                <Label>CTA</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value as AdCta)}>
                  {CTA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Category</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={creativeCategory} onChange={(e) => setCreativeCategory(e.target.value as AdCategory)}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-2">
                <Label>Hero Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground">JPG/PNG up to 5MB.</p>
              </div>
              <div className="border rounded-lg p-4 space-y-2">
                <Label>Optional Video</Label>
                <Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground">MP4 up to 30MB.</p>
              </div>
            </div>
            <div>
              <Label>Audience targeting</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTargetingSections.map((section) => {
                  const active = targetingSections.includes(section);
                  return (
                    <Button
                      key={section}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleTargetingSection(section)}
                    >
                      {TARGETING_LABELS[section] || section}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ads only appear when seekers browse the matching sections. Select at least one.
              </p>
            </div>
            {isUploading && (
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading creative... {uploadProgress}%
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
