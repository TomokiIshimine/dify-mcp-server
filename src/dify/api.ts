import fetch, { Response as FetchResponse } from "node-fetch";
import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";
import { workflowApiKeyMap, AppConfig, handleConfigError } from "../config.js";

/**
 * API レスポンスエラーのハンドリング関数
 */
async function handleApiResponseError(response: FetchResponse, endpoint: string, apiKey: string): Promise<never> {
  const errorText = await response.text().catch(() => "Could not retrieve response text");
  console.error(`${endpoint} API error code: ${response.status}`);
  console.error(`${endpoint} API error message: ${response.statusText}`);
  console.error(`${endpoint} API error response: ${errorText}`);
  console.error(`API Key (masked): ${maskApiKey(apiKey)}`);
  
  throw new Error(`${endpoint} API error: ${response.status} ${response.statusText}`);
}

/**
 * JSON パースエラーのハンドリング関数
 */
function handleParseError(error: unknown, endpoint: string): never {
  console.error(`${endpoint} JSON parse error:`, error);
  if (error instanceof Error) {
    console.error(`Error stack: ${error.stack}`);
  }
  throw new Error(`Failed to parse ${endpoint} API response: ${error}`);
}

/**
 * API キーをマスクする関数（ログ出力用）
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "********";
  }
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

// Function to retrieve Dify workflow information for a specific API key
export async function fetchWorkflowInfoWithKey(apiKey: string): Promise<{
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}> {
  // 設定を検証
  const baseUrl = AppConfig.BASE_URL;
  if (!baseUrl) {
    handleConfigError("Environment variable DIFY_BASE_URL is not set");
  }

  try {
    // Fetch workflow info
    const infoResponse = await fetch(`${baseUrl}/info`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!infoResponse.ok) {
      await handleApiResponseError(infoResponse, "/info", apiKey);
    }

    const infoDataText = await infoResponse.text();
    
    let infoData: DifyInfoResponse;
    try {
      infoData = JSON.parse(infoDataText) as DifyInfoResponse;
    } catch (parseError) {
      handleParseError(parseError, "/info");
    }

    // Fetch workflow parameters
    const paramsResponse = await fetch(`${baseUrl}/parameters`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!paramsResponse.ok) {
      await handleApiResponseError(paramsResponse, "/parameters", apiKey);
    }

    const paramsDataText = await paramsResponse.text();
    
    let paramsData: DifyParametersResponse;
    try {
      paramsData = JSON.parse(paramsDataText) as DifyParametersResponse;
    } catch (parseError) {
      handleParseError(parseError, "/parameters");
    }

    return { infoData, paramsData };
  } catch (error) {
    console.error(`Dify Workflow API call error for API Key ${maskApiKey(apiKey)}:`, error);
    if (error instanceof Error) {
      console.error(`Error stack: ${error.stack}`);
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
  // 設定を検証
  AppConfig.validateStrict();

  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const apiKey of AppConfig.API_KEYS) {
    try {
      const result = await fetchWorkflowInfoWithKey(apiKey);
      
      // Store the workflow name and API key in the map
      const workflowName = result.infoData.name || "dify-workflow";
      workflowApiKeyMap.set(workflowName, apiKey);
      
      results.push({
        apiKey,
        infoData: result.infoData,
        paramsData: result.paramsData
      });
      
      successCount++;
    } catch (error) {
      console.error(`Error fetching workflow info for API key ${maskApiKey(apiKey)}:`, error);
      failCount++;
    }
  }
  
  if (results.length === 0) {
    handleConfigError("Failed to fetch workflow info for any of the provided API keys");
  }

  return results;
}

// Function to execute Dify Workflow API with specific API key
export async function callDifyWorkflowWithKey(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
  // 設定を検証
  const baseUrl = AppConfig.BASE_URL;
  if (!baseUrl) {
    handleConfigError("Environment variable DIFY_BASE_URL is not set");
  }
  
  // API呼び出し設定を取得
  const apiConfig = AppConfig.getApiRequestConfig();
  
  try {
    const response = await fetch(`${baseUrl}/workflows/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: params,
        response_mode: apiConfig.responseMode,
        user: apiConfig.userId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Could not retrieve response text");
      console.error(`Workflow execution error: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      console.error(`Parameters: ${JSON.stringify(params)}`);
      console.error(`API Key (masked): ${maskApiKey(apiKey)}`);
      
      throw new Error(`Workflow execution error: ${response.status} ${response.statusText}`);
    }
    
    const resultText = await response.text();
    let result: DifyWorkflowResponse;
    
    try {
      result = JSON.parse(resultText) as DifyWorkflowResponse;
    } catch (parseError) {
      console.error("Failed to parse workflow execution response:", parseError);
      console.error("Response text:", resultText);
      throw new Error(`Failed to parse workflow execution response: ${parseError}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error during workflow execution with API key ${maskApiKey(apiKey)}:`, error);
    if (error instanceof Error) {
      console.error(`Error stack: ${error.stack}`);
    }
    console.error(`Parameters: ${JSON.stringify(params)}`);
    throw error;
  }
}

// For API compatibility with previous implementation
export async function callDifyWorkflow(toolName: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
  // Extract the base workflow name without the index suffix
  const workflowName = toolName.split('-')[0];
  
  // Get the API key from the map
  const apiKey = workflowApiKeyMap.get(workflowName);
  
  if (!apiKey) {
    const error = new Error(`No API key found for workflow: '${workflowName}'`);
    console.error(error.message);
    console.error(`Available workflows: ${Array.from(workflowApiKeyMap.keys()).join(', ')}`);
    console.error(`Parameters: ${JSON.stringify(params)}`);
    throw error;
  }
  
  return callDifyWorkflowWithKey(apiKey, params);
} 