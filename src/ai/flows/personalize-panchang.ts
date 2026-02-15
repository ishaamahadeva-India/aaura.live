
'use server';

/**
 * @fileOverview A flow to personalize Panchang recommendations using AI.
 * 
 * - personalizePanchang - A function that returns personalized spiritual activities.
 * - PersonalizedPanchangInput - The input type for the function.
 * - PersonalizedPanchangOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// 1. Input/Output Schema Definition
const PersonalizedPanchangInputSchema = z.object({
  userId: z.string().describe('The UID of the user.'),
  zodiacSign: z.string().describe('The user\'s zodiac sign.'),
  panchang: z.object({
    tithi: z.string().describe('The tithi for the day.'),
    nakshatra: z.string().describe('The nakshatra for the day.'),
  }).describe('Key Panchang details for the day.'),
});
export type PersonalizedPanchangInput = z.infer<typeof PersonalizedPanchangInputSchema>;

const PersonalizedPanchangOutputSchema = z.object({
  recommendations: z.array(z.string()).describe('A list of 3 personalized spiritual activities.'),
});
export type PersonalizedPanchangOutput = z.infer<typeof PersonalizedPanchangOutputSchema>;


// 2. Exported "Callable" Function
export async function personalizePanchang(input: PersonalizedPanchangInput): Promise<PersonalizedPanchangOutput> {
  return personalizePanchangFlow(input);
}

// 3. Genkit Prompt
const prompt = ai.definePrompt({
    name: 'personalizePanchangPrompt',
    input: { schema: PersonalizedPanchangInputSchema },
    output: { schema: PersonalizedPanchangOutputSchema },
    prompt: `You are a wise and modern spiritual guide for the "Aaura" app.
    
    A user with the zodiac sign '{{{zodiacSign}}}' is looking for personalized guidance based on today's Panchang.
    
    Today's Panchang:
    - Tithi: {{{panchang.tithi}}}
    - Nakshatra: {{{panchang.nakshatra}}}

    Your Task:
    Based on the user's zodiac sign and the day's Panchang, suggest exactly three short, simple, and actionable spiritual activities. Frame them as positive recommendations. Be creative and inspiring.

    Examples:
    - "As a Leo, today's Hasta Nakshatra encourages you to express your creativity. Try journaling your spiritual thoughts."
    - "The energy of Dwadashi tithi supports selfless service. As a Capricorn, consider donating to a cause you care about today."
    - "Your Gemini curiosity aligns with today's intellectual yoga. Try reading a new spiritual text for 15 minutes."

    Respond in JSON format with a 'recommendations' array containing three string suggestions.
    `,
});


// 4. The Genkit Flow Implementation
const personalizePanchangFlow = ai.defineFlow(
  {
    name: 'personalizePanchangFlow',
    inputSchema: PersonalizedPanchangInputSchema,
    outputSchema: PersonalizedPanchangOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
