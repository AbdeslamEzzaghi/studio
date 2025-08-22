
'use server';
/**
 * @fileOverview A code explanation AI assistant that adds comments to explain sections of code, using OpenRouter.
 *
 * - codeAssistantCodeExplanation - A function that handles the code explanation process.
 * - CodeAssistantCodeExplanationInput - The input type for the codeAssistantCodeExplanation function.
 * - CodeAssistantCodeExplanationOutput - The return type for the codeAssistantCodeExplanation function.
 */

import { z } from 'zod';
import { getOllamaChatCompletion } from '@/ai/ollama/chat';

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

function constructOllamaPrompt(input: CodeAssistantCodeExplanationInput): string {
  return `You are an AI code assistant that automatically adds comments to explain sections of code.
Your task is to add comments to the provided Python code.

Please add comments to the following Python code to explain what each section does:
\`\`\`python
${input.code}
\`\`\`

Your entire response MUST be a single JSON object matching the following schema. Do not add any conversational preamble or explanations outside the JSON structure.
The JSON schema is:
{
  "explainedCode": "string (The Python code with comments added. Escape newlines as \\n and quotes as \\\" within the string.)"
}

Ensure your response is ONLY the JSON object.
`;
}

export async function codeAssistantCodeExplanation(
  input: CodeAssistantCodeExplanationInput
): Promise<CodeAssistantCodeExplanationOutput> {
  const validatedInput = CodeAssistantCodeExplanationInputSchema.parse(input);
  const prompt = constructOllamaPrompt(validatedInput);

  let rawOutputFromAI: Partial<CodeAssistantCodeExplanationOutput> | null = null;
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
      
      console.log('🔍 Attempting to parse JSON:', replyText.substring(0, 200) + '...');
      rawOutputFromAI = JSON.parse(replyText) as CodeAssistantCodeExplanationOutput;
    } catch (e: any) {
      console.error("---RAW OLLAMA REPLY (Code Explanation) START---");
      console.error(fullRawReplyForLogging);
      console.error("---RAW OLLAMA REPLY (Code Explanation) END---");
      console.error("Failed to parse JSON response from Ollama for code explanation:", e.message);
      ollamaError = `L'IA a répondu dans un format JSON invalide pour l'explication de code. Début de la réponse : ${fullRawReplyForLogging.substring(0, 100)}${fullRawReplyForLogging.length > 100 ? '...' : '' }`;
    }
  } catch (error: any) {
    console.error("Error calling Ollama API for code explanation:", error);
    ollamaError = error.message;
  }

  if (ollamaError) {
    throw new Error(ollamaError);
  }
  
  if (!rawOutputFromAI || typeof rawOutputFromAI.explainedCode !== 'string') {
    const errorMsg = "L'IA n'a pas fourni de code expliqué ou la réponse était vide/malformée.";
    console.error(errorMsg, "Raw AI output:", rawOutputFromAI);
    throw new Error(errorMsg);
  }

  try {
    const validatedOutput = CodeAssistantCodeExplanationOutputSchema.parse(rawOutputFromAI);
    return validatedOutput;
  } catch (validationError: any) {
    console.error("---INVALID JSON STRUCTURE RECEIVED (Code Explanation)---");
    console.error("Raw output:", JSON.stringify(rawOutputFromAI));
    console.error("Validation error:", validationError.errors);
    console.error("---END INVALID JSON STRUCTURE (Code Explanation)---");
    throw new Error(`L'IA a retourné une structure JSON inattendue pour le code expliqué. Détails: ${validationError.message}`);
  }
}
