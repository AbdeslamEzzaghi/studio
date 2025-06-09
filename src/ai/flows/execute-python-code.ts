
'use server';
/**
 * @fileOverview A flow to simulate Python code execution using the OpenRouter API.
 * It can optionally take a specific input for test case simulation.
 * The testInput can contain multiple lines, each corresponding to a sequential input() call.
 *
 * - executePythonCode - A function that takes Python code and returns simulated output or errors.
 * - ExecutePythonCodeInput - The input type for the executePythonCode function.
 * - ExecutePythonCodeOutput - The return type for the executePythonCode function.
 */

import { z } from 'genkit';
import { getOpenRouterChatCompletion } from '@/ai/openrouter/simple-chat';

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

function constructOpenRouterPrompt(input: ExecutePythonCodeInput): string {
  const codeBlock = `\`\`\`python\n${input.code}\n\`\`\``;
  const testInputBlock = input.testInput !== undefined ? `"${input.testInput.replace(/\n/g, '\\n')}"` : '""';

  return `You are a Python code execution simulator.
Your task is to simulate the execution of the provided Python code and return its output or error.

The Python code to simulate is:
${codeBlock}

The 'testInput' (which represents what a user would type if the \`input()\` function is called) is:
${testInputBlock}

Instructions for handling the \`input()\` function in the Python code:
1.  The 'testInput' parameter provided may contain multiple lines of text, separated by newline characters (\\n).
2.  Each line in the 'testInput' corresponds to a sequential call to the \`input()\` function in the Python code.
3.  You MUST use these lines in order. The first \`input()\` call uses the first line from 'testInput', the second \`input()\` call uses the second line, and so on.
4.  This is true EVEN IF a line in 'testInput' is an empty string (""). An empty string is a valid and intentional input for that specific \`input()\` call and should be used.
5.  If the number of \`input()\` calls in the Python code exceeds the number of lines provided in 'testInput', any subsequent \`input()\` calls should effectively receive/return an empty string.
6.  If the 'testInput' parameter was genuinely not provided by the system (meaning its value in this prompt is empty because the parameter was absent, not just an empty string or a string with only newlines), AND the Python code calls \`input()\`, then (and only then) you should state clearly in your errorOutput: "Interactive input is not supported for general simulation. Please provide a testInput for specific scenarios." After stating this, if the code attempts to use the result of \`input()\`, you can assume it results in an empty string or handle it gracefully to simulate the rest ofthe code.

Output Instructions:
Your entire response MUST be a single JSON object matching the following schema. Do not add any conversational preamble or explanations outside the JSON structure.
The JSON schema is:
{
  "successOutput": "string | null (The simulated standard output or null if error. If the Python code runs successfully but prints nothing, successOutput MUST be an empty string \\"\\". It MUST NOT be the JavaScript null value unless an error occurred. It MUST NOT be the string \\"null\\" unless the Python code itself explicitly prints the literal string \\"null\\".)",
  "errorOutput": "string | null (A Python-like traceback or a clear description of the error if execution fails. Null if execution is successful.)"
}

For example:
- Code: \`print("hello")\`, TestInput: "" -> JSON: \`{"successOutput": "hello", "errorOutput": null}\`
- Code: \`print("The sum is:", 1+2)\`, TestInput: "" -> JSON: \`{"successOutput": "The sum is: 3", "errorOutput": null}\`
- Code: \`print("")\`, TestInput: "" -> JSON: \`{"successOutput": "", "errorOutput": null}\`
- Code: \`x=1\` (no print), TestInput: "" -> JSON: \`{"successOutput": "", "errorOutput": null}\`
- Code: \`print("null")\`, TestInput: "" -> JSON: \`{"successOutput": "null", "errorOutput": null}\`
- Code: \`1/0\`, TestInput: "" -> JSON: \`{"successOutput": null, "errorOutput": "Traceback (most recent call last):\\n  File \\"<stdin>\\", line 1, in <module>\\nZeroDivisionError: division by zero"}\`

Ensure your response is ONLY the JSON object.
`;
}

