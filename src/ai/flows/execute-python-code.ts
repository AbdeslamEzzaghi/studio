
'use server';
/**
 * @fileOverview A Genkit flow to simulate Python code execution using an LLM.
 * It can optionally take a specific input for test case simulation.
 * The testInput can contain multiple lines, each corresponding to a sequential input() call.
 *
 * - executePythonCode - A function that takes Python code and returns simulated output or errors.
 * - ExecutePythonCodeInput - The input type for the executePythonCode function.
 * - ExecutePythonCodeOutput - The return type for the executePythonCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExecutePythonCodeInputSchema = z.object({
  code: z.string().describe('The Python code to simulate.'),
  testInput: z.string().optional().describe('A specific input string to be used if the code calls input(). This may contain multiple lines separated by \\n, each line for a sequential input() call. This is for simulating test cases.'),
});
export type ExecutePythonCodeInput = z.infer<typeof ExecutePythonCodeInputSchema>;

const ExecutePythonCodeOutputSchema = z.object({
  successOutput: z
    .string()
    .nullable()
    .describe(
      'The simulated standard output of the code if execution is successful. Null if an error occurred.'
    ),
  errorOutput: z
    .string()
    .nullable()
    .describe(
      'A Python-like traceback or a clear description of the error if execution fails. Null if execution is successful.'
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
Your task is to simulate the execution of the provided Python code and return its output or error.

You will receive a 'code' parameter and an optional 'testInput' parameter.
- The 'code' to simulate is:
\`\`\`python
{{{code}}}
\`\`\`
- The 'testInput' (which represents what a user would type if the \`input()\` function is called) is:
"{{{testInput}}}"

Instructions for handling the \`input()\` function in the Python code:
1.  The 'testInput' parameter provided to you (e.g., "{{{testInput}}}") may contain multiple lines of text, separated by newline characters (\\n).
2.  Each line in the 'testInput' corresponds to a sequential call to the \`input()\` function in the Python code.
3.  You MUST use these lines in order. The first \`input()\` call uses the first line from "{{{testInput}}}", the second \`input()\` call uses the second line, and so on.
4.  This is true EVEN IF a line in 'testInput' is an empty string (""). An empty string is a valid and intentional input for that specific \`input()\` call and should be used.
5.  If the number of \`input()\` calls in the Python code exceeds the number of lines provided in 'testInput', any subsequent \`input()\` calls should effectively receive/return an empty string.
6.  If the 'testInput' parameter was genuinely not provided to you by the system calling you (meaning the value for "{{{testInput}}}" above would be empty because the parameter was absent, not just an empty string or a string with only newlines), AND the Python code calls \`input()\`, then (and only then) you should state clearly in your errorOutput: "Interactive input is not supported for general simulation. Please provide a testInput for specific scenarios." After stating this, if the code attempts to use the result of \`input()\`, you can assume it results in an empty string or handle it gracefully to simulate the rest of the code.

Given that the system calling you attempts to always provide a 'testInput' (even if it's an empty string, or a string of multiple empty lines from a test case), you should prioritize using the "{{{testInput}}}" value as described in points 1-5.

If the code executes successfully, provide ONLY the text that would be printed to the standard output in the 'successOutput' field, and the 'errorOutput' field should be null.
If the code encounters an error during execution, provide a Python-like traceback or a clear description of the error in the 'errorOutput' field, and the 'successOutput' field should be null.

Ensure your entire response is a single JSON object matching the specified output schema. Do not add any conversational preamble.
`,
});

const executePythonCodeFlow = ai.defineFlow(
  {
    name: 'executePythonCodeFlow',
    inputSchema: ExecutePythonCodeInputSchema,
    outputSchema: ExecutePythonCodeOutputSchema,
  },
  async (input: ExecutePythonCodeInput): Promise<ExecutePythonCodeOutput> => {
    const effectiveInput = {
        ...input,
        testInput: input.testInput === undefined ? "" : input.testInput, 
    };
    const {output} = await prompt(effectiveInput);

    if (output?.errorOutput) {
      return { successOutput: null, errorOutput: output.errorOutput };
    }
    if (output?.successOutput !== undefined && output?.successOutput !== null) { 
      // Allow empty string as valid success output
      return { successOutput: output.successOutput, errorOutput: null };
    }
    // Fallback if AI response is not as expected or both are null/undefined
    return { 
      successOutput: null, 
      errorOutput: "L'IA n'a pas pu simuler l'exécution ou le format de la réponse est incorrect." 
    };
  }
);
