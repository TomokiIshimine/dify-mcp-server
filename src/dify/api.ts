import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";
import { DifyApiClient } from "./client.js";
import { DifyService } from "./service.js";
import { WorkflowManager } from "./workflow.js";
import { appConfig, workflowApiKeyMap } from "../config.js";

// シングルトンインスタンスの管理
let _difyClient: DifyApiClient | null = null;
let _difyService: DifyService | null = null;
let _workflowManager: WorkflowManager | null = null;

/**
 * DifyApiClientのインスタンスを取得する
 * テスト時にモックを注入できるようにするためのファクトリ関数
 */
export function getDifyClient(config = appConfig): DifyApiClient {
  if (!_difyClient) {
    _difyClient = new DifyApiClient(config);
  }
  return _difyClient;
}

/**
 * テスト用にDifyApiClientのモックを設定する
 */
export function setDifyClient(client: DifyApiClient): void {
  _difyClient = client;
}

/**
 * DifyServiceのインスタンスを取得する
 * テスト時にモックを注入できるようにするためのファクトリ関数
 */
export function getDifyService(config = appConfig): DifyService {
  if (!_difyService) {
    const client = getDifyClient(config);
    _difyService = new DifyService(client, config);
  }
  return _difyService;
}

/**
 * テスト用にDifyServiceのモックを設定する
 */
export function setDifyService(service: DifyService): void {
  _difyService = service;
}

/**
 * WorkflowManagerのインスタンスを取得する
 * テスト時にモックを注入できるようにするためのファクトリ関数
 */
export function getWorkflowManager(): WorkflowManager {
  if (!_workflowManager) {
    const service = getDifyService();
    _workflowManager = new WorkflowManager(service);
  }
  return _workflowManager;
}

/**
 * テスト用にWorkflowManagerのモックを設定する
 */
export function setWorkflowManager(manager: WorkflowManager): void {
  _workflowManager = manager;
}

/**
 * テスト後に全てのシングルトンインスタンスをリセットする
 */
export function resetInstances(): void {
  _difyClient = null;
  _difyService = null;
  _workflowManager = null;
}

/**
 * 特定のAPIキーに関連するDifyワークフロー情報を取得する
 * @deprecated 新しいコードでは DifyService クラスを直接使用してください
 */
export async function fetchWorkflowInfoWithKey(
  apiKey: string, 
  service = getDifyService()
): Promise<{
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}> {
  return service.fetchWorkflowInfoWithKey(apiKey);
}

/**
 * すべてのAPIキーに関連するDifyワークフロー情報を取得する
 * @deprecated 新しいコードでは DifyService クラスを直接使用してください
 */
export async function fetchWorkflowInfo(
  service = getDifyService()
): Promise<Array<{
  apiKey: string,
  infoData: DifyInfoResponse, 
  paramsData: DifyParametersResponse
}>> {
  return service.fetchAllWorkflowInfo();
}

/**
 * 特定のAPIキーでDifyワークフローAPIを実行する
 * @deprecated 新しいコードでは DifyService クラスを直接使用してください
 */
export async function callDifyWorkflowWithKey(
  apiKey: string, 
  params: Record<string, any>,
  service = getDifyService()
): Promise<DifyWorkflowResponse> {
  return service.runWorkflowWithKey(apiKey, params);
}

/**
 * 前の実装との互換性のためのAPI
 * @deprecated 新しいコードでは WorkflowManager クラスを直接使用してください
 */
export async function callDifyWorkflow(
  toolName: string, 
  params: Record<string, any>,
  service = getDifyService()
): Promise<DifyWorkflowResponse> {
  return service.runWorkflow(toolName, params);
} 