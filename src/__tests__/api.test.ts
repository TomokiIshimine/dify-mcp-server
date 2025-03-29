import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  getDifyClient,
  setDifyClient,
  getDifyService,
  setDifyService,
  getWorkflowManager,
  setWorkflowManager,
  resetInstances,
  fetchWorkflowInfoWithKey,
  fetchWorkflowInfo,
  callDifyWorkflowWithKey,
  callDifyWorkflow
} from '../dify/api.js';
import { DifyApiClient } from '../dify/client.js';
import { DifyService } from '../dify/service.js';
import { WorkflowManager } from '../dify/workflow.js';
import { appConfig } from '../config.js';

// モックのクラスをモジュールの外部で宣言
jest.mock('../dify/client.js');
jest.mock('../dify/service.js');
jest.mock('../dify/workflow.js');

describe('Dify API Module', () => {
  beforeEach(() => {
    // 各テスト前にリセット
    resetInstances();
    jest.clearAllMocks();
  });

  describe('シングルトン管理とファクトリ関数', () => {
    it('setDifyClientとgetDifyClientが正しく動作する', () => {
      // カスタムモックを設定
      const mockClient = {} as DifyApiClient;
      
      // カスタムモックをセット
      setDifyClient(mockClient);
      
      // 同じインスタンスが返されることを確認
      const client = getDifyClient();
      expect(client).toBe(mockClient);
    });

    it('setDifyServiceとgetDifyServiceが正しく動作する', () => {
      // カスタムモックを設定
      const mockService = {} as DifyService;
      
      // カスタムモックをセット
      setDifyService(mockService);
      
      // 同じインスタンスが返されることを確認
      const service = getDifyService();
      expect(service).toBe(mockService);
    });

    it('setWorkflowManagerとgetWorkflowManagerが正しく動作する', () => {
      // カスタムモックを設定
      const mockManager = {} as WorkflowManager;
      
      // カスタムモックをセット
      setWorkflowManager(mockManager);
      
      // 同じインスタンスが返されることを確認
      const manager = getWorkflowManager();
      expect(manager).toBe(mockManager);
    });

    it('resetInstancesが正しく動作する', () => {
      // カスタムモックを設定
      const mockClient = {} as DifyApiClient;
      const mockService = {} as DifyService;
      const mockManager = {} as WorkflowManager;
      
      // カスタムモックをセット
      setDifyClient(mockClient);
      setDifyService(mockService);
      setWorkflowManager(mockManager);
      
      // インスタンスが設定されていることを確認
      expect(getDifyClient()).toBe(mockClient);
      expect(getDifyService()).toBe(mockService);
      expect(getWorkflowManager()).toBe(mockManager);
      
      // リセット
      resetInstances();
      
      // 別のインスタンスが返されることを確認（モックは自動的に生成される）
      expect(getDifyClient()).not.toBe(mockClient);
      expect(getDifyService()).not.toBe(mockService);
      expect(getWorkflowManager()).not.toBe(mockManager);
    });
  });

  describe('API関数', () => {
    it('fetchWorkflowInfoWithKeyは正しくサービスメソッドを呼び出す', async () => {
      // モックレスポンスを設定
      const mockResponse = { infoData: {}, paramsData: {} };
      
      // モックサービスを作成
      const mockService = {
        // @ts-ignore
        fetchWorkflowInfoWithKey: jest.fn().mockResolvedValue(mockResponse)
      } as unknown as DifyService;
      
      // 関数を呼び出し
      const result = await fetchWorkflowInfoWithKey('test-api-key', mockService);
      
      // 検証
      expect(mockService.fetchWorkflowInfoWithKey).toHaveBeenCalledWith('test-api-key');
      expect(result).toEqual(mockResponse);
    });

    it('fetchWorkflowInfoは正しくサービスメソッドを呼び出す', async () => {
      // モックレスポンスを設定
      const mockResult = [{ apiKey: 'test-api-key', infoData: {}, paramsData: {} }];
      
      // モックサービスを作成
      const mockService = {
        // @ts-ignore
        fetchAllWorkflowInfo: jest.fn().mockResolvedValue(mockResult)
      } as unknown as DifyService;
      
      // 関数を呼び出し
      const result = await fetchWorkflowInfo(mockService);
      
      // 検証
      expect(mockService.fetchAllWorkflowInfo).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('callDifyWorkflowWithKeyは正しくサービスメソッドを呼び出す', async () => {
      // パラメータを設定
      const mockParams = { input: 'test input' };
      const mockResponse = { result: 'success' };
      
      // モックサービスを作成
      const mockService = {
        // @ts-ignore
        runWorkflowWithKey: jest.fn().mockResolvedValue(mockResponse)
      } as unknown as DifyService;
      
      // 関数を呼び出し
      const result = await callDifyWorkflowWithKey('test-api-key', mockParams, mockService);
      
      // 検証
      expect(mockService.runWorkflowWithKey).toHaveBeenCalledWith('test-api-key', mockParams);
      expect(result).toEqual(mockResponse);
    });

    it('callDifyWorkflowは正しくサービスメソッドを呼び出す', async () => {
      // パラメータを設定
      const mockParams = { input: 'test input' };
      const mockResponse = { result: 'success' };
      
      // モックサービスを作成
      const mockService = {
        // @ts-ignore
        runWorkflow: jest.fn().mockResolvedValue(mockResponse)
      } as unknown as DifyService;
      
      // 関数を呼び出し
      const result = await callDifyWorkflow('test-tool', mockParams, mockService);
      
      // 検証
      expect(mockService.runWorkflow).toHaveBeenCalledWith('test-tool', mockParams);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('エラー処理', () => {
    it('サービスメソッドがエラーを投げた場合、そのエラーを伝播する', async () => {
      // モックエラーを設定
      const mockError = new Error('テストエラー');
      
      // モックサービスを作成
      const mockService = {
        // @ts-ignore
        fetchWorkflowInfoWithKey: jest.fn().mockRejectedValue(mockError)
      } as unknown as DifyService;
      
      // エラーが伝播することを検証
      await expect(fetchWorkflowInfoWithKey('test-api-key', mockService))
        .rejects.toThrow(mockError);
    });
  });

  describe('依存性注入パターン', () => {
    it('デフォルトではファクトリメソッドを使用する', async () => {
      // モックレスポンスを設定
      const mockResponse = { infoData: {}, paramsData: {} };
      
      // モックサービスを作成
      const mockService = {
        // @ts-ignore
        fetchWorkflowInfoWithKey: jest.fn().mockResolvedValue(mockResponse)
      } as unknown as DifyService;
      
      // グローバルサービスとして設定
      setDifyService(mockService);
      
      // サービスを指定せずに関数を呼び出し
      await fetchWorkflowInfoWithKey('test-api-key');
      
      // 設定したモックサービスが使用されることを確認
      expect(mockService.fetchWorkflowInfoWithKey).toHaveBeenCalledWith('test-api-key');
    });
    
    it('明示的に渡されたサービスを使用する', async () => {
      // デフォルトのモックサービス
      const defaultMockService = {
        // @ts-ignore
        fetchWorkflowInfoWithKey: jest.fn().mockResolvedValue({})
      } as unknown as DifyService;
      
      // 明示的に渡すモックサービス
      const explicitMockService = {
        // @ts-ignore
        fetchWorkflowInfoWithKey: jest.fn().mockResolvedValue({ infoData: {}, paramsData: {} })
      } as unknown as DifyService;
      
      // デフォルトのサービスを設定
      setDifyService(defaultMockService);
      
      // 明示的にサービスを渡して関数を呼び出し
      await fetchWorkflowInfoWithKey('test-api-key', explicitMockService);
      
      // 明示的に渡したサービスが使用され、デフォルトは使用されないことを確認
      expect(explicitMockService.fetchWorkflowInfoWithKey).toHaveBeenCalledWith('test-api-key');
      expect(defaultMockService.fetchWorkflowInfoWithKey).not.toHaveBeenCalled();
    });
  });
}); 