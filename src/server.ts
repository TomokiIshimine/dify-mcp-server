import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { appConfig } from "./config.js";
import { getWorkflowManager } from "./dify/api.js";
import { WorkflowManager } from "./dify/workflow.js";

/**
 * Server initialization error handler function
 */
export function handleInitializationError(error: unknown, exitProcess = true): never | void {
  console.error("Failed to retrieve or convert Dify Workflow information:");
  
  if (error instanceof Error) {
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
  } else {
    console.error(`Unknown error type: ${error}`);
  }
  
  if (exitProcess) {
    process.exit(1);
  }
  
  throw error;
}

/**
 * Initialize workflow manager
 */
export async function initializeWorkflowManager(
  workflowManager = getWorkflowManager()
): Promise<WorkflowManager | undefined> {
  try {
    await workflowManager.initialize();
    return workflowManager;
  } catch (error) {
    handleInitializationError(error);
    return undefined; // This line will never be executed but is necessary for type checking
  }
}

/**
 * Set up request handlers
 */
export function setupRequestHandlers(server: Server, workflowManager: WorkflowManager): void {
  // Tools list request handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = workflowManager.getTools();
    return { tools };
  });
  
  // Tool execution request handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleCallToolRequest(workflowManager, request);
  });
}

/**
 * Handle tool execution request
 */
export async function handleCallToolRequest(workflowManager: WorkflowManager, request: any) {
  const toolName = request.params.name;
  const workflowParams = request.params.arguments as Record<string, any> | undefined;
  
  // Error if parameters are undefined
  if (workflowParams === undefined) {
    const error = new Error(`Workflow parameters are undefined for tool '${toolName}'. Request: ${JSON.stringify(request)}`);
    console.error(error.message);
    throw error;
  }
  
  try {
    // Execute workflow
    const outputContent = await workflowManager.executeWorkflow(toolName, workflowParams);
    
    return {
      content: [
        {
          type: "text",
          text: typeof outputContent === 'object' ? JSON.stringify(outputContent) : outputContent
        }
      ]
    };
  } catch (error) {
    console.error(`Error executing tool '${toolName}':`, error);
    
    if (error instanceof Error) {
      console.error(`Parameters: ${JSON.stringify(workflowParams)}`);
      throw error;
    } else {
      const genericError = new Error(`Unknown error occurred while executing tool '${toolName}': ${error}`);
      console.error(`Parameters: ${JSON.stringify(workflowParams)}`);
      throw genericError;
    }
  }
}

/**
 * Create server instance
 */
export function createServer(serverConfig = appConfig.getServerConfig()): Server {
  return new Server(serverConfig, {
    capabilities: {
      tools: {
        enabled: true
      }
    }
  });
}

/**
 * Set up and initialize MCP Server
 */
export async function setupServer(
  config = appConfig,
  workflowManagerFactory = getWorkflowManager
): Promise<Server> {
  // Validate configuration
  config.validateStrict();
  
  // Get and initialize workflow manager
  const workflowManager = workflowManagerFactory();
  await initializeWorkflowManager(workflowManager);
  
  // Create server
  const server = createServer(config.getServerConfig());
  
  // Set up request handlers
  setupRequestHandlers(server, workflowManager);
  
  return server;
} 