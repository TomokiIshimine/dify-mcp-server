import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";
import { DifyApiClient } from "./client.js";
import { DifyService } from "./service.js";
import { WorkflowManager } from "./workflow.js";
import { appConfig, workflowApiKeyMap } from "../config.js";

// シングルトンインスタンスの作成（後方互換性のため）
const difyClient = new DifyApiClient(appConfig);
const difyService = new DifyService(difyClient, appConfig);
const workflowManager = new WorkflowManager(difyService);

/**
 * 特定のAPIキーに関連するDifyワークフロー情報を取得する
 * @deprecated 新しいコードでは DifyService クラスを直接使用してください
 */
export async function fetchWorkflowInfoWithKey(apiKey: string): Promise<{
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}> {
  return getDifyService().fetchWorkflowInfoWithKey(apiKey);
}

/**
 * すべてのAPIキーに関連するDifyワークフロー情報を取得する
 * @deprecated 新しいコードでは DifyService クラスを直接使用してください
 */
export async function fetchWorkflowInfo(): Promise<Array<{
  apiKey: string,
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}>> {
  return getDifyService().fetchAllWorkflowInfo();
}

/**
 * 特定のAPIキーでDifyワークフローAPIを実行する
 * @deprecated 新しいコードでは DifyService クラスを直接使用してください
 */
export async function callDifyWorkflowWithKey(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
  return getDifyService().runWorkflowWithKey(apiKey, params);
}

/**
 * 前の実装との互換性のためのAPI
 * @deprecated 新しいコードでは WorkflowManager クラスを直接使用してください
 */
export async function callDifyWorkflow(toolName: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
  return getDifyService().runWorkflow(toolName, params);
}

// シングルトンインスタンスの取得（新しいコードで使用）
export function getDifyService(): DifyService {
  return difyService;
}

export function getWorkflowManager(): WorkflowManager {
  return workflowManager;
} 