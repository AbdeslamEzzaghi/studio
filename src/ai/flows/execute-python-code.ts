
'use server';
/**
 * @fileOverview A Genkit flow to simulate Python code execution using an LLM.
 * It can optionally take a specific input for test case simulation.
 *
 * - executePythonCode - A function that takes Python code and returns simulated output or errors.
 * - ExecutePythonCodeInput - The input type for the executePythonCode function.
 * - ExecutePythonCodeOutput - The return type for the executePythonCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExecutePythonCodeInputSchema = z.object({
  code: z.string().describe('The Python code to simulate.'),
  testInput: z.string().optional().describe('A specific input string to be used if the code calls input(). This is for simulating test cases.'),
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
Your task is to simulate the execution of the provided Python code and return its standard output.

You will receive a 'code' parameter and an optional 'testInput' parameter.
- The 'code' to simulate is:
\`\`\`python
{{{code}}}
\`\`\`
- The 'testInput' (which represents what a user would type if the \`input()\` function is called) is: "{{{testInput}}}"

Instructions for handling the \`input()\` function in the Python code:
1.  If the 'testInput' parameter is provided to you (as shown above, e.g., "{{{testInput}}}"), you MUST use this exact 'testInput' value as the result of any \`input()\` call.
2.  This is true EVEN IF the 'testInput' value is an empty string (""). An empty string is a valid and intentional input that should be used.
3.  If the 'testInput' parameter was genuinely not provided to you by the system calling you (meaning the value for "{{{testInput}}}" above would be empty because the parameter was absent, not just an empty string), AND the Python code calls \`input()\`, then (and only then) you should state clearly: "Interactive input is not supported for general simulation. Please provide a testInput for specific scenarios." After stating this, if the code attempts to use the result of \`input()\`, you can assume it results in an empty string or handle it gracefully to simulate the rest of the code.

Given that the system calling you attempts to always provide a 'testInput' (even if it's an empty string from a test case), you should prioritize using the "{{{testInput}}}" value.

If the code executes successfully, provide only the text that would be printed to the standard output (e.g., by print() statements).
If the code encounters an error during execution, provide a Python-like traceback or a clear description of the error.

Do not add any conversational preamble or explanation beyond the direct simulated output or error message.

Simulated Output:
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
    return {
      simulatedOutput: output?.simulatedOutput || "AI simulation failed or produced no output.",
    };
  }
);
