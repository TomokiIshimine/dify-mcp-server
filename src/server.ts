import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { fetchWorkflowInfo } from "./dify/api.js";
import { workflowApiKeyMap } from "./config.js";
import { convertDifyWorkflowToMCPTools } from "./dify/converter.js";
import { callDifyWorkflowWithKey } from "./dify/api.js";

// Variables to store Dify Workflow API information
let workflowTools: Tool[] = [];

// Server setup and initialization
export async function setupServer() {
  // First, retrieve Dify Workflow information
  try {
    const workflowDataList = await fetchWorkflowInfo();
    // Convert Dify Workflow to MCP tool definition
    workflowTools = convertDifyWorkflowToMCPTools(workflowDataList);
    
    console.log(`Initialized ${workflowTools.length} tools from ${workflowApiKeyMap.size} workflow(s)`);
  } catch (error) {
    console.error("Failed to retrieve or convert Dify Workflow information:", error);
    process.exit(1);
  }
  
  const server = new Server({
    name: "dify-workflow-mcp-server",
    version: "1.0.0"
  }, {
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
    try {
      const toolName = request.params.name;
      const workflowParams = request.params.arguments as Record<string, any> | undefined;

      // Check if parameters are not undefined
      if (workflowParams === undefined) {
        console.error("Error: Workflow parameters are undefined. Check request content.");
        throw new Error(`Workflow parameters are undefined ${JSON.stringify(request)}`);
      }

      // Get the API key directly from the mapping
      const apiKey = workflowApiKeyMap.get(toolName);
      
      if (!apiKey) {
        throw new Error(`No API key found for workflow: ${toolName}`);
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
      console.error(`Error in handler: ${error}`);
      if (error instanceof Error) {
        console.error(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  });
  
  return server;
} 