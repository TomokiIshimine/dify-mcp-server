import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DifyService, WorkflowData } from "./service.js";
import { convertDifyWorkflowToMCPTools } from "./converter.js";
import { DifyWorkflowResponse } from "../types.js";

/**
 * ロガーインターフェース
 */
export interface Logger {
  error(message: string, ...args: any[]): void;
}

/**
 * デフォルトロガー実装
 */
export class ConsoleLogger implements Logger {
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
}

/**
 * ワークフローツール変換インターフェース
 */
export interface WorkflowConverter {
  convert(workflowDataList: WorkflowData[]): Tool[];
}

/**
 * デフォルトのワークフローツール変換実装
 */
export class DefaultWorkflowConverter implements WorkflowConverter {
  convert(workflowDataList: WorkflowData[]): Tool[] {
    return convertDifyWorkflowToMCPTools(workflowDataList);
  }
}

/**
 * Difyワークフロー管理クラス
 */
export class WorkflowManager {
  private readonly difyService: DifyService;
  private readonly logger: Logger;
  private readonly converter: WorkflowConverter;
  private workflowTools: Tool[] = [];
  
  /**
   * コンストラクタ
   * @param difyService Difyサービス
   * @param logger ロガー（オプション）
   * @param converter ワークフロー変換機能（オプション）
   */
  constructor(
    difyService: DifyService, 
    logger: Logger = new ConsoleLogger(),
    converter: WorkflowConverter = new DefaultWorkflowConverter()
  ) {
    this.difyService = difyService;
    this.logger = logger;
    this.converter = converter;
  }
  
  /**
   * ワークフロー情報を初期化する
   */
  async initialize(): Promise<void> {
    try {
      // ワークフロー情報の取得
      const workflowDataList = await this.fetchWorkflowData();
      
      // Dify ワークフローを MCP ツール定義に変換
      this.workflowTools = this.convertToTools(workflowDataList);
      
      this.validateTools();
      
      this.logger.error(`Successfully initialized ${this.workflowTools.length} workflow tools.`);
    } catch (error) {
      this.handleInitializationError(error);
      throw error;
    }
  }
  
  /**
   * ワークフロー情報を取得する（テスト用に分離）
   */
  protected async fetchWorkflowData(): Promise<WorkflowData[]> {
    return this.difyService.fetchAllWorkflowInfo();
  }
  
  /**
   * ワークフローデータをツールに変換する（テスト用に分離）
   */
  protected convertToTools(workflowDataList: WorkflowData[]): Tool[] {
    return this.converter.convert(workflowDataList);
  }
  
  /**
   * ツールの検証を行う（テスト用に分離）
   */
  protected validateTools(): void {
    if (this.workflowTools.length === 0) {
      throw new Error("No workflow tools were generated. Check Dify API keys and workflows configuration.");
    }
  }
  
  /**
   * 初期化エラーを処理する（テスト用に分離）
   */
  protected handleInitializationError(error: unknown): void {
    this.logger.error("Failed to retrieve or convert Dify Workflow information:");
    
    if (error instanceof Error) {
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
    } else {
      this.logger.error(`Unknown error type: ${error}`);
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
      const result = await this.runWorkflow(toolName, params);
      return this.extractOutputContent(result);
    } catch (error) {
      this.handleExecutionError(error, toolName, params);
      throw this.wrapExecutionError(error, toolName);
    }
  }
  
  /**
   * ワークフローを実行する（テスト用に分離）
   */
  protected async runWorkflow(toolName: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
    return this.difyService.runWorkflow(toolName, params);
  }
  
  /**
   * 実行エラーを処理する（テスト用に分離）
   */
  protected handleExecutionError(error: unknown, toolName: string, params: Record<string, any>): void {
    this.logger.error(`Error executing tool '${toolName}':`);
    
    if (error instanceof Error) {
      this.logger.error(`Error message: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      this.logger.error(`Parameters: ${JSON.stringify(params)}`);
    } else {
      this.logger.error(`Unknown error type: ${error}`);
      this.logger.error(`Parameters: ${JSON.stringify(params)}`);
    }
  }
  
  /**
   * 実行エラーをラップする（テスト用に分離）
   */
  protected wrapExecutionError(error: unknown, toolName: string): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(`Unknown error occurred while executing tool '${toolName}': ${error}`);
  }
  
  /**
   * レスポンスから出力コンテンツを抽出する
   */
  protected extractOutputContent(result: DifyWorkflowResponse): any {
    const outputContent = result.data?.outputs || result.result || result;
    return outputContent;
  }
} 