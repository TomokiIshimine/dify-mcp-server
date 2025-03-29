import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { fetchWorkflowInfo } from "./dify/api.js";
import { workflowApiKeyMap, AppConfig, handleConfigError } from "./config.js";
import { convertDifyWorkflowToMCPTools } from "./dify/converter.js";
import { callDifyWorkflowWithKey } from "./dify/api.js";

// Variables to store Dify Workflow API information
let workflowTools: Tool[] = [];

/**
 * サーバー初期化エラーハンドリング関数
 */
function handleInitializationError(error: unknown): never {
  console.error("Failed to retrieve or convert Dify Workflow information:");
  
  if (error instanceof Error) {
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
  } else {
    console.error(`Unknown error type: ${error}`);
  }
  
  process.exit(1);
}

/**
 * ツール実行中のエラーハンドリング関数
 */
function handleToolExecutionError(error: unknown, toolName: string, params: Record<string, any> | undefined): Error {
  console.error(`Error executing tool '${toolName}':`);
  
  if (error instanceof Error) {
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    console.error(`Parameters: ${JSON.stringify(params)}`);
    return error;
  } else {
    const genericError = new Error(`Unknown error occurred while executing tool '${toolName}': ${error}`);
    console.error(`Parameters: ${JSON.stringify(params)}`);
    return genericError;
  }
}

// Server setup and initialization
export async function setupServer() {
  // 設定を検証
  AppConfig.validateStrict();
  
  // First, retrieve Dify Workflow information
  try {
    const workflowDataList = await fetchWorkflowInfo();
    // Convert Dify Workflow to MCP tool definition
    workflowTools = convertDifyWorkflowToMCPTools(workflowDataList);
    
    if (workflowTools.length === 0) {
      throw new Error("No workflow tools were generated. Check Dify API keys and workflows configuration.");
    }
    
  } catch (error) {
    handleInitializationError(error);
  }
  
  const serverConfig = AppConfig.getServerConfig();
  const server = new Server(serverConfig, {
    capabilities: {
      tools: {
        enabled: true
      }
    }
  });
  
  // Tool list request handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: workflowTools };
  });
  
  // Tool execution request handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const workflowParams = request.params.arguments as Record<string, any> | undefined;
    
    try {
      // Check if parameters are not undefined
      if (workflowParams === undefined) {
        throw new Error(`Workflow parameters are undefined for tool '${toolName}'. Request: ${JSON.stringify(request)}`);
      }

      // Get the API key directly from the mapping
      const apiKey = workflowApiKeyMap.get(toolName);
      
      if (!apiKey) {
        throw new Error(`No API key found for workflow: '${toolName}'`);
      }
      
      // Call Dify Workflow directly with the API key
      const result = await callDifyWorkflowWithKey(apiKey, workflowParams);
      
      // Extract outputs field if available, otherwise use the original response
      const outputContent = result.data?.outputs || result.result || result;
      
      return {
        content: [
          {
            type: "text",
            text: typeof outputContent === 'object' ? JSON.stringify(outputContent) : outputContent
          }
        ]
      };
    } catch (error) {
      throw handleToolExecutionError(error, toolName, workflowParams);
    }
  });
  
  return server;
} 