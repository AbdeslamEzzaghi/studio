
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing debugging suggestions and explanations
 * in French, tailored for students, based on code errors and output.
 *
 * - codeAssistantDebugging - A function that takes code, output, and errors as input and returns debugging suggestions/explanations.
 * - CodeAssistantDebuggingInput - The input type for the codeAssistantDebugging function.
 * - CodeAssistantDebuggingOutput - The return type for the codeAssistantDebugging function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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

export async function codeAssistantDebugging(input: CodeAssistantDebuggingInput): Promise<CodeAssistantDebuggingOutput> {
  return codeAssistantDebuggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'codeAssistantDebuggingPrompt',
  input: {schema: CodeAssistantDebuggingInputSchema},
  output: {schema: CodeAssistantDebuggingOutputSchema},
  prompt: `Tu es un assistant pédagogique IA spécialisé en programmation Python pour des lycéens ou étudiants débutants.
Le code d'un étudiant a produit une erreur. Ta tâche est d'expliquer cette erreur à l'étudiant en **français**.

Concentre-toi sur les points suivants :
1.  Expliquer clairement ce que signifie le message d'erreur en termes simples.
2.  Aider l'étudiant à comprendre *pourquoi* cette erreur s'est probablement produite dans son code.
3.  Fournir des conseils utiles ou des questions pour le guider afin qu'il trouve lui-même l'erreur.
4.  **Ne fournis PAS le code corrigé ni la solution directe.** L'objectif est de l'aider à apprendre à déboguer.
5.  Sois encourageant et patient dans ton ton.

Voici le code de l'étudiant :
\`\`\`python
{{{code}}}
\`\`\`

Voici le message d'erreur brut produit lors de la tentative d'exécution du code (ou d'une simulation) :
\`\`\`
{{{errors}}}
\`\`\`

(Le champ 'output' ci-dessous peut être vide ou contenir une sortie d'avant que l'erreur ne se produise. L'information principale est le champ 'errors'.)
Sortie (si disponible) avant l'erreur :
\`\`\`
{{{output}}}
\`\`\`

Merci de fournir ton explication et tes conseils en français, formatés pour une bonne lisibilité (utilise des retours à la ligne, des listes si pertinent) :
Explication et Conseils :
`,
});

const codeAssistantDebuggingFlow = ai.defineFlow(
  {
    name: 'codeAssistantDebuggingFlow',
    inputSchema: CodeAssistantDebuggingInputSchema,
    outputSchema: CodeAssistantDebuggingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

