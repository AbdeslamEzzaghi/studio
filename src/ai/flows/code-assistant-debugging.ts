
'use server';

/**
 * @fileOverview This file defines a function for providing debugging suggestions and explanations
 * in French, tailored for students, based on code errors and output, using OpenRouter.
 *
 * - codeAssistantDebugging - A function that takes code, output, and errors as input and returns debugging suggestions/explanations.
 * - CodeAssistantDebuggingInput - The input type for the codeAssistantDebugging function.
 * - CodeAssistantDebuggingOutput - The return type for the codeAssistantDebugging function.
 */

import { z } from 'zod';
import { getOllamaChatCompletion } from '@/ai/ollama/chat';

const CodeAssistantDebuggingInputSchema = z.object({
  code: z.string().describe('The Python code to debug.'),
  output: z.string().describe('The output of the code execution (might be empty if error occurred early).'),
  errors: z.string().describe('Any errors that occurred during code execution (this is the primary information).'),
});
export type CodeAssistantDebuggingInput = z.infer<typeof CodeAssistantDebuggingInputSchema>;

const CodeAssistantDebuggingOutputSchema = z.object({
  suggestions: z.string().describe('Debugging suggestions and explanations in French, suitable for students. Focuses on explaining the error and guiding, not providing the direct solution.'),
});
export type CodeAssistantDebuggingOutput = z.infer<typeof CodeAssistantDebuggingOutputSchema>;

function constructOllamaPrompt(input: CodeAssistantDebuggingInput): string {
  return `Tu es un assistant pédagogique IA spécialisé en programmation Python pour des lycéens ou étudiants débutants.
Le code d'un étudiant a produit une erreur. Ta tâche est d'expliquer cette erreur à l'étudiant en **français**, de manière **concise et claire**.

Concentre-toi sur les points suivants :
1.  Expliquer **brièvement** et clairement ce que signifie le message d'erreur en termes simples.
2.  Aider l'étudiant à comprendre *pourquoi* cette erreur s'est probablement produite dans son code.
3.  Fournir **un ou deux** conseils utiles ou questions pour le guider afin qu'il trouve lui-même l'erreur.
4.  **Ne fournis PAS le code corrigé ni la solution directe.** L'objectif est de l'aider à apprendre à déboguer.
5.  Sois encourageant et patient dans ton ton.
6.  **Garde ton explication aussi courte que possible tout en restant utile.** Évite les détails superflus.

Voici le code de l'étudiant :
\`\`\`python
${input.code}
\`\`\`

Voici le message d'erreur brut produit lors de la tentative d'exécution du code (ou d'une simulation) :
\`\`\`
${input.errors}
\`\`\`

(Le champ 'output' ci-dessous peut être vide ou contenir une sortie d'avant que l'erreur ne se produise. L'information principale est le champ 'errors'.)
Sortie (si disponible) avant l'erreur :
\`\`\`
${input.output}
\`\`\`

Ton objectif est de retourner une explication et des conseils **de façon concise** en français.
Ta réponse entière DOIT être un objet JSON unique correspondant au schéma suivant. N'ajoute aucun préambule conversationnel ni aucune explication en dehors de la structure JSON.
Le schéma JSON est :
{
  "suggestions": "string (L'explication et les conseils de débogage en français.)"
}

Assure-toi que ta réponse est UNIQUEMENT l'objet JSON.
`;
}

export async function codeAssistantDebugging(input: CodeAssistantDebuggingInput): Promise<CodeAssistantDebuggingOutput> {
  const validatedInput = CodeAssistantDebuggingInputSchema.parse(input);
  const prompt = constructOllamaPrompt(validatedInput);

  let rawOutputFromAI: Partial<CodeAssistantDebuggingOutput> | null = null;
  let ollamaError: string | null = null;
  let fullRawReplyForLogging: string = "";

  try {
    const ollamaResponse = await getOllamaChatCompletion({ userMessage: prompt });
    fullRawReplyForLogging = ollamaResponse.reply;

    try {
      let replyText = ollamaResponse.reply.trim();
      // Extract from code fences
      const jsonFence = replyText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonFence && jsonFence[1]) replyText = jsonFence[1].trim();

      // If not starting with {, try to find object
      if (!replyText.startsWith('{')) {
        const obj = replyText.match(/\{[\s\S]*\}/);
        if (obj) replyText = obj[0];
      }

      // Sanitize quotes and trailing commas
      const sanitize = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1');
      const sanitized = sanitize(replyText);

      try {
        rawOutputFromAI = JSON.parse(sanitized) as CodeAssistantDebuggingOutput;
      } catch {
        // Fallbacks
        const sugMatch = sanitized.match(/"suggestions"\s*:\s*"([\s\S]*?)"\s*\}?$/);
        if (sugMatch && sugMatch[1]) {
          rawOutputFromAI = { suggestions: sugMatch[1] } as CodeAssistantDebuggingOutput;
        } else {
          rawOutputFromAI = { suggestions: ollamaResponse.reply.trim() } as CodeAssistantDebuggingOutput;
        }
      }
    } catch (e: any) {
      console.error("---RAW OLLAMA REPLY (Debugging) START---");
      console.error(fullRawReplyForLogging);
      console.error("---RAW OLLAMA REPLY (Debugging) END---");
      console.error("Failed initial JSON parse for debugging; used fallback:", e.message);
      // Do not set ollamaError; we constructed a fallback above
    }
  } catch (error: any) {
    console.error("Error calling Ollama API for debugging assistance:", error);
    ollamaError = error.message;
  }

  if (ollamaError) {
    throw new Error(ollamaError);
  }

  if (!rawOutputFromAI || typeof rawOutputFromAI.suggestions !== 'string') {
     const errorMsg = "L'IA n'a pas fourni de suggestions de débogage ou la réponse était vide/malformée.";
     console.error(errorMsg, "Raw AI output:", rawOutputFromAI);
     throw new Error(errorMsg);
  }

  // Validate the structure of the AI's output against the Zod schema
  try {
    const validatedOutput = CodeAssistantDebuggingOutputSchema.parse(rawOutputFromAI);
    return validatedOutput; // This will be { suggestions: "..." }
  } catch (validationError: any) {
    console.error("---INVALID JSON STRUCTURE RECEIVED (Debugging)---");
    console.error("Raw output:", JSON.stringify(rawOutputFromAI));
    console.error("Validation error:", validationError.errors);
    console.error("---END INVALID JSON STRUCTURE (Debugging)---");
    throw new Error(`L'IA a retourné une structure JSON inattendue pour les suggestions de débogage. Détails: ${validationError.message}`);
  }
}
