import { db } from "@/lib/db";

/**
 * Validation result for provider configuration
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Check if at least one provider is configured with API key
 */
export async function validateProviderConfig(): Promise<ValidationResult> {
  const providers = await db.providers.toArray();

  if (providers.length === 0) {
    return {
      isValid: false,
      message: "请先在「系统设置」中配置 AI 供应商",
    };
  }

  const defaultProvider = providers.find((p) => p.defaultModel);
  if (!defaultProvider) {
    return {
      isValid: false,
      message: "请在「系统设置」中设置默认供应商和模型",
    };
  }

  // Check if API key is required but missing
  // Local endpoints (localhost, 127.0.0.1) typically don't need API keys
  const isLocalEndpoint =
    defaultProvider.endpoint.includes("localhost") ||
    defaultProvider.endpoint.includes("127.0.0.1") ||
    defaultProvider.endpoint.includes("0.0.0.0");

  if (!isLocalEndpoint && !defaultProvider.apiKey) {
    return {
      isValid: false,
      message: "请在「系统设置」中配置 API Key",
    };
  }

  return { isValid: true };
}

/**
 * Check if at least one project is configured
 */
export async function validateProjectConfig(): Promise<ValidationResult> {
  const projects = await db.projects.toArray();

  if (projects.length === 0) {
    return {
      isValid: false,
      message: "请先在「项目管理」中添加至少一个项目",
    };
  }

  return { isValid: true };
}

/**
 * Validate all requirements for report generation
 */
export async function validateReportGeneration(): Promise<ValidationResult> {
  // Check provider first
  const providerCheck = await validateProviderConfig();
  if (!providerCheck.isValid) {
    return providerCheck;
  }

  // Then check projects
  const projectCheck = await validateProjectConfig();
  if (!projectCheck.isValid) {
    return projectCheck;
  }

  return { isValid: true };
}
