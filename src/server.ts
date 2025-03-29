import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { fetchWorkflowInfo } from "./dify/api.js";
import { convertDifyWorkflowToMCPTools } from "./dify/converter.js";
import { callDifyWorkflow } from "./dify/api.js";

// Variables to store Dify Workflow API information
let workflowTools: Tool[] = [];

// Server setup and initialization
export async function setupServer() {
  // First, retrieve Dify Workflow information
  try {
    const workflowDataList = await fetchWorkflowInfo();
    // Convert Dify Workflow to MCP tool definition
    workflowTools = convertDifyWorkflowToMCPTools(workflowDataList);
    
    console.log(`Successfully loaded ${workflowTools.length} tools from ${workflowDataList.length} API keys`);
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

      // Call Dify Workflow with the tool name (which is used to determine which API key to use)
      const result = await callDifyWorkflow(toolName, workflowParams);
      
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