
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

Output Instructions:
- If the code executes successfully:
    - The 'successOutput' field MUST contain the exact text that would be printed to the standard output.
    - The 'errorOutput' field MUST be JavaScript \`null\`.
    - **Crucially**: \`successOutput\` MUST NOT be the JavaScript \`null\` value. It MUST NOT be the string \`"null"\` UNLESS the Python code *itself explicitly prints the literal string "null"*.
    - If the Python code runs successfully but prints nothing (e.g., \`x = 1\` or \`print()\`), then \`successOutput\` MUST be an empty string \`""\`.
- If the code encounters an error during execution:
    - The 'errorOutput' field MUST contain a Python-like traceback or a clear description of the error.
    - The 'successOutput' field MUST be JavaScript \`null\`.

For example:
    - Code: \`print("hello")\` -> \`successOutput: "hello"\`, \`errorOutput: null\`
    - Code: \`print("The sum is:", 1+2)\` -> \`successOutput: "The sum is: 3"\`, \`errorOutput: null\`
    - Code: \`print("")\` -> \`successOutput: ""\`, \`errorOutput: null\`
    - Code: \`x=1\` (no print) -> \`successOutput: ""\`, \`errorOutput: null\`
    - Code: \`print("null")\` -> \`successOutput: "null"\`, \`errorOutput: null\`
    - Code: \`1/0\` -> \`successOutput: null\`, \`errorOutput: "Traceback (most recent call last):\\n  File \\"<stdin>\\", line 1, in <module>\\nZeroDivisionError: division by zero"\`

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

    // Safeguard: If the AI returns the string "null" as success output,
    // it's often a misinterpretation unless the code explicitly prints "null".
    // We'll treat it as an AI simulation issue for now.
    if (output?.successOutput === "null") {
      // This check is a heuristic. If a user's code is `print("null")`, this will incorrectly flag it.
      // However, it's more common for the AI to misuse "null" than for users to specifically print that string.
      return {
        successOutput: null,
        errorOutput: "L'IA a retourné la chaîne de caractères \"null\" comme sortie réussie, ce qui est probablement une erreur de simulation. Si votre code est censé afficher \"null\", veuillez ignorer ce message. Sinon, vérifiez le code ou réessayez."
      };
    }

    if (output?.successOutput !== undefined && output?.successOutput !== null) {
      // This covers empty string "" as valid success output
      return { successOutput: output.successOutput, errorOutput: null };
    }
    // Fallback if AI response is not as expected or both are null/undefined
    return {
      successOutput: null,
      errorOutput: "L'IA n'a pas pu simuler l'exécution ou le format de la réponse est incorrect."
    };
  }
);

    