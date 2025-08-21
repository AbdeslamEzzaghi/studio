'use server';

/**
 * @fileOverview This file defines a function for explaining why a specific test case failed
 * in French, tailored for students, using the test case details and actual vs expected output.
 *
 * - explainTestFailure - A function that takes test details and returns an explanation for the failure
 * - TestFailureExplanationInput - The input type for the explainTestFailure function
 * - TestFailureExplanationOutput - The return type for the explainTestFailure function
 */

import { z } from 'zod';
import { getOllamaChatCompletion } from '@/ai/ollama/chat';

const TestFailureExplanationInputSchema = z.object({
  code: z.string().describe('The Python code that was executed.'),
  testName: z.string().describe('The name of the test case that failed.'),
  inputs: z.array(z.string()).describe('The inputs that were provided to the test.'),
  expectedOutput: z.string().describe('The expected output for this test case.'),
  actualOutput: z.string().describe('The actual output that was produced.'),
});
export type TestFailureExplanationInput = z.infer<typeof TestFailureExplanationInputSchema>;

const TestFailureExplanationOutputSchema = z.object({
  explanation: z.string().describe('A clear explanation in French of why the test failed, suitable for students learning programming.'),
});
export type TestFailureExplanationOutput = z.infer<typeof TestFailureExplanationOutputSchema>;

function constructOllamaPrompt(input: TestFailureExplanationInput): string {
  return `Tu es un assistant pédagogique IA spécialisé en programmation Python pour des lycéens ou étudiants débutants.
Un test a échoué et tu dois expliquer à l'étudiant **pourquoi** ce test particulier a échoué en **français**, de manière **claire et pédagogique**.

Concentre-toi sur les points suivants :
1. **Analyser attentivement le code** : Examiner les valeurs des variables, les conditions, et la logique du programme.
2. **Identifier la cause racine** : Déterminer si le problème vient de valeurs codées en dur, de conditions incorrectes, d'erreurs logiques, ou d'autres facteurs.
3. Expliquer **clairement** la différence entre ce que le programme a produit et ce qui était attendu.
4. Analyser **pourquoi** cette différence s'est produite dans le contexte du code fourni.
5. Donner des conseils **constructifs** pour aider l'étudiant à comprendre l'erreur.
6. **Ne fournis PAS le code corrigé ni la solution directe.** L'objectif est d'aider l'étudiant à comprendre et apprendre.
7. Sois encourageant et utilise un ton bienveillant.
8. **Garde ton explication concise mais complète.** Évite les détails techniques superflus.

**ATTENTION PARTICULIÈRE** : Si le code contient des valeurs codées en dur (comme "age = 18" au lieu de "age = int(input())"), ou si certaines branches de code ne peuvent jamais être atteintes à cause de ces valeurs fixes, explique cela clairement.

Voici les détails du test qui a échoué :

**Nom du test :** ${input.testName}

**Code de l'étudiant :**
\`\`\`python
${input.code}
\`\`\`

**Entrées fournies au test :**
${input.inputs.map((inp, i) => `Ligne ${i+1}: "${inp}"`).join('\n')}

**Sortie attendue :**
\`\`\`
${input.expectedOutput}
\`\`\`

**Sortie obtenue :**
\`\`\`
${input.actualOutput}
\`\`\`

**Instructions d'analyse :**
- Trace mentalement l'exécution du code avec les entrées fournies
- Identifie quelles parties du code sont exécutées et lesquelles ne le sont pas
- Si certaines branches (if/else) ne peuvent jamais être atteintes, explique pourquoi
- Si le problème vient de valeurs fixes dans le code au lieu d'utiliser les entrées du test, mentionne-le
- Vérifie si le code utilise correctement les entrées fournies (input() vs valeurs codées en dur)

**Exemple typique :** Si le code contient "age = 18" et ensuite "if age >= 18:", la branche else ne sera jamais exécutée car age vaut toujours 18. Le problème n'est pas la condition, mais le fait que l'âge soit fixé à 18 au lieu d'être lu depuis l'entrée.

Ton objectif est de retourner une explication claire et pédagogique **en français**.
Ta réponse entière DOIT être un objet JSON unique correspondant au schéma suivant. N'ajoute aucun préambule conversationnel ni aucune explication en dehors de la structure JSON.
Le schéma JSON est :
{
  "explanation": "string (L'explication claire et pédagogique du pourquoi ce test a échoué, en français.)"
}

Assure-toi que ta réponse est UNIQUEMENT l'objet JSON.
`;
}

export async function explainTestFailure(input: TestFailureExplanationInput): Promise<TestFailureExplanationOutput> {
  const validatedInput = TestFailureExplanationInputSchema.parse(input);
  const prompt = constructOllamaPrompt(validatedInput);

  let rawOutputFromAI: Partial<TestFailureExplanationOutput> | null = null;
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
      const sanitize = (s: string) => s.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/,\s*([}\]])/g, '$1');
      const sanitized = sanitize(replyText);

      try {
        rawOutputFromAI = JSON.parse(sanitized) as TestFailureExplanationOutput;
      } catch {
        // Fallbacks
        const explanationMatch = sanitized.match(/"explanation"\s*:\s*"([\s\S]*?)"\s*\}?$/);
        if (explanationMatch && explanationMatch[1]) {
          rawOutputFromAI = { explanation: explanationMatch[1] } as TestFailureExplanationOutput;
        } else {
          rawOutputFromAI = { explanation: ollamaResponse.reply.trim() } as TestFailureExplanationOutput;
        }
      }
    } catch (e: any) {
      console.error("---RAW OLLAMA REPLY (Test Failure Explanation) START---");
      console.error(fullRawReplyForLogging);
      console.error("---RAW OLLAMA REPLY (Test Failure Explanation) END---");
      console.error("Failed initial JSON parse for test failure explanation; used fallback:", e.message);
      // Do not set ollamaError; we constructed a fallback above
    }
  } catch (error: any) {
    console.error("Error calling Ollama API for test failure explanation:", error);
    ollamaError = error.message;
  }

  if (ollamaError) {
    throw new Error(ollamaError);
  }

  if (!rawOutputFromAI || typeof rawOutputFromAI.explanation !== 'string') {
     const errorMsg = "L'IA n'a pas fourni d'explication pour l'échec du test ou la réponse était vide/malformée.";
     console.error(errorMsg, "Raw AI output:", rawOutputFromAI);
     throw new Error(errorMsg);
  }

  // Validate the structure of the AI's output against the Zod schema
  try {
    const validatedOutput = TestFailureExplanationOutputSchema.parse(rawOutputFromAI);
    return validatedOutput; // This will be { explanation: "..." }
  } catch (validationError: any) {
    console.error("---INVALID JSON STRUCTURE RECEIVED (Test Failure Explanation)---");
    console.error("Raw output:", JSON.stringify(rawOutputFromAI));
    console.error("Validation error:", validationError.errors);
    console.error("---END INVALID JSON STRUCTURE (Test Failure Explanation)---");
    throw new Error(`L'IA a retourné une structure JSON inattendue pour l'explication de l'échec du test. Détails: ${validationError.message}`);
  }
}
