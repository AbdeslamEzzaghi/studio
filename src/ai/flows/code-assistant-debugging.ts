'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing debugging suggestions based on code errors and output.
 *
 * - codeAssistantDebugging - A function that takes code, output, and errors as input and returns debugging suggestions.
 * - CodeAssistantDebuggingInput - The input type for the codeAssistantDebugging function.
 * - CodeAssistantDebuggingOutput - The return type for the codeAssistantDebugging function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeAssistantDebuggingInputSchema = z.object({
  code: z.string().describe('The Python code to debug.'),
  output: z.string().describe('The output of the code execution.'),
  errors: z.string().describe('Any errors that occurred during code execution.'),
});
export type CodeAssistantDebuggingInput = z.infer<typeof CodeAssistantDebuggingInputSchema>;

const CodeAssistantDebuggingOutputSchema = z.object({
  suggestions: z.string().describe('Debugging suggestions based on the code, output, and errors.'),
});
export type CodeAssistantDebuggingOutput = z.infer<typeof CodeAssistantDebuggingOutputSchema>;

export async function codeAssistantDebugging(input: CodeAssistantDebuggingInput): Promise<CodeAssistantDebuggingOutput> {
  return codeAssistantDebuggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'codeAssistantDebuggingPrompt',
  input: {schema: CodeAssistantDebuggingInputSchema},
  output: {schema: CodeAssistantDebuggingOutputSchema},
  prompt: `You are a Python code debugging assistant. Given the following code, its output, and any errors that occurred, provide debugging suggestions to the user.

Code:
\`\`\`${"python"}
{{{code}}}
\`\`\`

Output:
\`\`\`
{{{output}}}
\`\`\`

Errors:
\`\`\`
{{{errors}}}
\`\`\`

Suggestions:
`,
});

const codeAssistantDebuggingFlow = ai.defineFlow(
  {
    name: 'codeAssistantDebuggingFlow',
    inputSchema: CodeAssistantDebuggingInputSchema,
    outputSchema: CodeAssistantDebuggingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
