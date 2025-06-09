
import { config } from 'dotenv';
config();

// The Genkit flows have been refactored to use OpenRouter directly
// and are no longer registered with Genkit via ai.defineFlow.
// Therefore, importing them here for Genkit dev tools is no longer necessary.

// import '@/ai/flows/code-assistant-code-explanation.ts';
// import '@/ai/flows/code-assistant-debugging.ts';
// import '@/ai/flows/execute-python-code.ts'; // This one was already refactored
// import '@/ai/flows/generate-test-cases-flow.ts';
