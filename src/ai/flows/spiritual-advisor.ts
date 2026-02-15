
'use server';

/**
 * @fileOverview An AI-powered spiritual advisor.
 *
 * - spiritualAdvisor - A function that answers user questions from a spiritual perspective.
 * - SpiritualAdvisorInput - The input type for the function.
 * - SpiritualAdvisorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SpiritualAdvisorInputSchema = z.object({
  query: z.string().describe('The user\'s question or topic of concern.'),
  userProfile: z.object({
    fullName: z.string().optional(),
    zodiacSign: z.string().optional(),
    favoriteDeities: z.array(z.string()).optional(),
  }).describe('The user\'s profile information for context.'),
});
export type SpiritualAdvisorInput = z.infer<typeof SpiritualAdvisorInputSchema>;

const SpiritualAdvisorOutputSchema = z.object({
  response: z.string().describe('The AI-generated answer to the user\'s query.'),
  suggestedContent: z.array(z.object({
    title: z.string().describe('The title of the suggested content.'),
    path: z.string().describe('The path to the content within the app (e.g., /stories/ramayana-summary).'),
  })).optional().describe('A list of relevant content to suggest to the user.'),
});
export type SpiritualAdvisorOutput = z.infer<typeof SpiritualAdvisorOutputSchema>;

export async function spiritualAdvisor(input: SpiritualAdvisorInput): Promise<SpiritualAdvisorOutput> {
  return spiritualAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'spiritualAdvisorPrompt',
  input: { schema: SpiritualAdvisorInputSchema },
  output: { schema: SpiritualAdvisorOutputSchema },
  prompt: `You are "Guru AI," a wise, compassionate, and knowledgeable spiritual advisor for the "Aaura" app. Your purpose is to provide guidance, answer questions, and offer comfort based on Hindu philosophy, mythology, and spiritual practices.

  **User Information for Context:**
  - Name: {{{userProfile.fullName}}}
  - Zodiac Sign: {{{userProfile.zodiacSign}}}
  - Favorite Deities: {{#each userProfile.favoriteDeities}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  **User's Question:**
  "{{{query}}}"

  **Your Task:**
  1.  **Provide a Thoughtful Response:** Address the user's question directly. Your tone should be gentle, encouraging, and wise. Use stories, concepts, or quotes from Hindu scriptures (like the Bhagavad Gita, Vedas, Upanishads) where appropriate, but explain them simply.
  2.  **Personalize Your Answer:** If possible, connect your answer to the user's zodiac sign or favorite deities to make it more personal. For example, if they ask about strength and their favorite deity is Hanuman, you can draw a parallel.
  3.  **Suggest Relevant Content (Optional):** If the user's question relates to a topic covered in the app (like a specific deity, festival, or story), suggest one or two relevant pieces of content. Provide a title and a valid app path (e.g., /deities/ganesha, /stories/ramayana-summary, /rituals/daily-surya-puja). Do not suggest content if it's not a strong match.

  **Example Response Structure:**
  If a user asks, "I'm feeling lost and without purpose," you might respond with a gentle explanation of Dharma, perhaps connecting it to their zodiac's traits, and then suggest they read the story of the Mahabharata.

  Respond in valid JSON format.
  `,
});

const spiritualAdvisorFlow = ai.defineFlow(
  {
    name: 'spiritualAdvisorFlow',
    inputSchema: SpiritualAdvisorInputSchema,
    outputSchema: SpiritualAdvisorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
