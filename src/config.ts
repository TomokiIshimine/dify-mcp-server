// Configuration management for the application

// Get Dify configuration from environment variables
export const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
export const DIFY_API_KEYS = process.env.DIFY_API_KEYS ? 
  process.env.DIFY_API_KEYS.split(',').map(key => key.trim()) : 
  [];

// Add legacy API key if present (for backward compatibility)
if (process.env.DIFY_API_KEY && DIFY_API_KEYS.length === 0) {
  DIFY_API_KEYS.push(process.env.DIFY_API_KEY);
}

// Validate required configuration
export function validateConfig() {
  if (!DIFY_BASE_URL) {
    console.error("Environment variable DIFY_BASE_URL is not set");
    return false;
  }
  
  if (DIFY_API_KEYS.length === 0) {
    console.error("No API keys found. Please set either DIFY_API_KEY or DIFY_API_KEYS environment variable.");
    return false;
  }
  
  return true;
}

// Map to store the mapping between workflow names and API keys
export const workflowApiKeyMap = new Map<string, string>(); 