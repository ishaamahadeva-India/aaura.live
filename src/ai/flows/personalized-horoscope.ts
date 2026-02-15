
'use server';

/**
 * @fileOverview Generates a personalized horoscope based on user zodiac sign and birth details.
 *
 * - generatePersonalizedHoroscope - A function that generates a personalized horoscope.
 * - PersonalizedHoroscopeInput - The input type for the generatePersonalizedHoroscope function.
 * - PersonalizedHoroscopeOutput - The return type for the generatePersonalizedHoroscope function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedHoroscopeInputSchema = z.object({
  zodiacSign: z.string().describe('The zodiac sign of the user.'),
  birthDate: z.string().describe('The birth date of the user (YYYY-MM-DD).'),
  timeZone: z.string().optional().describe('The time zone of the user (e.g., America/Los_Angeles).'),
});
export type PersonalizedHoroscopeInput = z.infer<typeof PersonalizedHoroscopeInputSchema>;

const PersonalizedHoroscopeOutputSchema = z.object({
  horoscope: z.object({
      love: z.string().describe("The user's love and relationship forecast for the day. Provide 1-2 sentences."),
      career: z.string().describe("The user's career and finance forecast for the day. Provide 1-2 sentences."),
      health: z.string().describe("The user's health and wellness forecast for the day. Provide 1-2 sentences."),
  }),
  luckyNumber: z.number().describe("A lucky number for the day between 1 and 100."),
  luckyColor: z.string().describe("A lucky color for the day."),
  disclaimer: z.string().default("This horoscope is for entertainment purposes only."),
});
export type PersonalizedHoroscopeOutput = z.infer<typeof PersonalizedHoroscopeOutputSchema>;

export async function generatePersonalizedHoroscope(input: PersonalizedHoroscopeInput): Promise<PersonalizedHoroscopeOutput> {
  return personalizedHoroscopeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedHoroscopePrompt',
  input: {schema: PersonalizedHoroscopeInputSchema},
  output: {schema: PersonalizedHoroscopeOutputSchema},
  prompt: `You are a Vedic Astrologer providing a personalized daily horoscope.

  **User Details:**
  - Zodiac Sign: {{{zodiacSign}}}
  - Birth Date: {{{birthDate}}}
  - Current Date: ${new Date().toDateString()}

  **Your Task:**
  Generate a positive, uplifting, and insightful horoscope for the user. The response must be in JSON format and include the following fields:

  1.  **horoscope**: An object with three sub-fields:
      *   'love': A 1-2 sentence forecast for relationships and personal connections.
      *   'career': A 1-2 sentence forecast for work, finance, and professional life.
      *   'health': A 1-2 sentence forecast for physical and mental well-being.
  2.  **luckyNumber**: A single lucky number for the day.
  3.  **luckyColor**: A single lucky color for the day.
  4.  **disclaimer**: Include the default disclaimer.
  
  Keep the tone encouraging and provide actionable, gentle advice.
  `,
});

const personalizedHoroscopeFlow = ai.defineFlow(
  {
    name: 'personalizedHoroscopeFlow',
    inputSchema: PersonalizedHoroscopeInputSchema,
    outputSchema: PersonalizedHoroscopeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
