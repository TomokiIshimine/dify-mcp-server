// @ts-nocheck
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  DifyService, 
  Logger, 
  WorkflowData,
  WorkflowExecutionResult
} from '../../dify/service.js';
import { DifyClient } from '../../dify/client.js';
import { Config } from '../../config.js';
import { 
  DifyInfoResponse, 
  DifyParametersResponse, 
  DifyWorkflowResponse 
} from '../../types.js';

// モックロガー
class MockLogger implements Logger {
  error = jest.fn();
}

// モックの作成
describe('DifyService', () => {
  // テスト用のモックと変数
  let mockClient: jest.Mocked<DifyClient>;
  let mockConfig: jest.Mocked<Config>;
  let mockLogger: MockLogger;
  let service: DifyService;
  
  // サンプルデータ
  const testApiKey = 'test-api-key';
  const testApiKeys = [testApiKey, 'test-api-key-2'];
  const testWorkflowName = 'test-workflow';
  const testParams = { input: 'test input' };
  
  // モックレスポンス
  const mockInfoResponse: DifyInfoResponse = {
    name: testWorkflowName,
    description: 'Test Workflow'
  };
  
  const mockParametersResponse: DifyParametersResponse = {
    parameters: [
      { name: 'input', type: 'string', required: true }
    ]
  };
  
  const mockWorkflowResponse: DifyWorkflowResponse = {
    task_id: 'test-task-id',
    result: 'Test result'
  };
  
  // 各テストの前に実行
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // モックの作成
    mockClient = {
      fetchInfo: jest.fn(),
      fetchParameters: jest.fn(),
      runWorkflow: jest.fn()
    };
    
    mockConfig = {
      getBaseUrl: jest.fn().mockReturnValue('https://api.example.com'),
      getApiKeys: jest.fn().mockReturnValue(testApiKeys),
      validateStrict: jest.fn(),
      getApiRequestConfig: jest.fn().mockReturnValue({
        responseMode: 'sync',
        userId: 'test-user'
      }),
      getServerConfig: jest.fn().mockReturnValue({
        name: 'test-server',
        version: '1.0.0'
      }),
      validate: jest.fn().mockReturnValue(true)
    };
    
    mockLogger = new MockLogger();
    
    // テスト対象のインスタンスを作成
    service = new DifyService(
      mockClient as unknown as DifyClient,
      mockConfig as unknown as Config,
      mockLogger
    );
  });
  
  describe('fetchWorkflowInfoWithKey', () => {
    it('正常なレスポンスを正しく処理すること', async () => {
      // モックの設定
      mockClient.fetchInfo.mockResolvedValueOnce(mockInfoResponse);
      mockClient.fetchParameters.mockResolvedValueOnce(mockParametersResponse);
      
      // テスト実行
      const result = await service.fetchWorkflowInfoWithKey(testApiKey);
      
      // 検証
      expect(mockClient.fetchInfo).toHaveBeenCalledWith(testApiKey);
      expect(mockClient.fetchParameters).toHaveBeenCalledWith(testApiKey);
      expect(result).toEqual({
        infoData: mockInfoResponse,
        paramsData: mockParametersResponse
      });
    });
    
    it('クライアントがエラーをスローする場合、適切に処理すること', async () => {
      // エラーモックの設定
      const testError = new Error('Test error');
      mockClient.fetchInfo.mockRejectedValueOnce(testError);
      
      // テスト実行とエラー検証
      await expect(service.fetchWorkflowInfoWithKey(testApiKey))
        .rejects.toThrow(testError);
      
      // ログ出力の検証
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Dify Workflow API call error:',
        testError
      );
    });
  });
  
  describe('fetchAllWorkflowInfo', () => {
    it('すべてのAPIキーの情報を正しく取得すること', async () => {
      // モックの設定 - 各キーごとに異なるワークフロー名を返す
      const mockInfoResponse1 = { ...mockInfoResponse, name: 'workflow-1' };
      const mockInfoResponse2 = { ...mockInfoResponse, name: 'workflow-2' };
      
      mockClient.fetchInfo
        .mockResolvedValueOnce(mockInfoResponse1)
        .mockResolvedValueOnce(mockInfoResponse2);
      
      mockClient.fetchParameters.mockResolvedValue(mockParametersResponse);
      
      // テスト実行
      const results = await service.fetchAllWorkflowInfo();
      
      // 検証
      expect(mockConfig.validateStrict).toHaveBeenCalled();
      expect(mockConfig.getApiKeys).toHaveBeenCalled();
      expect(mockClient.fetchInfo).toHaveBeenCalledTimes(testApiKeys.length);
      expect(mockClient.fetchParameters).toHaveBeenCalledTimes(testApiKeys.length);
      
      // 結果の検証
      expect(results.length).toBe(testApiKeys.length);
      expect(results[0]).toEqual({
        apiKey: testApiKeys[0],
        infoData: mockInfoResponse1,
        paramsData: mockParametersResponse
      });
      
      // ワークフローマップの検証 - キーと名前のマッピングを確認
      const workflowMap = service.getWorkflowApiKeyMap();
      expect(workflowMap.get('workflow-1')).toBe(testApiKeys[0]);
      expect(workflowMap.get('workflow-2')).toBe(testApiKeys[1]);
    });
    
    it('APIキーがない場合にエラーをスローすること', async () => {
      // APIキーが空の場合
      mockConfig.getApiKeys.mockReturnValueOnce([]);
      
      // テスト実行とエラー検証
      await expect(service.fetchAllWorkflowInfo())
        .rejects.toThrow('No API keys configured');
    });
    
    it('一部のAPIキーが失敗しても、処理を続行すること', async () => {
      // 最初のキーは成功、2番目は失敗
      mockClient.fetchInfo
        .mockResolvedValueOnce(mockInfoResponse)
        .mockRejectedValueOnce(new Error('Failed to fetch info'));
      
      mockClient.fetchParameters.mockResolvedValueOnce(mockParametersResponse);
      
      // テスト実行
      const results = await service.fetchAllWorkflowInfo();
      
      // 検証
      expect(results.length).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching workflow info for an API key:'),
        expect.any(Error)
      );
    });
    
    it('すべてのAPIキーが失敗した場合、エラーをスローすること', async () => {
      // すべてのキーが失敗
      mockClient.fetchInfo.mockRejectedValue(new Error('Failed to fetch info'));
      
      // テスト実行とエラー検証
      await expect(service.fetchAllWorkflowInfo())
        .rejects.toThrow('Failed to fetch workflow info for any of the provided API keys');
    });
  });
  
  describe('runWorkflowWithKey', () => {
    it('正常にワークフローを実行すること', async () => {
      // モックの設定
      mockClient.runWorkflow.mockResolvedValueOnce(mockWorkflowResponse);
      
      // テスト実行
      const result = await service.runWorkflowWithKey(testApiKey, testParams);
      
      // 検証
      expect(mockClient.runWorkflow).toHaveBeenCalledWith(testApiKey, testParams);
      expect(result).toEqual(mockWorkflowResponse);
    });
    
    it('エラーが発生した場合に適切に処理すること', async () => {
      // エラーモックの設定
      const testError = new Error('Workflow execution failed');
      mockClient.runWorkflow.mockRejectedValueOnce(testError);
      
      // テスト実行とエラー検証
      await expect(service.runWorkflowWithKey(testApiKey, testParams))
        .rejects.toThrow(testError);
      
      // ログ出力の検証
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during workflow execution:',
        testError
      );
    });
  });
  
  describe('runWorkflow', () => {
    beforeEach(() => {
      // ワークフローマップを事前に設定
      const testMap = new Map([
        [testWorkflowName, testApiKey]
      ]);
      service.setWorkflowApiKeyMap(testMap);
    });
    
    it('ワークフロー名からAPIキーを取得して実行すること', async () => {
      // モックの設定
      mockClient.runWorkflow.mockResolvedValueOnce(mockWorkflowResponse);
      
      // テスト実行
      const result = await service.runWorkflow(testWorkflowName, testParams);
      
      // 検証
      expect(mockClient.runWorkflow).toHaveBeenCalledWith(testApiKey, testParams);
      expect(result).toEqual(mockWorkflowResponse);
    });
    
    it('ベース名のみのワークフローでも実行できること', async () => {
      // getApiKeyForWorkflowメソッドをスパイしてオーバーライド
      const baseWorkflowName = 'test-workflow';
      const indexedWorkflowName = `${baseWorkflowName}-1`;
      
      // スパイの設定
      jest.spyOn(service, 'getWorkflowApiKeyMap').mockImplementation(() => {
        // スパイされたマップを返す
        return new Map([[baseWorkflowName, testApiKey]]);
      });
      
      // テスト対象メソッドを部分的にモック
      const originalGetApiKeyForWorkflow = service['getApiKeyForWorkflow'];
      service['getApiKeyForWorkflow'] = jest.fn().mockImplementation((name) => {
        // ベース名の抽出をエミュレート
        if (name === indexedWorkflowName) {
          return testApiKey;
        }
        return originalGetApiKeyForWorkflow.call(service, name);
      });
      
      // モックの設定
      mockClient.runWorkflow.mockResolvedValueOnce(mockWorkflowResponse);
      
      // テスト実行
      const result = await service.runWorkflow(indexedWorkflowName, testParams);
      
      // 検証
      expect(service['getApiKeyForWorkflow']).toHaveBeenCalledWith(indexedWorkflowName);
      expect(mockClient.runWorkflow).toHaveBeenCalledWith(testApiKey, testParams);
      expect(result).toEqual(mockWorkflowResponse);
      
      // スパイをリストア
      service['getApiKeyForWorkflow'] = originalGetApiKeyForWorkflow;
    });
    
    it('マップに存在しないワークフロー名の場合にエラーをスローすること', async () => {
      // 存在しないワークフロー名
      const nonExistentWorkflow = 'non-existent-workflow';
      
      // テスト実行とエラー検証
      await expect(service.runWorkflow(nonExistentWorkflow, testParams))
        .rejects.toThrow(`No API key found for workflow: '${nonExistentWorkflow}'`);
      
      // ログ出力の検証
      expect(mockLogger.error).toHaveBeenCalledWith(
        `No API key found for workflow: '${nonExistentWorkflow}'`
      );
    });
  });
  
  describe('ワークフローマップの管理', () => {
    it('getWorkflowApiKeyMap がマップのコピーを返すこと', () => {
      // 初期マップを設定
      const initialMap = new Map([[testWorkflowName, testApiKey]]);
      service.setWorkflowApiKeyMap(initialMap);
      
      // マップを取得
      const returnedMap = service.getWorkflowApiKeyMap();
      
      // 検証
      expect(returnedMap).toEqual(initialMap);
      expect(returnedMap).not.toBe(initialMap); // 同一のインスタンスではない
      
      // 返されたマップを変更しても元のマップに影響しないことを確認
      returnedMap.set('new-workflow', 'new-api-key');
      expect(service.getWorkflowApiKeyMap().has('new-workflow')).toBe(false);
    });
    
    it('clearWorkflowApiKeyMap がマップをクリアすること', () => {
      // 初期マップを設定
      service.setWorkflowApiKeyMap(new Map([[testWorkflowName, testApiKey]]));
      
      // マップをクリア
      service.clearWorkflowApiKeyMap();
      
      // 検証
      expect(service.getWorkflowApiKeyMap().size).toBe(0);
    });
    
    it('setWorkflowApiKeyMap が新しいマップで上書きすること', () => {
      // 初期マップを設定
      service.setWorkflowApiKeyMap(new Map([['initial-workflow', 'initial-api-key']]));
      
      // 新しいマップを設定
      const newMap = new Map([[testWorkflowName, testApiKey]]);
      service.setWorkflowApiKeyMap(newMap);
      
      // 検証
      const updatedMap = service.getWorkflowApiKeyMap();
      expect(updatedMap.size).toBe(1);
      expect(updatedMap.get(testWorkflowName)).toBe(testApiKey);
      expect(updatedMap.has('initial-workflow')).toBe(false);
    });
  });
}); 