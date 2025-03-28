import fetch from "node-fetch";
import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";

// Get Dify configuration from environment variables
const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// Function to retrieve Dify workflow information
export async function fetchWorkflowInfo(): Promise<{
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}> {
  if (!DIFY_BASE_URL || !DIFY_API_KEY) {
    console.error("Environment variables DIFY_BASE_URL or DIFY_API_KEY are not set");
    process.exit(1);
  }

  try {
    const infoResponse = await fetch(`${DIFY_BASE_URL}/info`, {
      headers: {
        "Authorization": `Bearer ${DIFY_API_KEY}`,
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
        "Authorization": `Bearer ${DIFY_API_KEY}`,
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

// Function to execute Dify Workflow API
export async function callDifyWorkflow(params: Record<string, any>): Promise<DifyWorkflowResponse> {
  try {
    const response = await fetch(`${DIFY_BASE_URL}/workflows/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DIFY_API_KEY}`,
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