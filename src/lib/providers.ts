import { db, type Provider } from "@/lib/db";

export type ProviderInput = {
  name: string;
  endpoint: string;
  apiKey?: string;
  models: string[];
  defaultModel?: string;
};

/** Split a comma / newline separated model string into a clean list. */
export function parseModels(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]+/)
        .map((m) => m.trim())
        .filter(Boolean),
    ),
  );
}

function normalize(input: ProviderInput): Omit<Provider, "id" | "createdAt" | "updatedAt"> {
  const models = input.models.map((m) => m.trim()).filter(Boolean);
  // Keep the chosen default only if it still exists in the model list.
  const defaultModel =
    input.defaultModel && models.includes(input.defaultModel)
      ? input.defaultModel
      : models[0];
  return {
    name: input.name.trim(),
    endpoint: input.endpoint.trim(),
    apiKey: input.apiKey?.trim() || undefined,
    models,
    defaultModel,
  };
}

export async function addProvider(input: ProviderInput): Promise<number> {
  const now = Date.now();
  return db.providers.add({
    ...normalize(input),
    createdAt: now,
    updatedAt: now,
  } as Provider);
}

export async function updateProvider(
  id: number,
  input: ProviderInput,
): Promise<void> {
  await db.providers.update(id, {
    ...normalize(input),
    updatedAt: Date.now(),
  });
}

export async function removeProvider(id: number): Promise<void> {
  await db.providers.delete(id);
}
