'use server';

/**
 * @fileOverview Utility to interact with Ollama using direct HTTP calls
 */

import { OLLAMA_CONFIG } from './config';

export interface OllamaInput {
  userMessage: string;
  systemPrompt?: string;
}

export interface OllamaOutput {
  reply: string;
}

export async function getOllamaChatCompletion(input: OllamaInput): Promise<OllamaOutput> {
  console.log('🤖 Starting AI call with input:', { userMessage: input.userMessage.substring(0, 100) + '...', systemPrompt: input.systemPrompt?.substring(0, 50) + '...' });
  
  try {
    console.log('🔄 Calling Ollama API directly...');
    
    // Prepare the messages for Ollama format
    let prompt = input.userMessage;
    if (input.systemPrompt) {
      prompt = `${input.systemPrompt}\n\nUser: ${input.userMessage}`;
    }

    console.log('📍 Making request to:', `${OLLAMA_CONFIG.baseURL}/api/generate`);
    console.log('📦 With model:', OLLAMA_CONFIG.model);

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

    const response = await fetch(`${OLLAMA_CONFIG.baseURL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1024, // Limit response length
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ AI call completed, response length:', data.response?.length || 0);
    console.log('📄 Response preview:', data.response?.substring(0, 200) + '...');
    
    return { reply: data.response || 'No response from AI' };
  } catch (error: any) {
    console.error('❌ Error calling Ollama API:', error);
    
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: L'IA a pris trop de temps à répondre (plus de 2 minutes). Le modèle deepseek-r1:8b est peut-être trop lent. Essayez un modèle plus petit comme llama3:8b.`);
    }
    
    throw new Error(`Erreur de communication avec Ollama: ${error.message}. Assurez-vous qu'Ollama est démarré et que le modèle ${OLLAMA_CONFIG.model} est disponible.`);
  }
}
