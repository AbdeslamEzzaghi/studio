
'use server';
/**
 * @fileOverview A utility to interact with the OpenRouter API for chat completions.
 *
 * - getOpenRouterChatCompletion - A function that sends a message to an OpenRouter model and gets a reply.
 * - OpenRouterInput - The input type for the getOpenRouterChatCompletion function.
 * - OpenRouterOutput - The return type for the getOpenRouterChatCompletion function.
 */

import { z } from 'zod';

const OpenRouterInputSchema = z.object({
  userMessage: z.string().describe("The message from the user."),
  model: z.string().optional().default("deepseek/deepseek-r1-0528:free").describe("The OpenRouter model to use."),
});
export type OpenRouterInput = z.infer<typeof OpenRouterInputSchema>;

const OpenRouterOutputSchema = z.object({
  reply: z.string().describe("The AI's reply."),
});
export type OpenRouterOutput = z.infer<typeof OpenRouterOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HTTP_REFERER_PLACEHOLDER = "<YOUR_SITE_URL>";
const X_TITLE_PLACEHOLDER = "<YOUR_SITE_NAME>";

export async function getOpenRouterChatCompletion(input: OpenRouterInput): Promise<OpenRouterOutput> {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "<YOUR_OPENROUTER_API_KEY_HERE>") {
    console.error("OpenRouter API key is not configured or is still the placeholder.");
    throw new Error("OpenRouter API key is not configured. Please set it in the .env file.");
  }

  const headers: HeadersInit = {
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json"
  };

  const httpReferer = process.env.OPENROUTER_HTTP_REFERER;
  const xTitle = process.env.OPENROUTER_X_TITLE;

  if (httpReferer && httpReferer !== HTTP_REFERER_PLACEHOLDER) {
    headers["HTTP-Referer"] = httpReferer;
  }
  if (xTitle && xTitle !== X_TITLE_PLACEHOLDER) {
    headers["X-Title"] = xTitle;
  }

  const modelToUse = input.model || "deepseek/deepseek-r1-0528:free";

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        "model": modelToUse,
        "messages": [
          {
            "role": "user",
            "content": input.userMessage
          }
        ]
      })
    });
  } catch (error: any) {
    console.error("Network error calling OpenRouter API:", error);
    throw new Error(`Network error calling OpenRouter API: ${error.message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`OpenRouter API error: ${response.status} ${response.statusText}`, errorBody);
    throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
  }

  const data = await response.json();

  // Check for OpenRouter's own error structure first
  if (data.error) {
    console.error("OpenRouter API returned an error:", data.error);
    const errorMessage = data.error.message || "Unknown error from OpenRouter API.";
    const errorCode = data.error.code ? ` (Code: ${data.error.code})` : "";
    throw new Error(`OpenRouter API Error: ${errorMessage}${errorCode}`);
  }

  const replyContent = data.choices?.[0]?.message?.content;

  if (typeof replyContent !== 'string') {
    console.error("Unexpected response format from OpenRouter (after checking for data.error):", data);
    throw new Error("Failed to extract reply content from OpenRouter response. The response structure was not as expected.");
  }

  return { reply: replyContent };
}

