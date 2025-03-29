import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";
import { DifyClient } from "./client.js";
import { Config } from "../config.js";

/**
 * ロギングインターフェース
 * テスト時にモック可能
 */
export interface Logger {
  error(message: string, ...args: any[]): void;
}

/**
 * デフォルトのコンソールロガー実装
 */
export class ConsoleLogger implements Logger {
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
}

/**
 * ワークフローデータ型の定義
 */
export interface WorkflowData {
  apiKey: string;
  infoData: DifyInfoResponse;
  paramsData: DifyParametersResponse;
}

/**
 * ワークフロー実行の結果型
 */
export interface WorkflowExecutionResult {
  success: boolean;
  response?: DifyWorkflowResponse;
  error?: Error;
}

/**
 * Difyワークフロー関連のサービスを提供するクラス
 */
export class DifyService {
  private readonly client: DifyClient;
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly workflowApiKeyMap: Map<string, string>;
  
  /**
   * @param client - Dify APIクライアント
   * @param config - アプリケーション設定
   * @param logger - ロガーインスタンス（省略可）
   * @param initialWorkflowMap - 初期ワークフローマップ（テスト用）
   */
  constructor(
    client: DifyClient, 
    config: Config, 
    logger: Logger = new ConsoleLogger(),
    initialWorkflowMap: Map<string, string> = new Map()
  ) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.workflowApiKeyMap = new Map(initialWorkflowMap);
  }
  
  /**
   * APIキーに関連するワークフロー情報を取得する
   */
  async fetchWorkflowInfoWithKey(apiKey: string): Promise<{
    infoData: DifyInfoResponse;
    paramsData: DifyParametersResponse;
  }> {
    try {
      // 情報の取得
      const infoData = await this.client.fetchInfo(apiKey);
      
      // パラメーター情報の取得
      const paramsData = await this.client.fetchParameters(apiKey);
      
      return { infoData, paramsData };
    } catch (error) {
      this.logError('Dify Workflow API call error:', error);
      this.logErrorDetails(error);
      throw error;
    }
  }
  
  /**
   * すべてのAPIキーに関連するワークフロー情報を取得する
   */
  async fetchAllWorkflowInfo(): Promise<WorkflowData[]> {
    // 設定の検証
    this.config.validateStrict();
    
    const results: WorkflowData[] = [];
    const apiKeys = this.config.getApiKeys();
    
    if (apiKeys.length === 0) {
      throw new Error("No API keys configured");
    }
    
    const { success, failed } = await this.processBatchApiKeys(apiKeys, results);
    
    if (results.length === 0) {
      throw new Error("Failed to fetch workflow info for any of the provided API keys");
    }
    
    this.logger.error(`Successfully fetched workflow info: ${success}, Failed: ${failed}`);
    return results;
  }
  
  /**
   * 複数のAPIキーを処理し、ワークフロー情報を取得する
   * @private
   */
  private async processBatchApiKeys(
    apiKeys: string[], 
    results: WorkflowData[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const apiKey of apiKeys) {
      try {
        const result = await this.fetchWorkflowInfoWithKey(apiKey);
        
        // ワークフロー名とAPIキーのマッピングを保存
        this.registerWorkflow(result.infoData.name || "dify-workflow", apiKey);
        
        results.push({
          apiKey,
          infoData: result.infoData,
          paramsData: result.paramsData
        });
        
        success++;
      } catch (error) {
        this.logger.error(`Error fetching workflow info for an API key:`, error);
        failed++;
      }
    }
    
    return { success, failed };
  }

  /**
   * ワークフロー名とAPIキーをマップに登録する
   * @private
   */
  private registerWorkflow(workflowName: string, apiKey: string): void {
    this.workflowApiKeyMap.set(workflowName, apiKey);
  }
  
  /**
   * 指定されたAPIキーでワークフローを実行する
   */
  async runWorkflowWithKey(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
    try {
      return await this.client.runWorkflow(apiKey, params);
    } catch (error) {
      this.logError('Error during workflow execution:', error);
      this.logErrorDetails(error);
      this.logger.error(`Parameters: ${JSON.stringify(params)}`);
      throw error;
    }
  }
  
  /**
   * ワークフロー名からワークフローを実行する
   */
  async runWorkflow(workflowName: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
    const apiKey = this.getApiKeyForWorkflow(workflowName);
    
    if (!apiKey) {
      const error = this.createWorkflowNotFoundError(workflowName, params);
      throw error;
    }
    
    return this.runWorkflowWithKey(apiKey, params);
  }
  
  /**
   * ワークフロー名に対応するAPIキーを取得する
   * @private
   */
  private getApiKeyForWorkflow(workflowName: string): string | undefined {
    // ベースのワークフロー名を抽出（インデックスサフィックスを除く）
    const baseName = workflowName.split('-')[0];
    
    // マップからAPIキーを取得
    return this.workflowApiKeyMap.get(baseName) || this.workflowApiKeyMap.get(workflowName);
  }
  
  /**
   * ワークフローが見つからなかった場合のエラーを作成する
   * @private
   */
  private createWorkflowNotFoundError(workflowName: string, params: Record<string, any>): Error {
    const error = new Error(`No API key found for workflow: '${workflowName}'`);
    this.logger.error(error.message);
    this.logger.error(`Available workflows: ${Array.from(this.workflowApiKeyMap.keys()).join(', ')}`);
    this.logger.error(`Parameters: ${JSON.stringify(params)}`);
    return error;
  }
  
  /**
   * エラーをログに出力する共通メソッド
   * @private
   */
  private logError(message: string, error: unknown): void {
    this.logger.error(message, error);
  }
  
  /**
   * エラーの詳細情報をログに出力する
   * @private
   */
  private logErrorDetails(error: unknown): void {
    if (error instanceof Error && error.stack) {
      this.logger.error(`Error stack: ${error.stack}`);
    }
  }
  
  /**
   * ワークフロー名とAPIキーのマッピングを取得する
   */
  getWorkflowApiKeyMap(): Map<string, string> {
    return new Map(this.workflowApiKeyMap);
  }
  
  /**
   * テスト用にワークフローマップをクリアする
   */
  clearWorkflowApiKeyMap(): void {
    this.workflowApiKeyMap.clear();
  }
  
  /**
   * テスト用にワークフローマップを設定する
   */
  setWorkflowApiKeyMap(map: Map<string, string>): void {
    this.workflowApiKeyMap.clear();
    map.forEach((value, key) => {
      this.workflowApiKeyMap.set(key, value);
    });
  }
} 