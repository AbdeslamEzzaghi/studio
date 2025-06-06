import {genkit} from 'genkit';
import {openAI} from 'genkitx-openai'; // Corrected import

export const ai = genkit({
  plugins: [openAI()], // Use the OpenAI plugin
  model: 'openai/gpt-4o', // Set a default OpenAI model, e.g., gpt-4o or gpt-3.5-turbo
});