export async function executePythonCode(
  input: ExecutePythonCodeInput
): Promise<ExecutePythonCodeOutput> {
  const validatedInput = ExecutePythonCodeInputSchema.parse(input);
  const prompt = constructOpenRouterPrompt(validatedInput);

  let rawOutputFromAI: Partial<ExecutePythonCodeOutput> | null = null;
  let openRouterError: string | null = null;
  let fullRawReplyForLogging: string = "";

  try {
    const openRouterResponse = await getOpenRouterChatCompletion({
      userMessage: prompt,
    });
    fullRawReplyForLogging = openRouterResponse.reply;

    try {
      let replyText = openRouterResponse.reply;
      const jsonMarkdownMatch = replyText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMarkdownMatch && jsonMarkdownMatch[1]) {
        replyText = jsonMarkdownMatch[1];
      }
      rawOutputFromAI = JSON.parse(replyText) as ExecutePythonCodeOutput;
    } catch (e: any) {
      console.error("---RAW OPENROUTER REPLY START---");
      console.error(fullRawReplyForLogging);
      console.error("---RAW OPENROUTER REPLY END---");
      console.error("Failed to parse JSON response from OpenRouter:", e.message);
      openRouterError = `L'IA a répondu dans un format JSON invalide. Vérifiez les logs du serveur pour la réponse brute complète. Début de la réponse : ${fullRawReplyForLogging.substring(0, 70)}${fullRawReplyForLogging.length > 70 ? '...' : '' }`;
    }
  } catch (error: any) {
    console.error("Error calling OpenRouter API for code execution:", error);
    openRouterError = `Erreur de communication avec le service IA (OpenRouter): ${error.message}`;
  }

  if (openRouterError) {
    return { successOutput: null, errorOutput: openRouterError };
  }

  if (!rawOutputFromAI) {
     return {
      successOutput: null,
      errorOutput: "L'IA n'a pas fourni de réponse ou la réponse était vide après la tentative de traitement."
    };
  }
  
  const hasSuccess = rawOutputFromAI.hasOwnProperty('successOutput');
  const hasError = rawOutputFromAI.hasOwnProperty('errorOutput');

  if (! ( (hasSuccess && rawOutputFromAI.successOutput !== undefined) || (hasError && rawOutputFromAI.errorOutput !== undefined) ) ) {
    console.error("---UNEXPECTED JSON STRUCTURE RECEIVED---");
    console.error(JSON.stringify(rawOutputFromAI));
    console.error("---END UNEXPECTED JSON STRUCTURE---");
    return {
      successOutput: null,
      errorOutput: `L'IA a retourné une structure JSON inattendue. Vérifiez les logs du serveur. Reçu (tronqué) : ${JSON.stringify(rawOutputFromAI).substring(0,100)}...`,
    }
  }

  const trimmedSuccessOutput = typeof rawOutputFromAI.successOutput === 'string' ? rawOutputFromAI.successOutput.trim() : rawOutputFromAI.successOutput;
  const errorOutputFromAI = rawOutputFromAI.errorOutput;

  if (errorOutputFromAI) {
    return { successOutput: null, errorOutput: errorOutputFromAI };
  }

  if (trimmedSuccessOutput === "null") {
    return {
      successOutput: null,
      errorOutput: "L'IA a retourné la chaîne de caractères \"null\" comme sortie réussie, ce qui est probablement une erreur de simulation. Si votre code est censé afficher \"null\", veuillez ignorer ce message. Sinon, vérifiez le code ou réessayez."
    };
  }
  
  if (trimmedSuccessOutput !== undefined && trimmedSuccessOutput !== null) {
    return { successOutput: String(trimmedSuccessOutput), errorOutput: null };
  }

  return {
    successOutput: null,
    errorOutput: "L'IA n'a pas pu simuler l'exécution ou le format de la réponse est incorrect (e.g., sortie indéfinie ou structure JSON invalide après parsing). Vérifiez les logs du serveur pour la réponse brute de l'IA."
  };
}
