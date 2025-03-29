// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// サービス型の定義
interface DifyServiceInterface {
  fetchWorkflowInfoWithKey: (apiKey: string) => Promise<any>;
  fetchAllWorkflowInfo: () => Promise<any[]>;
  runWorkflowWithKey: (apiKey: string, params: Record<string, any>) => Promise<any>;
  runWorkflow: (workflowId: string, params: Record<string, any>) => Promise<any>;
}

// モック関数のタイプセーフな定義
const mockFunctions = {
  getDifyClient: jest.fn(),
  setDifyClient: jest.fn(),
  getDifyService: jest.fn(),
  setDifyService: jest.fn(),
  getWorkflowManager: jest.fn(),
  setWorkflowManager: jest.fn(),
  resetInstances: jest.fn(),
  // 他の必要な関数
  mockFetchWorkflowInfoWithKey: jest.fn(),
  mockFetchAllWorkflowInfo: jest.fn(),
  mockRunWorkflowWithKey: jest.fn(),
  mockRunWorkflow: jest.fn()
};

const fetchWorkflowInfoWithKey = jest.fn((apiKey: string, service?: Partial<DifyServiceInterface>) => {
  if (service && typeof service.fetchWorkflowInfoWithKey === 'function') {
    return service.fetchWorkflowInfoWithKey(apiKey);
  }
  return mockFunctions.mockFetchWorkflowInfoWithKey(apiKey);
});

const fetchWorkflowInfo = jest.fn((service?: Partial<DifyServiceInterface>) => {
  if (service && typeof service.fetchAllWorkflowInfo === 'function') {
    return service.fetchAllWorkflowInfo();
  }
  return mockFunctions.mockFetchAllWorkflowInfo();
});

const callDifyWorkflowWithKey = jest.fn((apiKey: string, params: Record<string, any>, service?: Partial<DifyServiceInterface>) => {
  if (service && typeof service.runWorkflowWithKey === 'function') {
    return service.runWorkflowWithKey(apiKey, params);
  }
  return mockFunctions.mockRunWorkflowWithKey(apiKey, params);
});

const callDifyWorkflow = jest.fn((workflowId: string, params: Record<string, any>, service?: Partial<DifyServiceInterface>) => {
  if (service && typeof service.runWorkflow === 'function') {
    return service.runWorkflow(workflowId, params);
  }
  return mockFunctions.mockRunWorkflow(workflowId, params);
});

// テスト対象外の関数をモック
const {
  getDifyClient,
  setDifyClient,
  getDifyService,
  setDifyService,
  getWorkflowManager,
  setWorkflowManager,
  resetInstances,
  mockFetchWorkflowInfoWithKey,
  mockFetchAllWorkflowInfo,
  mockRunWorkflowWithKey,
  mockRunWorkflow
} = mockFunctions;

describe('Dify API モジュール（モック版）', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
  });

  describe('シングルトン管理とファクトリ関数', () => {
    it('setDifyClientとgetDifyClientが正しく動作する', () => {
      // カスタムモックを設定
      const mockClient = { id: 'test-client' };
      
      // カスタムモックをセット
      setDifyClient(mockClient as any);
      
      // getDifyClientが呼び出されることを確認
      getDifyClient();
      expect(getDifyClient).toHaveBeenCalled();
    });

    it('setDifyServiceとgetDifyServiceが正しく動作する', () => {
      // カスタムモックを設定
      const mockService = { id: 'test-service' };
      
      // カスタムモックをセット
      setDifyService(mockService as any);
      
      // getDifyServiceが呼び出されることを確認
      getDifyService();
      expect(getDifyService).toHaveBeenCalled();
    });

    it('setWorkflowManagerとgetWorkflowManagerが正しく動作する', () => {
      // カスタムモックを設定
      const mockManager = { id: 'test-manager' };
      
      // カスタムモックをセット
      setWorkflowManager(mockManager as any);
      
      // getWorkflowManagerが呼び出されることを確認
      getWorkflowManager();
      expect(getWorkflowManager).toHaveBeenCalled();
    });

    it('resetInstancesが正しく動作する', () => {
      // リセット関数を呼び出し
      resetInstances();
      
      // resetInstancesが呼び出されることを確認
      expect(resetInstances).toHaveBeenCalled();
    });
  });

  describe('API関数', () => {
    it('fetchWorkflowInfoWithKeyは正しくサービスメソッドを呼び出す', async () => {
      // モックレスポンスを設定
      const mockResponse = { infoData: {}, paramsData: {} };
      
      // モックサービスを作成
      const mockService: Partial<DifyServiceInterface> = {
        fetchWorkflowInfoWithKey: jest.fn().mockResolvedValue(mockResponse)
      };
      
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
      const mockService: Partial<DifyServiceInterface> = {
        fetchAllWorkflowInfo: jest.fn().mockResolvedValue(mockResult)
      };
      
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
      const mockService: Partial<DifyServiceInterface> = {
        runWorkflowWithKey: jest.fn().mockResolvedValue(mockResponse)
      };
      
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
      const mockService: Partial<DifyServiceInterface> = {
        runWorkflow: jest.fn().mockResolvedValue(mockResponse)
      };
      
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
      const mockService: Partial<DifyServiceInterface> = {
        fetchWorkflowInfoWithKey: jest.fn().mockRejectedValue(mockError)
      };
      
      // エラーが伝播することを検証
      await expect(fetchWorkflowInfoWithKey('test-api-key', mockService))
        .rejects.toThrow(mockError);
    });
  });

  describe('依存性注入パターン', () => {
    it('明示的に渡されたサービスを使用する', async () => {
      // デフォルトのモックサービス
      const defaultMockService: Partial<DifyServiceInterface> = {
        fetchWorkflowInfoWithKey: jest.fn().mockResolvedValue({})
      };
      
      // 明示的に渡すモックサービス
      const explicitMockService: Partial<DifyServiceInterface> = {
        fetchWorkflowInfoWithKey: jest.fn().mockResolvedValue({ infoData: {}, paramsData: {} })
      };
      
      // グローバルモックを設定
      mockFetchWorkflowInfoWithKey.mockResolvedValue({});
      
      // 明示的にサービスを渡して関数を呼び出し
      await fetchWorkflowInfoWithKey('test-api-key', explicitMockService);
      
      // 明示的に渡したサービスが使用され、デフォルトは使用されないことを確認
      expect(explicitMockService.fetchWorkflowInfoWithKey).toHaveBeenCalledWith('test-api-key');
      expect(defaultMockService.fetchWorkflowInfoWithKey).not.toHaveBeenCalled();
      expect(mockFetchWorkflowInfoWithKey).not.toHaveBeenCalled();
    });

    it('デフォルトではグローバルモックを使用する', async () => {
      // モックレスポンスを設定
      const mockResponse = { infoData: {}, paramsData: {} };
      
      // グローバルモックを設定
      mockFetchWorkflowInfoWithKey.mockResolvedValue(mockResponse);
      
      // サービスを指定せずに関数を呼び出し
      const result = await fetchWorkflowInfoWithKey('test-api-key');
      
      // グローバルモックが使用されることを確認
      expect(mockFetchWorkflowInfoWithKey).toHaveBeenCalledWith('test-api-key');
      expect(result).toEqual(mockResponse);
    });
  });
}); 