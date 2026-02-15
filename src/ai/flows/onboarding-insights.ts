
'use server';

/**
 * @fileOverview Generates personalized insights for a new user upon completing onboarding.
 *
 * - generateOnboardingInsights - A function that returns a welcome message and horoscope.
 * - OnboardingInsightsInput - The input type for the function.
 * - OnboardingInsightsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OnboardingInsightsInputSchema = z.object({
  zodiacSign: z.string().describe('The zodiac sign of the user.'),
  birthDate: z.string().describe('The birth date of the user (YYYY-MM-DD).'),
  favoriteDeities: z.array(z.string()).describe('A list of the user\'s favorite deities.'),
});
export type OnboardingInsightsInput = z.infer<typeof OnboardingInsightsInputSchema>;

const OnboardingInsightsOutputSchema = z.object({
  welcomeMessage: z.string().describe('A personalized welcome message that mentions the user\'s zodiac sign and suggests exploring one of their favorite deities.'),
  horoscope: z.string().describe('The generated personalized horoscope for the day.'),
});
export type OnboardingInsightsOutput = z.infer<typeof OnboardingInsightsOutputSchema>;

export async function generateOnboardingInsights(input: OnboardingInsightsInput): Promise<OnboardingInsightsOutput> {
  return onboardingInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'onboardingInsightsPrompt',
  input: {schema: OnboardingInsightsInputSchema},
  output: {schema: OnboardingInsightsOutputSchema},
  prompt: `You are a warm and welcoming spiritual guide for the "Aaura" app. A new user has just completed their profile. Generate a personalized set of insights for them based on their details.

  **User Details:**
  - Zodiac Sign: {{{zodiacSign}}}
  - Birth Date: {{{birthDate}}}
  - Favorite Deities: {{#each favoriteDeities}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  **Your Task:**

  1.  **Generate a Welcome Message:**
      - Start with "Welcome, {{{zodiacSign}}}!".
      - Write a short, uplifting sentence about a positive quality of their zodiac sign.
      - Connect this quality to one of their favorite deities. For example: "Your fiery Aries energy aligns perfectly with the courage of Lord Hanuman. We recommend exploring his stories on your journey with us."
      - Keep it to 2-3 sentences.

  2.  **Generate a Daily Horoscope:**
      - Create a positive, uplifting, and brief (3-4 sentences) horoscope for today based on their zodiac sign.
      - Focus on spiritual well-being, mindfulness, or positive actions.

  Respond in a valid JSON format.
  `,
});

const onboardingInsightsFlow = ai.defineFlow(
  {
    name: 'onboardingInsightsFlow',
    inputSchema: OnboardingInsightsInputSchema,
    outputSchema: OnboardingInsightsOutputSchema,
  },
  async input => {
    // START: MOCK IMPLEMENTATION TO AVOID RATE LIMITS
    // This bypasses the actual AI call during development.
    // In production, you would remove this and use the prompt.
    console.log("Bypassing AI onboarding insights for development.");
    return {
        welcomeMessage: `Welcome, ${input.zodiacSign}! Your adventurous spirit is a divine gift. We recommend exploring stories of Hanuman on your journey with us.`,
        horoscope: "Today is a wonderful day for new beginnings. Embrace the positive energy around you and take a moment for quiet reflection. An unexpected joy is on its way."
    };
    // END: MOCK IMPLEMENTATION

    /*
    // Original implementation - uncomment for production
    const {output} = await prompt(input);
    return output!;
    */
  }
);
