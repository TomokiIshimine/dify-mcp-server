import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";
import { DifyClient } from "./client.js";
import { Config } from "../config.js";

/**
 * ワークフローデータ型の定義
 */
export interface WorkflowData {
  apiKey: string;
  infoData: DifyInfoResponse;
  paramsData: DifyParametersResponse;
}

/**
 * Difyワークフロー関連のサービスを提供するクラス
 */
export class DifyService {
  private readonly client: DifyClient;
  private readonly config: Config;
  private readonly workflowApiKeyMap = new Map<string, string>();
  
  constructor(client: DifyClient, config: Config) {
    this.client = client;
    this.config = config;
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
      console.error(`Dify Workflow API call error for API Key (masked):`, error);
      if (error instanceof Error) {
        console.error(`Error stack: ${error.stack}`);
      }
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
    let successCount = 0;
    let failCount = 0;
    
    for (const apiKey of this.config.getApiKeys()) {
      try {
        const result = await this.fetchWorkflowInfoWithKey(apiKey);
        
        // ワークフロー名とAPIキーのマッピングを保存
        const workflowName = result.infoData.name || "dify-workflow";
        this.workflowApiKeyMap.set(workflowName, apiKey);
        
        results.push({
          apiKey,
          infoData: result.infoData,
          paramsData: result.paramsData
        });
        
        successCount++;
      } catch (error) {
        console.error(`Error fetching workflow info for an API key:`, error);
        failCount++;
      }
    }
    
    if (results.length === 0) {
      throw new Error("Failed to fetch workflow info for any of the provided API keys");
    }
    
    console.error(`Successfully fetched workflow info: ${successCount}, Failed: ${failCount}`);
    return results;
  }
  
  /**
   * 指定されたAPIキーでワークフローを実行する
   */
  async runWorkflowWithKey(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
    try {
      return await this.client.runWorkflow(apiKey, params);
    } catch (error) {
      console.error(`Error during workflow execution:`, error);
      if (error instanceof Error) {
        console.error(`Error stack: ${error.stack}`);
      }
      console.error(`Parameters: ${JSON.stringify(params)}`);
      throw error;
    }
  }
  
  /**
   * ワークフロー名からワークフローを実行する
   */
  async runWorkflow(workflowName: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
    // ベースのワークフロー名を抽出（インデックスサフィックスを除く）
    const baseName = workflowName.split('-')[0];
    
    // マップからAPIキーを取得
    const apiKey = this.workflowApiKeyMap.get(baseName) || this.workflowApiKeyMap.get(workflowName);
    
    if (!apiKey) {
      const error = new Error(`No API key found for workflow: '${workflowName}'`);
      console.error(error.message);
      console.error(`Available workflows: ${Array.from(this.workflowApiKeyMap.keys()).join(', ')}`);
      console.error(`Parameters: ${JSON.stringify(params)}`);
      throw error;
    }
    
    return this.runWorkflowWithKey(apiKey, params);
  }
  
  /**
   * ワークフロー名とAPIキーのマッピングを取得する
   */
  getWorkflowApiKeyMap(): Map<string, string> {
    return new Map(this.workflowApiKeyMap);
  }
} 