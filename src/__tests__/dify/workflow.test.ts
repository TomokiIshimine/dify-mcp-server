import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mock } from 'jest-mock-extended';
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { 
  WorkflowManager, 
  Logger, 
  ConsoleLogger, 
  WorkflowConverter, 
  DefaultWorkflowConverter 
} from '../../dify/workflow.js';
import { DifyService, WorkflowData } from '../../dify/service.js';
import { DifyWorkflowResponse } from '../../types.js';

// テスト用のワークフローデータ
const mockWorkflowData: WorkflowData[] = [
  {
    apiKey: 'test-api-key-1',
    infoData: { 
      name: 'Test Workflow 1',
      description: 'Test Description 1'
    },
    paramsData: {
      parameters: [
        { name: 'param1', type: 'string', required: true }
      ]
    }
  },
  {
    apiKey: 'test-api-key-2',
    infoData: { 
      name: 'Test Workflow 2',
      description: 'Test Description 2'
    },
    paramsData: {
      parameters: [
        { name: 'param2', type: 'number', required: false }
      ]
    }
  }
];

// テスト用のツールデータ
const mockTools: Tool[] = [
  {
    name: 'test-tool-1',
    description: 'Test Tool 1',
    inputSchema: {
      type: 'object',
      properties: {
        param1: { type: 'string' }
      },
      required: ['param1']
    }
  },
  {
    name: 'test-tool-2',
    description: 'Test Tool 2',
    inputSchema: {
      type: 'object',
      properties: {
        param2: { type: 'number' }
      }
    }
  }
];

describe('WorkflowManager', () => {
  let difyService: jest.Mocked<DifyService>;
  let logger: jest.Mocked<Logger>;
  let converter: jest.Mocked<WorkflowConverter>;
  let workflowManager: WorkflowManager;

  beforeEach(() => {
    // 各テスト前にモックをリセット
    difyService = mock<DifyService>();
    logger = mock<Logger>();
    converter = mock<WorkflowConverter>();
    
    // デフォルトのモックレスポンスを設定
    difyService.fetchAllWorkflowInfo.mockResolvedValue(mockWorkflowData);
    converter.convert.mockReturnValue(mockTools);
    
    // テスト対象のインスタンスを作成
    workflowManager = new WorkflowManager(
      difyService,
      logger,
      converter
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('デフォルトのロガーとコンバーターを使用して初期化できる', () => {
      const manager = new WorkflowManager(difyService);
      expect(manager).toBeInstanceOf(WorkflowManager);
    });
    
    it('カスタムロガーとコンバーターを使用して初期化できる', () => {
      const manager = new WorkflowManager(
        difyService,
        logger,
        converter
      );
      expect(manager).toBeInstanceOf(WorkflowManager);
    });
  });

  describe('initialize', () => {
    it('ワークフロー情報を正常に初期化できる', async () => {
      await workflowManager.initialize();
      
      // メソッドが正しく呼び出されたか確認
      expect(difyService.fetchAllWorkflowInfo).toHaveBeenCalledTimes(1);
      expect(converter.convert).toHaveBeenCalledWith(mockWorkflowData);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Successfully initialized 2 workflow tools')
      );
    });
    
    it('ワークフローツールが存在しない場合にエラーを投げる', async () => {
      // 空のツール配列を返すようにモックを設定
      converter.convert.mockReturnValue([]);
      
      // エラーが投げられることを確認
      await expect(workflowManager.initialize()).rejects.toThrow(
        'No workflow tools were generated'
      );
      
      // エラーログが出力されたか確認
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retrieve or convert')
      );
    });
    
    it('サービスがエラーを返した場合に適切に処理する', async () => {
      const testError = new Error('Test service error');
      difyService.fetchAllWorkflowInfo.mockRejectedValue(testError);
      
      // エラーが伝播することを確認
      await expect(workflowManager.initialize()).rejects.toThrow(testError);
      
      // エラーログが出力されたか確認
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retrieve or convert')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message: Test service error')
      );
    });
  });

  describe('getTools', () => {
    it('利用可能なツール一覧を返す', async () => {
      // 初期化
      await workflowManager.initialize();
      
      // ツール一覧を取得
      const tools = workflowManager.getTools();
      
      // 期待される結果と一致するか確認
      expect(tools).toEqual(mockTools);
      expect(tools).not.toBe(mockTools); // 新しい配列インスタンスであることを確認
    });
    
    it('初期化前は空の配列を返す', () => {
      const tools = workflowManager.getTools();
      expect(tools).toEqual([]);
    });
  });

  describe('executeWorkflow', () => {
    const mockParams = { param1: 'test' };
    const mockResponse: DifyWorkflowResponse = {
      data: {
        outputs: { result: 'test result' }
      }
    };
    
    beforeEach(() => {
      difyService.runWorkflow.mockResolvedValue(mockResponse);
    });
    
    it('ワークフローを正常に実行できる', async () => {
      // ワークフローを実行
      const result = await workflowManager.executeWorkflow('test-tool', mockParams);
      
      // サービスメソッドが正しく呼び出されたか確認
      expect(difyService.runWorkflow).toHaveBeenCalledWith('test-tool', mockParams);
      
      // 期待される結果と一致するか確認
      expect(result).toEqual({ result: 'test result' });
    });
    
    it('outputsフィールドがない場合はresultフィールドを返す', async () => {
      const noOutputsResponse: DifyWorkflowResponse = {
        result: 'direct result'
      };
      difyService.runWorkflow.mockResolvedValue(noOutputsResponse);
      
      // ワークフローを実行
      const result = await workflowManager.executeWorkflow('test-tool', mockParams);
      
      // 期待される結果と一致するか確認
      expect(result).toEqual('direct result');
    });
    
    it('outputsもresultもない場合は全体のレスポンスを返す', async () => {
      const fullResponse: DifyWorkflowResponse = {
        task_id: 'task123',
        workflow_run_id: 'run456'
      };
      difyService.runWorkflow.mockResolvedValue(fullResponse);
      
      // ワークフローを実行
      const result = await workflowManager.executeWorkflow('test-tool', mockParams);
      
      // 期待される結果と一致するか確認
      expect(result).toEqual(fullResponse);
    });
    
    it('サービスがエラーを投げた場合にエラーを適切に処理する', async () => {
      const testError = new Error('Test execution error');
      difyService.runWorkflow.mockRejectedValue(testError);
      
      // エラーが伝播することを確認
      await expect(workflowManager.executeWorkflow('test-tool', mockParams))
        .rejects.toThrow(testError);
      
      // エラーログが出力されたか確認
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error executing tool 'test-tool'")
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message: Test execution error')
      );
    });
    
    it('エラーがErrorインスタンスでない場合は適切にラップする', async () => {
      const nonErrorObj = { code: 500, message: 'Server error' };
      difyService.runWorkflow.mockRejectedValue(nonErrorObj);
      
      // エラーが伝播することを確認
      await expect(workflowManager.executeWorkflow('test-tool', mockParams))
        .rejects.toThrow(`Unknown error occurred while executing tool 'test-tool'`);
      
      // エラーログが出力されたか確認
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error executing tool 'test-tool'")
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error type')
      );
    });
  });
});

