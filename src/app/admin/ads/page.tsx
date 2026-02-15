"use client";

import { useState, useMemo } from 'react';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { AdCategory, AdType, AdCta } from '@/types/ads';
import { CTA_OPTIONS } from '@/types/ads';
import { FeedAdCard } from '@/components/ads/FeedAdCard';
import { ReelsAdCard } from '@/components/ads/ReelsAdCard';
import { updateCampaignStatusAction, requestRefundAction } from '@/app/admin/ads/actions';

const COLLECTION_MAP: Record<AdCategory, string> = {
  temple: 'templeAds',
  pooja: 'poojaAds',
  mandapa: 'mandapaAds',
};

const defaultFormState = {
  title: '',
  description: '',
  imageUrl: '',
  videoUrl: '',
  link: '',
  sponsoredBy: '',
  priority: 5,
  type: 'feed' as AdType,
  category: 'temple' as AdCategory,
  ctaLabel: 'learn_more' as AdCta,
  active: true,
};

export default function AdsAdminPage() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const pendingQuery = useMemo(
    () => (db ? query(collection(db, 'advertiserCampaigns'), where('status', '==', 'pending_review')) : null),
    [db],
  );
  const [pendingCampaigns] = useCollection(pendingQuery);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const previewAd = useMemo(
    () => ({
      id: 'preview',
      ...form,
      createdAt: new Date().toISOString(),
    }),
    [form]
  );

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelect = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db) return;
    setSubmitting(true);
    try {
      const collectionName = COLLECTION_MAP[form.category];
      await addDoc(collection(db, collectionName), {
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl,
        videoUrl: form.videoUrl || null,
        link: form.link,
        sponsoredBy: form.sponsoredBy,
        priority: Number(form.priority) || 0,
        type: form.type,
        category: form.category,
        ctaLabel: form.ctaLabel,
        active: form.active,
        status: form.active ? 'approved' : 'pending_review',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Ad saved', description: 'The sponsored placement is ready.' });
      setForm(defaultFormState);
    } catch (error) {
      console.error('Failed to save ad', error);
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save ad. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateCampaignStatus = async (
    campaignId: string,
    adPath: string | undefined,
    nextStatus: 'approved' | 'rejected',
    options?: { rejectionReason?: string },
  ) => {
    if (!adPath) {
      toast({ variant: 'destructive', title: 'Missing ad document path.' });
      return;
    }

    try {
      setUpdatingId(campaignId);
      await updateCampaignStatusAction({
        campaignId,
        adPath,
        status: nextStatus,
        reason: options?.rejectionReason,
      });
      toast({
        title: nextStatus === 'approved' ? 'Campaign approved' : 'Campaign rejected',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to update campaign',
        description: error.message || 'Please try again.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRefund = async (campaignId: string, adPath: string | undefined) => {
    if (!adPath) {
      toast({ variant: 'destructive', title: 'Missing ad document path.' });
      return;
    }
    if (!window.confirm('Refund full payment for this campaign?')) {
      return;
    }
    try {
      setRefundingId(campaignId);
      await requestRefundAction({ campaignId, adPath });
      toast({ title: 'Refund initiated', description: 'Advertiser will receive the amount in 5-7 days.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Refund failed',
        description: error.message || 'Please try again.',
      });
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Sponsored Ads Manager</h1>
        <p className="text-muted-foreground">Create temple, pooja, and mandapa promotions for feed and reels.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={async () => {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return alert('Login expired.');
            const response = await fetch('/api/ads/export-all', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
              alert('Failed to download export.');
              return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'aaura-all-campaigns.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          Export All Campaigns
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create / Update Ad</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={handleChange('title')} required />
                </div>
                <div>
                  <Label htmlFor="sponsoredBy">Sponsored By</Label>
                  <Input id="sponsoredBy" value={form.sponsoredBy} onChange={handleChange('sponsoredBy')} required />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={handleChange('description')} rows={4} required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input id="imageUrl" value={form.imageUrl} onChange={handleChange('imageUrl')} required />
                </div>
                <div>
                  <Label htmlFor="videoUrl">Video URL (optional)</Label>
                  <Input id="videoUrl" value={form.videoUrl} onChange={handleChange('videoUrl')} placeholder="https://..." />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="link">CTA Link</Label>
                  <Input id="link" value={form.link} onChange={handleChange('link')} required />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={form.priority}
                    onChange={handleChange('priority')}
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Category</Label>
                  <Tabs value={form.category} onValueChange={(value) => handleSelect('category', value)}>
                    <TabsList className="grid grid-cols-3">
                      <TabsTrigger value="temple">Temple</TabsTrigger>
                      <TabsTrigger value="pooja">Pooja</TabsTrigger>
                      <TabsTrigger value="mandapa">Mandapa</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div>
                  <Label>Placement</Label>
                  <Tabs value={form.type} onValueChange={(value) => handleSelect('type', value)}>
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="feed">Feed</TabsTrigger>
                      <TabsTrigger value="reel">Reel</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div>
                  <Label htmlFor="ctaLabel">CTA</Label>
                  <select
                    id="ctaLabel"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.ctaLabel}
                    onChange={(event) => handleSelect('ctaLabel', event.target.value)}
                  >
                    {CTA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Only active ads are served.</p>
                </div>
                <Switch checked={form.active} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))} />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Saving...' : 'Save Ad'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={form.type}>
              <TabsList>
                <TabsTrigger value="feed">Feed Card</TabsTrigger>
                <TabsTrigger value="reel">Reel Card</TabsTrigger>
              </TabsList>
              <TabsContent value="feed">
                <FeedAdCard ad={previewAd as any} />
              </TabsContent>
              <TabsContent value="reel">
                <div className="h-[500px] rounded-2xl overflow-hidden border">
                  <ReelsAdCard ad={previewAd as any} isActive />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Self-Serve Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingCampaigns && pendingCampaigns.docs.length === 0 && (
            <p className="text-sm text-muted-foreground">No campaigns awaiting review.</p>
          )}
          {pendingCampaigns?.docs.map((docSnap) => {
            const data = docSnap.data() as any;
            return (
              <div key={docSnap.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{data.advertiser?.businessName || 'Unknown Advertiser'}</p>
                    <p className="text-sm text-muted-foreground">{data.packageSelections?.length || 0} packages</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/admin/ads#${data.adPath || ''}`}>Open Collection</a>
                  </Button>
                </div>
                <p className="text-sm mt-2">Total: ₹{(data.totalAmount || 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">Campaign ID: {docSnap.id}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    size="sm"
                    disabled={updatingId === docSnap.id}
                    onClick={() => updateCampaignStatus(docSnap.id, data.adPath, 'approved')}
                  >
                    {updatingId === docSnap.id ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={updatingId === docSnap.id}
                    onClick={() => {
                      const reason = window.prompt('Optional: provide rejection reason');
                      updateCampaignStatus(docSnap.id, data.adPath, 'rejected', { rejectionReason: reason || undefined });
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!refundingId || !!updatingId || !data.adPath}
                    onClick={() => handleRefund(docSnap.id, data.adPath)}
                  >
                    {refundingId === docSnap.id ? 'Refunding...' : 'Refund'}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
