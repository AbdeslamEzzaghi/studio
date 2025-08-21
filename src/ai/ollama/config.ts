/**
 * @fileOverview Configuration for Ollama with DeepSeek R1 model
 */

// Ollama configuration with environment variables
const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const modelName = process.env.OLLAMA_MODEL || 'llama3:latest';

// Export configuration for reference
export const OLLAMA_CONFIG = {
  baseURL,
  model: modelName,
};
