import {genkit} from 'genkit';
// Import for openAI plugin is no longer needed if we are not using it.
// import {openAI} from 'genkitx-openai';

// Initialize Genkit without the OpenAI plugin and default model
// to prevent errors if the OPENAI_API_KEY is not set.
// The individual flows will need to be updated if they are to use a different provider.
export const ai = genkit({
  // plugins: [openAI()], // OpenAI plugin removed
  // model: 'openai/gpt-4o', // Default OpenAI model removed
});
