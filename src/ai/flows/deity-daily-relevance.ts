'use server';

/**
 * @fileOverview Generates daily relevance and importance for a given deity.
 *
 * - getDeityDailyRelevance - A function that generates daily spiritual context for a deity.
 * - DeityDailyRelevanceInput - The input type for the function.
 * - DeityDailyRelevanceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DeityDailyRelevanceInputSchema = z.object({
  deityName: z.string().describe('The name of the Hindu deity.'),
});
export type DeityDailyRelevanceInput = z.infer<typeof DeityDailyRelevanceInputSchema>;

const DeityDailyRelevanceOutputSchema = z.object({
  todaysRelevance: z.string().describe("A brief paragraph on the deity's spiritual relevance for today."),
  tomorrowsImportance: z.string().describe("A brief paragraph on the deity's spiritual importance for tomorrow."),
});
export type DeityDailyRelevanceOutput = z.infer<typeof DeityDailyRelevanceOutputSchema>;

export async function getDeityDailyRelevance(input: DeityDailyRelevanceInput): Promise<DeityDailyRelevanceOutput> {
  return deityDailyRelevanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'deityDailyRelevancePrompt',
  input: {schema: DeityDailyRelevanceInputSchema},
  output: {schema: DeityDailyRelevanceOutputSchema},
  prompt: `You are a spiritual guide and expert in Hindu mythology. Based on the current date ({{currentDate}}), generate a short, uplifting paragraph for "Today's Relevance" and "Tomorrow's Importance" for the deity: {{{deityName}}}.

Connect their significance to modern life, potential astrological events, or timeless spiritual lessons. The tone should be insightful, positive, and accessible.

Deity: {{{deityName}}}

Respond in JSON format.`,
});

const deityDailyRelevanceFlow = ai.defineFlow(
  {
    name: 'deityDailyRelevanceFlow',
    inputSchema: DeityDailyRelevanceInputSchema,
    outputSchema: DeityDailyRelevanceOutputSchema,
  },
  async input => {
    const {output} = await prompt({
        ...input,
        currentDate: new Date().toDateString(),
    });
    return output!;
  }
);
