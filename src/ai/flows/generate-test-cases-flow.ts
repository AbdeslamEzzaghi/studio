
'use server';
/**
 * @fileOverview A Genkit flow to generate test cases for Python code using an LLM.
 *
 * - generateTestCasesForCode - A function that takes Python code and returns suggested test cases.
 * - GenerateTestCasesInput - The input type for the generateTestCasesForCode function.
 * - GenerateTestCasesOutput - The return type for the generateTestCasesForCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTestCasesInputSchema = z.object({
  code: z.string().describe('The Python code for which to generate test cases.'),
});
export type GenerateTestCasesInput = z.infer<typeof GenerateTestCasesInputSchema>;

// Define the structure of a single generated test case for the AI model
const AIGeneratedTestCaseSchema = z.object({
  name: z
    .string()
    .describe(
      'A short, descriptive name for the test case (e.g., "Valid sum", "Edge case zero").'
    ),
  inputs: z
    .array(z.string())
    .describe(
      'An array of strings, where each string is a line of input for sequential input() calls. Can be empty if no input() is expected or if an empty input line is intended.'
    ),
  expectedOutput: z
    .string()
    .describe(
      'The exact expected string output that the Python code would print to standard output given the specified inputs.'
    ),
});

const GenerateTestCasesOutputSchema = z.object({
  generatedTestCases: z
    .array(AIGeneratedTestCaseSchema)
    .describe(
      'An array of 5 generated test cases, each with a name, an array of inputs, and an expected output.'
    ),
});
export type GenerateTestCasesOutput = z.infer<typeof GenerateTestCasesOutputSchema>;

export async function generateTestCasesForCode(
  input: GenerateTestCasesInput
): Promise<GenerateTestCasesOutput> {
  return generateTestCasesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestCasesPrompt',
  input: {schema: GenerateTestCasesInputSchema},
  output: {schema: GenerateTestCasesOutputSchema},
  prompt: `You are an expert Python test case generator. Your task is to analyze the provided Python code and generate exactly 5 distinct test cases.

For each test case, you must provide:
1.  'name' (string): A short, descriptive name for the test case (e.g., "Somme valide", "Cas limite zéro", "Entrée invalide type chaîne").
2.  'inputs' (array of strings): An array representing sequential inputs if the Python code uses the \`input()\` function. Each string in the array corresponds to one line of input a user would type.
    - If the code doesn't use \`input()\`, or a specific test case doesn't require any input, this array should be empty (\`[]\`).
    - If the code calls \`input()\` multiple times, provide multiple strings in the array in the order they would be entered. For example, for \`a = input()\\nb = input()\`, inputs might be \`["10", "20"]\`.
    - An empty string (\`""\`) is a valid input line if the user is expected to press Enter without typing anything.
3.  'expectedOutput' (string): The exact string that the Python code is expected to print to the standard output (e.g., via \`print()\`) given the specified inputs for that test case.

Analyze the following Python code:
\`\`\`python
{{{code}}}
\`\`\`

Please generate 5 diverse test cases. Consider typical usage, edge cases (e.g., empty inputs if applicable, zero values, large numbers), and how the code might handle different types of inputs if discernible from the code structure.

Ensure your entire response is a single JSON object matching the specified output schema, containing a key "generatedTestCases" which is an array of 5 test case objects.
`,
});

const generateTestCasesFlow = ai.defineFlow(
  {
    name: 'generateTestCasesFlow',
    inputSchema: GenerateTestCasesInputSchema,
    outputSchema: GenerateTestCasesOutputSchema,
  },
  async (input: GenerateTestCasesInput) => {
    const {output} = await prompt(input);
    if (!output || !output.generatedTestCases) {
      throw new Error('AI failed to generate test cases or the format was incorrect.');
    }
    // Ensure we always return an array, even if AI misbehaves slightly.
    return { generatedTestCases: output.generatedTestCases || [] };
  }
);
