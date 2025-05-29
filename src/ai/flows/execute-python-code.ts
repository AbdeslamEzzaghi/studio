
'use server';
/**
 * @fileOverview A Genkit flow to simulate Python code execution using an LLM.
 *
 * - executePythonCode - A function that takes Python code and returns simulated output or errors.
 * - ExecutePythonCodeInput - The input type for the executePythonCode function.
 * - ExecutePythonCodeOutput - The return type for the executePythonCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExecutePythonCodeInputSchema = z.object({
  code: z.string().describe('The Python code to simulate.'),
});
export type ExecutePythonCodeInput = z.infer<typeof ExecutePythonCodeInputSchema>;

const ExecutePythonCodeOutputSchema = z.object({
  simulatedOutput: z
    .string()
    .describe(
      'The simulated standard output of the code, or an error message if execution fails or input() is problematic.'
    ),
});
export type ExecutePythonCodeOutput = z.infer<typeof ExecutePythonCodeOutputSchema>;

export async function executePythonCode(
  input: ExecutePythonCodeInput
): Promise<ExecutePythonCodeOutput> {
  return executePythonCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'executePythonCodePrompt',
  input: {schema: ExecutePythonCodeInputSchema},
  output: {schema: ExecutePythonCodeOutputSchema},
  prompt: `You are a Python code execution simulator.
Your task is to simulate the execution of the provided Python code and return its output.

If the code executes successfully, provide only the text that would be printed to the standard output (e.g., by print() statements).
If the code encounters an error during execution, provide a Python-like traceback or a clear description of the error.
If the code uses the input() function, state clearly that 'Interactive input is not supported in this simulation.' and then continue to simulate the rest of the code as best as possible, perhaps by assuming a default or placeholder input if necessary for the simulation to proceed, or by explaining what would happen at the input prompt.

Do not add any conversational preamble or explanation beyond the direct simulated output or error message.

Python Code:
\`\`\`python
{{{code}}}
\`\`\`
`,
});

const executePythonCodeFlow = ai.defineFlow(
  {
    name: 'executePythonCodeFlow',
    inputSchema: ExecutePythonCodeInputSchema,
    outputSchema: ExecutePythonCodeOutputSchema,
  },
  async (input: ExecutePythonCodeInput) => {
    const {output} = await prompt(input);
    // Ensure we always return an object matching the schema, even if LLM output is unexpected
    return {
      simulatedOutput: output?.simulatedOutput || "AI simulation failed or produced no output.",
    };
  }
);
