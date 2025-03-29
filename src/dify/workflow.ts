import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DifyService, WorkflowData } from "./service.js";
import { convertDifyWorkflowToMCPTools } from "./converter.js";
import { DifyWorkflowResponse } from "../types.js";

/**
 * Difyワークフロー管理クラス
 */
export class WorkflowManager {
  private readonly difyService: DifyService;
  private workflowTools: Tool[] = [];
  
  constructor(difyService: DifyService) {
    this.difyService = difyService;
  }
  
  /**
   * ワークフロー情報を初期化する
   */
  async initialize(): Promise<void> {
    try {
      // ワークフロー情報の取得
      const workflowDataList = await this.difyService.fetchAllWorkflowInfo();
      
      // Dify ワークフローを MCP ツール定義に変換
      this.workflowTools = convertDifyWorkflowToMCPTools(workflowDataList);
      
      if (this.workflowTools.length === 0) {
        throw new Error("No workflow tools were generated. Check Dify API keys and workflows configuration.");
      }
      
      console.error(`Successfully initialized ${this.workflowTools.length} workflow tools.`);
    } catch (error) {
      console.error("Failed to retrieve or convert Dify Workflow information:");
      
      if (error instanceof Error) {
        console.error(`Error message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      } else {
        console.error(`Unknown error type: ${error}`);
      }
      
      throw error;
    }
  }
  
  /**
   * 利用可能なツール一覧を取得する
   */
  getTools(): Tool[] {
    return [...this.workflowTools];
  }
  
  /**
   * ワークフローを実行する
   */
  async executeWorkflow(toolName: string, params: Record<string, any>): Promise<any> {
    try {
      // Dify ワークフローを直接呼び出す
      const result = await this.difyService.runWorkflow(toolName, params);
      
      // outputsフィールドが利用可能な場合はそれを使用し、それ以外の場合はオリジナルのレスポンスを使用
      return this.extractOutputContent(result);
    } catch (error) {
      console.error(`Error executing tool '${toolName}':`);
      
      if (error instanceof Error) {
        console.error(`Error message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
        console.error(`Parameters: ${JSON.stringify(params)}`);
        throw error;
      } else {
        const genericError = new Error(`Unknown error occurred while executing tool '${toolName}': ${error}`);
        console.error(`Parameters: ${JSON.stringify(params)}`);
        throw genericError;
      }
    }
  }
  
  /**
   * レスポンスから出力コンテンツを抽出する
   */
  private extractOutputContent(result: DifyWorkflowResponse): any {
    const outputContent = result.data?.outputs || result.result || result;
    return outputContent;
  }
} 