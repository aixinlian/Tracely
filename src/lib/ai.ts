import { invoke } from "@tauri-apps/api/core";

export interface ChatCompletionParams {
  endpoint: string;
  apiKey?: string;
  model: string;
  prompt: string;
}

/** Fetch model IDs from an OpenAI-compatible /models endpoint. */
export async function listModels(
  endpoint: string,
  apiKey?: string,
): Promise<string[]> {
  return invoke<string[]>("list_models", { endpoint, apiKey });
}

/** Call an OpenAI-compatible chat completion endpoint. */
export async function chatCompletion(
  params: ChatCompletionParams,
): Promise<string> {
  return invoke<string>("chat_completion", {
    endpoint: params.endpoint,
    apiKey: params.apiKey,
    model: params.model,
    prompt: params.prompt,
  });
}
