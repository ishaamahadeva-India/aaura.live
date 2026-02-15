'use server';

/**
 * @fileOverview Recommends spiritual products based on the user's viewed videos.
 *
 * - getProductRecommendations - A function that returns product recommendations based on video watch history.
 * - ProductRecommendationsInput - The input type for the getProductRecommendations function.
 * - ProductRecommendationsOutput - The return type for the getProductRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProductRecommendationsInputSchema = z.object({
  videoWatchHistory: z.array(z.string()).describe('An array of video titles the user has watched.'),
});
export type ProductRecommendationsInput = z.infer<typeof ProductRecommendationsInputSchema>;

const ProductRecommendationsOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      productName: z.string().describe('The name of the recommended product.'),
      productDescription: z.string().describe('A short description of the product.'),
    })
  ).describe('An array of product recommendations.'),
});
export type ProductRecommendationsOutput = z.infer<typeof ProductRecommendationsOutputSchema>;

export async function getProductRecommendations(input: ProductRecommendationsInput): Promise<ProductRecommendationsOutput> {
  return productRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productRecommendationsPrompt',
  input: {schema: ProductRecommendationsInputSchema},
  output: {schema: ProductRecommendationsOutputSchema},
  prompt: `You are a spiritual product recommendation expert. Given a user's video watch history, you will recommend relevant spiritual products.

  Video Watch History:
  {{#each videoWatchHistory}}
  - {{{this}}}
  {{/each}}

  Please provide a list of product recommendations based on the user's video watch history. Focus on products related to the themes and topics of the videos.
`,
});

const productRecommendationsFlow = ai.defineFlow(
  {
    name: 'productRecommendationsFlow',
    inputSchema: ProductRecommendationsInputSchema,
    outputSchema: ProductRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
