import fetch from "node-fetch";
import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";

// Get Dify configuration from environment variables
const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_API_KEYS = process.env.DIFY_API_KEYS ? JSON.parse(process.env.DIFY_API_KEYS) : [];

// For backward compatibility
const DIFY_API_KEY = process.env.DIFY_API_KEY;
if (DIFY_API_KEY && DIFY_API_KEYS.length === 0) {
  DIFY_API_KEYS.push(DIFY_API_KEY);
}

// Function to retrieve Dify workflow information for a specific API key
export async function fetchWorkflowInfoWithKey(apiKey: string): Promise<{
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}> {
  if (!DIFY_BASE_URL) {
    console.error("Environment variable DIFY_BASE_URL is not set");
    process.exit(1);
  }

  try {
    const infoResponse = await fetch(`${DIFY_BASE_URL}/info`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!infoResponse.ok) {
      console.error(`/info API error code: ${infoResponse.status}`);
      console.error(`/info API error message: ${infoResponse.statusText}`);
      const errorText = await infoResponse.text().catch(() => "Could not retrieve response text");
      console.error(`/info API error response: ${errorText}`);
      throw new Error(`/info API error: ${infoResponse.status} ${infoResponse.statusText}`);
    }

    const infoDataText = await infoResponse.text();
    
    let infoData: DifyInfoResponse;
    try {
      infoData = JSON.parse(infoDataText) as DifyInfoResponse;
    } catch (parseError) {
      console.error("Dify Workflow info JSON parse error:", parseError);
      throw new Error(`Failed to parse /info API response: ${parseError}`);
    }

    const paramsResponse = await fetch(`${DIFY_BASE_URL}/parameters`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!paramsResponse.ok) {
      console.error(`/parameters API error code: ${paramsResponse.status}`);
      console.error(`/parameters API error message: ${paramsResponse.statusText}`);
      const errorText = await paramsResponse.text().catch(() => "Could not retrieve response text");
      console.error(`/parameters API error response: ${errorText}`);
      throw new Error(`/parameters API error: ${paramsResponse.status} ${paramsResponse.statusText}`);
    }

    const paramsDataText = await paramsResponse.text();
    
    let paramsData: DifyParametersResponse;
    try {
      paramsData = JSON.parse(paramsDataText) as DifyParametersResponse;
    } catch (parseError) {
      console.error("Dify Workflow parameters JSON parse error:", parseError);
      throw new Error(`Failed to parse /parameters API response: ${parseError}`);
    }

    return { infoData, paramsData };
  } catch (error) {
    console.error("Dify Workflow API call error:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

// Function to retrieve all Dify workflow information for all API keys
export async function fetchWorkflowInfo(): Promise<Array<{
  apiKey: string,
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}>> {
  if (DIFY_API_KEYS.length === 0) {
    console.error("No API keys found. Please set either DIFY_API_KEY or DIFY_API_KEYS environment variable.");
    process.exit(1);
  }

  const results = [];
  
  for (const apiKey of DIFY_API_KEYS) {
    try {
      const result = await fetchWorkflowInfoWithKey(apiKey);
      results.push({
        apiKey,
        infoData: result.infoData,
        paramsData: result.paramsData
      });
    } catch (error) {
      console.error(`Error fetching workflow info for API key ${apiKey.substring(0, 8)}...`, error);
    }
  }

  if (results.length === 0) {
    console.error("Failed to fetch workflow info for any of the provided API keys");
    process.exit(1);
  }

  return results;
}

// Function to execute Dify Workflow API with specific API key
export async function callDifyWorkflowWithKey(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
  if (!DIFY_BASE_URL) {
    console.error("Environment variable DIFY_BASE_URL is not set");
    process.exit(1);
  }
  
  try {
    const response = await fetch(`${DIFY_BASE_URL}/workflows/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: params,
        response_mode: "blocking",
        user: "test-abc"
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Could not retrieve response text");
      console.error(`Workflow execution error: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      throw new Error(`Workflow execution error: ${response.status} ${response.statusText} ${errorText} ${params}`);
    }
    
    const result = await response.json() as DifyWorkflowResponse;
    
    return result;
  } catch (error) {
    console.error("Error during workflow execution:", error);
    throw error;
  }
}

// For API compatibility with previous implementation
export async function callDifyWorkflow(toolName: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
  // Get the API key based on the tool name
  const apiKeyIndex = parseInt(toolName.split('-')[1]) - 1;
  if (isNaN(apiKeyIndex) || apiKeyIndex < 0 || apiKeyIndex >= DIFY_API_KEYS.length) {
    throw new Error(`Invalid tool name: ${toolName}. Could not determine which API key to use.`);
  }
  
  const apiKey = DIFY_API_KEYS[apiKeyIndex];
  return callDifyWorkflowWithKey(apiKey, params);
} 