import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { appConfig } from "./config.js";
import { getWorkflowManager } from "./dify/api.js";

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
 * MCP Serverのセットアップと初期化
 */
export async function setupServer() {
  // 設定を検証
  appConfig.validateStrict();
  
  // ワークフローマネージャーの取得
  const workflowManager = getWorkflowManager();
  
  try {
    // ワークフロー情報を初期化
    await workflowManager.initialize();
  } catch (error) {
    handleInitializationError(error);
  }
  
  // サーバー設定の取得
  const serverConfig = appConfig.getServerConfig();
  
  // サーバーの作成
  const server = new Server(serverConfig, {
    capabilities: {
      tools: {
        enabled: true
      }
    }
  });
  
  // ツール一覧リクエストハンドラー
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = workflowManager.getTools();
    return { tools };
  });
  
  // ツール実行リクエストハンドラー
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const workflowParams = request.params.arguments as Record<string, any> | undefined;
    
    // パラメータが未定義の場合はエラー
    if (workflowParams === undefined) {
      const error = new Error(`Workflow parameters are undefined for tool '${toolName}'. Request: ${JSON.stringify(request)}`);
      console.error(error.message);
      throw error;
    }
    
    try {
      // ワークフローの実行
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
  });
  
  return server;
} 