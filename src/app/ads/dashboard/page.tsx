'use client';

import { useMemo, useState, useEffect, useTransition } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, BarChart2, Target, PauseCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveWebhookConfigAction } from '@/app/ads/actions';
import { useToast } from '@/hooks/use-toast';

const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const WEBHOOK_EVENTS = [
  { id: 'campaign.submitted', label: 'When campaign is submitted' },
  { id: 'campaign.approved', label: 'When campaign is approved' },
  { id: 'campaign.rejected', label: 'When campaign is rejected' },
  { id: 'campaign.completed', label: 'When booked impressions complete' },
  { id: 'campaign.refunded', label: 'If Aaura issues a refund' },
  { id: 'wallet.topup', label: 'Wallet top-ups' },
];

export default function AdvertiserDashboardPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [user, loadingUser] = useAuthState(auth);
  const campaignsQuery = useMemo(
    () =>
      user && db
        ? query(
            collection(db, 'advertiserCampaigns'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
          )
        : null,
    [db, user],
  );
  const [campaignsSnapshot, loadingCampaigns] = useCollection(campaignsQuery);
  const webhookDocRef = useMemo(() => (user && db ? doc(db, 'advertiserWebhooks', user.uid) : null), [db, user]);
  const [webhookDoc] = useDocumentData(webhookDocRef);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['campaign.approved', 'campaign.rejected']);
  const [isSavingWebhook, startSaveWebhook] = useTransition();

  useEffect(() => {
    if (webhookDoc) {
      setWebhookUrl(webhookDoc.url || '');
      setWebhookSecret(webhookDoc.secret || '');
      setWebhookEvents(webhookDoc.events || ['campaign.approved']);
    }
  }, [webhookDoc]);

  const toggleWebhookEvent = (eventId: string) => {
    setWebhookEvents((prev) => {
      if (prev.includes(eventId)) {
        return prev.filter((id) => id !== eventId);
      }
      return [...prev, eventId];
    });
  };

  const handleSaveWebhook = () => {
    if (!user) return;
    startSaveWebhook(async () => {
      try {
        const authToken = await user.getIdToken();
        await saveWebhookConfigAction({
          authToken,
          url: webhookUrl,
          secret: webhookSecret,
          events: webhookEvents,
        });
        toast({
          title: 'Webhook saved',
          description: 'We will notify your endpoint for the selected events.',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Unable to save webhook',
          description: error.message,
        });
      }
    });
  };

  if (!user && !loadingUser) {
    return (
      <section className="container mx-auto px-4 py-20 text-center space-y-4">
        <Target className="w-10 h-10 mx-auto text-amber-500" />
        <h1 className="text-3xl font-bold">Log in to track your campaigns</h1>
        <p className="text-muted-foreground">Access performance metrics, status updates, and Billing.</p>
        <a href="/login" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Sign in
        </a>
      </section>
    );
  }

  if (loadingUser || loadingCampaigns) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const campaigns = campaignsSnapshot?.docs || [];

  return (
    <main className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Campaign Dashboard</h1>
          <p className="text-muted-foreground">Monitor stats and status of your promoted placements.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const token = await user.getIdToken();
                const response = await fetch('/api/ads/export', {
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
                link.download = 'aaura-campaigns.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Get real-time POST callbacks when campaign events occur. Use the secret to verify the
            <code className="px-1">X-Aaura-Signature</code> header.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Endpoint URL</label>
              <Input
                className="mt-1"
                placeholder="https://example.com/webhooks/aaura"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Signing secret</label>
              <Input
                className="mt-1"
                placeholder="Shared secret"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Events</p>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => {
                const active = webhookEvents.includes(event.id);
                return (
                  <Button
                    key={event.id}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => toggleWebhookEvent(event.id)}
                    size="sm"
                  >
                    {event.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              We retry failed webhooks up to 3 times with exponential backoff.
            </p>
            <Button onClick={handleSaveWebhook} disabled={!webhookUrl || isSavingWebhook}>
              {isSavingWebhook ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save webhook'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <BarChart2 className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No campaigns yet. Launch your first ad to see stats here.</p>
            <a href="/ads/promote" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md">
              Create Campaign
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {campaigns.map((docSnap) => {
            const data = docSnap.data() as any;
            const impressions = data.impressions || 0;
            const clicks = data.clicks || 0;
            const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
            const status = data.status || 'pending_review';
            const statusClass = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
            return (
              <Card key={docSnap.id} className="border">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{data.advertiser?.businessName || 'Your Campaign'}</CardTitle>
                    <Badge className={statusClass}>{status.replace('_', ' ')}</Badge>
                  </div>
                  {createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Started {formatDistanceToNow(createdAt, { addSuffix: true })}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Impressions</p>
                      <p className="text-lg font-semibold">{impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clicks</p>
                      <p className="text-lg font-semibold">{clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CTR</p>
                      <p className="text-lg font-semibold">{ctr}%</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      Packages:{' '}
                      {data.packageSelections
                        ?.map((selection: any) => `${selection.packageId} x${selection.quantity}`)
                        .join(', ') || 'N/A'}
                    </p>
                    <p>Total Spend: ₹{(data.totalAmount || 0).toLocaleString('en-IN')}</p>
                    {data.impressionLimit && (
                      <p>
                        Remaining Reach:{' '}
                        {Math.max(0, (data.impressionLimit || 0) - impressions).toLocaleString('en-IN')} impressions
                      </p>
                    )}
                    <p>Placement Type: {data.type || 'mixed'}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
