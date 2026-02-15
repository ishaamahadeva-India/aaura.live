

'use server';

// Note: dotenv config is now handled in src/lib/firebase/server.ts
// to ensure it's loaded before any server-side Firebase logic.

import '@/ai/flows/personalized-horoscope.ts';
import '@/ai/ai-video-recommendations.ts';
import '@/ai/flows/deity-daily-relevance.ts';
import '@/ai/flows/personalized-feed.ts';
import '@/ai/flows/create-payment-order.ts';
import '@/ai/ai-content-moderation.ts';
import '@/ai/flows/onboarding-insights.ts';
import '@/ai/flows/spiritual-advisor.ts';
import '@/ai/flows/personalize-panchang.ts';
