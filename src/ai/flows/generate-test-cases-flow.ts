
'use server';
/**
 * @fileOverview A flow to generate test cases for Python code using the OpenRouter API.
 *
 * - generateTestCasesForCode - A function that takes Python code and returns suggested test cases.
 * - GenerateTestCasesInput - The input type for the generateTestCasesForCode function.
 * - GenerateTestCasesOutput - The return type for the generateTestCasesForCode function.
 */

import { z } from 'zod';
import { getOllamaChatCompletion } from '@/ai/ollama/chat';

const GenerateTestCasesInputSchema = z.object({
  code: z.string().describe('The Python code for which to generate test cases.'),
});
export type GenerateTestCasesInput = z.infer<typeof GenerateTestCasesInputSchema>;

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

function constructOllamaPrompt(input: GenerateTestCasesInput): string {
  const codeBlock = `\`\`\`python\n${input.code}\n\`\`\``;
  return `You are an expert Python test case generator. Your task is to analyze the provided Python code and generate exactly 5 distinct test cases.

For each test case, you must provide:
1.  'name' (string): A short, descriptive name for the test case (e.g., "Somme valide", "Cas limite zéro", "Entrée invalide type chaîne").
2.  'inputs' (array of strings): An array representing sequential inputs if the Python code uses the \`input()\` function. Each string in the array corresponds to one line of input a user would type.
    - If the code doesn't use \`input()\`, or a specific test case doesn't require any input, this array should be empty (\`[]\`).
    - If the code calls \`input()\` multiple times, provide multiple strings in the array in the order they would be entered. For example, for \`a = input()\\nb = input()\`, inputs might be \`["10", "20"]\`.
    - An empty string (\`""\`) is a valid input line if the user is expected to press Enter without typing anything.
3.  'expectedOutput' (string):
    - If the program runs successfully, provide the exact string printed to standard output (e.g., via \`print()\`).
    - If the program is expected to raise an exception (e.g., \`ValueError\` on invalid input), set this field to the UPPERCASE string exactly: \"ERROR\" (do not include the traceback or message).

Analyze the following Python code:
${codeBlock}

Your entire response MUST be a single JSON object matching the following schema. Do not add any conversational preamble or explanations outside the JSON structure.
The JSON schema is:
{
  "generatedTestCases": [
    {
      "name": "string",
      "inputs": ["string", "..."],
      "expectedOutput": "string"
    },
    // ... (exactly 5 test cases)
  ]
}

Important formatting rules:
- Escape newlines in strings as needed.
- Do not include backticks around the JSON.

Ensure your response is ONLY the JSON object.
`;
}

export async function generateTestCasesForCode(
  input: GenerateTestCasesInput
): Promise<GenerateTestCasesOutput> {
  const validatedInput = GenerateTestCasesInputSchema.parse(input);
  const prompt = constructOllamaPrompt(validatedInput);
  let rawOutputFromAI: Partial<GenerateTestCasesOutput> | null = null;
  let ollamaError: string | null = null;
  let fullRawReplyForLogging: string = "";

  try {
    const ollamaResponse = await getOllamaChatCompletion({ userMessage: prompt });
    fullRawReplyForLogging = ollamaResponse.reply;

    try {
      let replyText = ollamaResponse.reply.trim();
      
      // Try to extract JSON from markdown code blocks first
      const jsonMarkdownMatch = replyText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMarkdownMatch && jsonMarkdownMatch[1]) {
        replyText = jsonMarkdownMatch[1].trim();
      }
      
      // If the response doesn't start with {, try to find the JSON object
      if (!replyText.startsWith('{')) {
        const jsonMatch = replyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          replyText = jsonMatch[0];
        }
      }
      
      // Sanitize common JSON mistakes (smart quotes, trailing commas)
      const sanitizeJson = (s: string) => {
        let out = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        // remove trailing commas before ] or }
        out = out.replace(/,\s*([}\]])/g, '$1');
        return out;
      };

      const sanitized = sanitizeJson(replyText);
      console.log('🔍 Attempting to parse JSON (sanitized):', sanitized.substring(0, 200) + '...');

      function tryParse(jsonText: string): any {
        return JSON.parse(jsonText);
      }

      let parsed: any;
      try {
        parsed = tryParse(sanitized);
      } catch (e1: any) {
        // Fallback 1: if it ends with ']' but is missing the closing '}'
        const t = sanitized.trim();
        if (t.startsWith('{') && t.endsWith(']')) {
          try {
            parsed = tryParse(t + '}');
          } catch (_) {
            // ignore, try next fallback
          }
        }

        // Fallback 2: extract the array part and wrap into {"generatedTestCases": ...}
        if (!parsed) {
          const arrayMatch = sanitized.match(/\"generatedTestCases\"\s*:\s*(\[[\s\S]*\])/);
          if (arrayMatch && arrayMatch[1]) {
            const reconstructed = `{"generatedTestCases": ${sanitizeJson(arrayMatch[1])}}`;
            try {
              parsed = tryParse(reconstructed);
            } catch (_) {
              // final fallback below
            }
          }
        }

        // Fallback 3: last-chance remove any trailing commas inside arrays/objects again and close braces if needed
        if (!parsed) {
          let repaired = sanitized.replace(/,\s*([}\]])/g, '$1');
          if (/^\{[\s\S]*\]$/.test(repaired.trim())) {
            repaired = repaired + '}';
          }
          parsed = tryParse(repaired);
        }
      }

      rawOutputFromAI = parsed as GenerateTestCasesOutput;
      console.log('✅ JSON parsed successfully');
    } catch (e: any) {
      console.error("---RAW OLLAMA REPLY (Test Case Gen) START---");
      console.error(fullRawReplyForLogging);
      console.error("---RAW OLLAMA REPLY (Test Case Gen) END---");
      console.error("Failed to parse JSON response from Ollama for test case generation:", e.message);
      
      // Try to provide more helpful error message
      const preview = fullRawReplyForLogging.substring(0, 300);
      ollamaError = `L'IA a répondu dans un format JSON invalide pour la génération de tests. Erreur: ${e.message}. Début de la réponse : ${preview}${fullRawReplyForLogging.length > 300 ? '...' : '' }`;
    }
  } catch (error: any) {
    console.error("Error calling Ollama API for test case generation:", error);
    ollamaError = error.message;
  }

  if (ollamaError) {
    throw new Error(ollamaError);
  }

  if (!rawOutputFromAI || !rawOutputFromAI.generatedTestCases) {
    const errorMsg = "L'IA n'a pas fourni de cas de test ou la réponse était vide/malformée après traitement.";
    console.error(errorMsg, "Raw AI output:", rawOutputFromAI);
    throw new Error(errorMsg);
  }
  
  // Validate the structure of the AI's output against the Zod schema
  try {
    const validatedOutput = GenerateTestCasesOutputSchema.parse(rawOutputFromAI);
    return { generatedTestCases: validatedOutput.generatedTestCases || [] };
  } catch (validationError: any) {
    console.error("---INVALID JSON STRUCTURE RECEIVED (Test Case Gen)---");
    console.error("Raw output:", JSON.stringify(rawOutputFromAI));
    console.error("Validation error:", validationError.errors);
    console.error("---END INVALID JSON STRUCTURE (Test Case Gen)---");
    throw new Error(`L'IA a retourné une structure JSON inattendue pour les cas de test. Détails: ${validationError.message}`);
  }
}