describe('ConsoleLogger', () => {
  let originalConsoleError: typeof console.error;
  
  beforeEach(() => {
    // 元のconsole.errorを保存
    originalConsoleError = console.error;
    // console.errorをモック
    console.error = jest.fn();
  });
  
  afterEach(() => {
    // テスト後に元のconsole.errorを復元
    console.error = originalConsoleError;
  });
  
  it('console.errorにメッセージを渡す', () => {
    const logger = new ConsoleLogger();
    logger.error('Test message');
    expect(console.error).toHaveBeenCalledWith('Test message');
  });
  
  it('追加の引数を正しく処理する', () => {
    const logger = new ConsoleLogger();
    logger.error('Test message with %s and %d', 'string', 42);
    expect(console.error).toHaveBeenCalledWith('Test message with %s and %d', 'string', 42);
  });
});

describe('DefaultWorkflowConverter', () => {
  // Converterの実装テスト
  it('WorkflowConverterを実装している', () => {
    const converter = new DefaultWorkflowConverter();
    expect(converter).toBeInstanceOf(DefaultWorkflowConverter);
    expect(typeof converter.convert).toBe('function');
  });
  
  // モック化の代わりに、DefaultWorkflowConverterのプロトタイプをスパイして動作を確認
  it('convertメソッドを持つ', () => {
    const convertSpy = jest.spyOn(DefaultWorkflowConverter.prototype, 'convert')
      .mockReturnValue(mockTools);
    
    const converter = new DefaultWorkflowConverter();
    const result = converter.convert(mockWorkflowData);
    
    expect(convertSpy).toHaveBeenCalledWith(mockWorkflowData);
    expect(result).toEqual(mockTools);
    
    // スパイをリストア
    convertSpy.mockRestore();
  });
}); 