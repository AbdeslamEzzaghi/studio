'use server';
/**
 * @fileOverview A code explanation AI assistant that adds comments to explain sections of code.
 *
 * - codeAssistantCodeExplanation - A function that handles the code explanation process.
 * - CodeAssistantCodeExplanationInput - The input type for the codeAssistantCodeExplanation function.
 * - CodeAssistantCodeExplanationOutput - The return type for the codeAssistantCodeExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeAssistantCodeExplanationInputSchema = z.object({
  code: z.string().describe('The Python code to explain.'),
});
export type CodeAssistantCodeExplanationInput = z.infer<
  typeof CodeAssistantCodeExplanationInputSchema
>;

const CodeAssistantCodeExplanationOutputSchema = z.object({
  explainedCode: z.string().describe('The Python code with added comments.'),
});
export type CodeAssistantCodeExplanationOutput = z.infer<
  typeof CodeAssistantCodeExplanationOutputSchema
>;

export async function codeAssistantCodeExplanation(
  input: CodeAssistantCodeExplanationInput
): Promise<CodeAssistantCodeExplanationOutput> {
  return codeAssistantCodeExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'codeAssistantCodeExplanationPrompt',
  input: {schema: CodeAssistantCodeExplanationInputSchema},
  output: {schema: CodeAssistantCodeExplanationOutputSchema},
  prompt: `You are an AI code assistant that automatically adds comments to explain sections of code.

  Please add comments to the following Python code to explain what each section does:

  {{code}}`,
});

const codeAssistantCodeExplanationFlow = ai.defineFlow(
  {
    name: 'codeAssistantCodeExplanationFlow',
    inputSchema: CodeAssistantCodeExplanationInputSchema,
    outputSchema: CodeAssistantCodeExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
