// This is a server-side file
'use server';

/**
 * @fileOverview A content moderation AI agent for a spiritual and wellness platform.
 *
 * - moderateContent - A function that handles the content moderation process.
 * - ModerateContentInput - The input type for the moderateContent function.
 * - ModerateContentOutput - The return type for the moderateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateContentInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video file, as a data URI. This is not used in the prompt but required by the type."
    ),
  title: z.string().describe('The title of the video.'),
  description: z.string().describe('The description of the video.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
  isAppropriate: z.boolean().describe('Whether or not the content is appropriate for the platform.'),
  reason: z.string().describe('The reason why the content is not appropriate. This will be shown to the user.'),
  sentimentScore: z.number().describe('The sentiment score of the content, from 0 (negative) to 100 (positive).'),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
  return moderateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateContentPrompt',
  input: {schema: ModerateContentInputSchema},
  output: {schema: ModerateContentOutputSchema},
  prompt: `You are an AI content moderator for "Aaura," a platform dedicated exclusively to positive religious, spiritual, and wellness content. Your task is to analyze video metadata to ensure it aligns with the platform's core values.

  **Platform Rules:**
  1.  **Content Theme:** Must be strictly religious, spiritual, or wellness-focused (e.g., Hindu, Buddhist, Christian teachings, myths, scriptures, pooja rituals, yoga, meditation, positive mantras, uplifting stories).
  2.  **Positivity Requirement:** Content must be overwhelmingly positive. The sentiment score must be 80 or higher.
  3.  **Prohibited Content:** Absolutely no secular, political, violent, hateful, negative, or non-spiritual content is allowed.

  **Your Analysis:**
  Analyze the provided Title and Description. Based on the rules, determine if the content is appropriate.

  - If it violates any rule, set \`isAppropriate\` to \`false\` and provide a clear, concise \`reason\` for the rejection that will be shown to the user.
  - If it is appropriate, set \`isAppropriate\` to \`true\` and set the \`reason\` to "Content is appropriate.".
  - Calculate a \`sentimentScore\` from 0 (very negative) to 100 (very positive).

  **Video Metadata:**
  - Title: {{{title}}}
  - Description: {{{description}}}

  Respond in JSON format.
  `,
});

const moderateContentFlow = ai.defineFlow(
  {
    name: 'moderateContentFlow',
    inputSchema: ModerateContentInputSchema,
    outputSchema: ModerateContentOutputSchema,
  },
  async input => {
    // START: MOCK IMPLEMENTATION TO AVOID RATE LIMITS
    // This bypasses the actual AI call during development.
    // In production, you would remove this and use the prompt.
    console.log("Bypassing AI content moderation for development.");
    return {
      isAppropriate: true,
      reason: "Content approved (development mode).",
      sentimentScore: 95,
    };
    // END: MOCK IMPLEMENTATION

    /*
    // Original implementation - uncomment for production
    const {output} = await prompt(input);
    if (output) {
        // Enforce the 80% positivity rule
        if (output.sentimentScore < 80) {
            output.isAppropriate = false;
            output.reason = `Content does not meet the 80% positivity requirement. Detected sentiment score: ${output.sentimentScore}.`;
        }
    }
    return output!;
    */
  }
);
