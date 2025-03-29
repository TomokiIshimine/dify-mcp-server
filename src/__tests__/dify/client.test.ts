// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { 
  DifyApiClient, 
  HttpClient, 
  HttpResponse, 
  RequestOptions, 
  ResponseParser,
  ApiError 
} from '../../dify/client.js';
import { Config } from '../../config.js';

// モック用のレスポンスパーサー
class MockResponseParser implements ResponseParser {
  parse = jest.fn().mockImplementation(<T>(text: string): T => {
    return {} as T;
  });
}

// モック用のHTTPクライアント
class MockHttpClient implements HttpClient {
  request = jest.fn().mockImplementation(async (url: string, options: RequestOptions): Promise<HttpResponse> => {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{}'
    };
  });
}

// モック用のレスポンス生成
function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: string;
}): HttpResponse {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    text: async () => options.text ?? '{}'
  };
}

// モック用のコンフィグ
class MockConfig {
  getBaseUrl = jest.fn().mockReturnValue('https://api.example.com');
  getApiRequestConfig = jest.fn().mockReturnValue({
    responseMode: 'sync',
    userId: 'test-user'
  });
}

describe('DifyApiClient', () => {
  let mockHttpClient: MockHttpClient;
  let mockResponseParser: MockResponseParser;
  let mockConfig: MockConfig;
  let client: DifyApiClient;
  
  beforeEach(() => {
    // スパイとモックをリセット
    jest.clearAllMocks();
    
    // テスト用のモックを準備
    mockHttpClient = new MockHttpClient();
    mockResponseParser = new MockResponseParser();
    mockConfig = new MockConfig();
    
    // テスト対象のインスタンスを作成
    client = new DifyApiClient(
      mockConfig as unknown as Config,
      mockHttpClient,
      mockResponseParser
    );
    
    // コンソールエラーをモック化してテスト出力をクリーンに保つ
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  describe('fetchInfo', () => {
    it('正常なレスポンスを正しく処理すること', async () => {
      // モックレスポンスを設定
      const mockResponseText = JSON.stringify({ name: 'test-workflow', description: 'test description' });
      const mockHttpResponse = createMockResponse({ text: mockResponseText });
      
      // HTTPクライアントのモック実装を設定
      mockHttpClient.request.mockResolvedValueOnce(mockHttpResponse);
      
      // パーサーのモック実装を設定
      const expectedResult = { name: 'test-workflow', description: 'test description' };
      mockResponseParser.parse.mockReturnValueOnce(expectedResult);
      
      // テスト実行
      const result = await client.fetchInfo('test-api-key');
      
      // 検証
      expect(mockConfig.getBaseUrl).toHaveBeenCalled();
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        'https://api.example.com/info',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }
        })
      );
      expect(mockResponseParser.parse).toHaveBeenCalledWith(mockResponseText);
      expect(result).toEqual(expectedResult);
    });
    
    it('HTTPエラーの場合に適切なエラーをスローすること', async () => {
      // エラーレスポンスを設定
      const mockErrorResponse = createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: 'Unauthorized access'
      });
      
      // HTTPクライアントのモック実装を設定
      mockHttpClient.request.mockResolvedValueOnce(mockErrorResponse);
      
      // テスト実行とエラー検証
      await expect(client.fetchInfo('invalid-api-key')).rejects.toThrowError(ApiError);
      
      // 2つ目のテストの設定
      mockHttpClient.request.mockResolvedValueOnce(mockErrorResponse);
      
      await expect(client.fetchInfo('invalid-api-key')).rejects.toMatchObject({
        statusCode: 401,
        statusText: 'Unauthorized',
        endpoint: '/info'
      });
    });
    
    it('パースエラーの場合に適切なエラーをスローすること', async () => {
      // 正常なHTTPレスポンスを設定
      const mockHttpResponse = createMockResponse({ text: 'invalid-json' });
      
      // HTTPクライアントのモック実装を設定
      mockHttpClient.request.mockResolvedValueOnce(mockHttpResponse);
      
      // パーサーがエラーをスローするように設定
      mockResponseParser.parse.mockImplementationOnce(() => {
        throw new Error('JSON parse error');
      });
      
      // テスト実行とエラー検証
      await expect(client.fetchInfo('test-api-key')).rejects.toThrowError(
        'Failed to parse /info API response: Error: JSON parse error'
      );
    });
  });
  
  describe('fetchParameters', () => {
    it('正常なレスポンスを正しく処理すること', async () => {
      // モックレスポンスを設定
      const mockResponseText = JSON.stringify({ variables: [{ name: 'input', type: 'string' }] });
      const mockHttpResponse = createMockResponse({ text: mockResponseText });
      
      // HTTPクライアントのモック実装を設定
      mockHttpClient.request.mockResolvedValueOnce(mockHttpResponse);
      
      // パーサーのモック実装を設定
      const expectedResult = { variables: [{ name: 'input', type: 'string' }] };
      mockResponseParser.parse.mockReturnValueOnce(expectedResult);
      
      // テスト実行
      const result = await client.fetchParameters('test-api-key');
      
      // 検証
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        'https://api.example.com/parameters',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }
        })
      );
      expect(mockResponseParser.parse).toHaveBeenCalledWith(mockResponseText);
      expect(result).toEqual(expectedResult);
    });
    
    it('HTTPエラーの場合に適切なエラーをスローすること', async () => {
      // エラーレスポンスを設定
      const mockErrorResponse = createMockResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: 'Workflow not found'
      });
      
      // HTTPクライアントのモック実装を設定
      mockHttpClient.request.mockResolvedValueOnce(mockErrorResponse);
      
      // テスト実行とエラー検証
      await expect(client.fetchParameters('test-api-key')).rejects.toMatchObject({
        statusCode: 404,
        statusText: 'Not Found',
        endpoint: '/parameters'
      });
    });
  });
  
  describe('runWorkflow', () => {
    it('正常なレスポンスを正しく処理すること', async () => {
      // モックレスポンスを設定
      const mockResponseText = JSON.stringify({ result: { answer: 'workflow response' } });
      const mockHttpResponse = createMockResponse({ text: mockResponseText });
      
      // HTTPクライアントのモック実装を設定
      mockHttpClient.request.mockResolvedValueOnce(mockHttpResponse);
      
      // パーサーのモック実装を設定
      const expectedResult = { result: { answer: 'workflow response' } };
      mockResponseParser.parse.mockReturnValueOnce(expectedResult);
      
      // テスト用のパラメータ
      const params = { prompt: 'test prompt' };
      
      // テスト実行
      const result = await client.runWorkflow('test-api-key', params);
      
      // 検証
      expect(mockHttpClient.request).toHaveBeenCalledWith(
        'https://api.example.com/workflows/run',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: params,
            response_mode: 'sync',
            user: 'test-user'
          })
        })
      );
      expect(mockResponseParser.parse).toHaveBeenCalledWith(mockResponseText);
      expect(result).toEqual(expectedResult);
    });
    
    it('HTTPエラーの場合に適切なエラーをスローすること', async () => {
      // エラーレスポンスを設定
      const mockErrorResponse = createMockResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: 'Workflow execution failed'
      });
      
      // HTTPクライアントのモック実装を設定
      mockHttpClient.request.mockResolvedValueOnce(mockErrorResponse);
      
      // テスト実行とエラー検証
      await expect(client.runWorkflow('test-api-key', { prompt: 'test' })).rejects.toMatchObject({
        statusCode: 500,
        statusText: 'Internal Server Error',
        endpoint: '/workflows/run'
      });
    });
  });
  
  describe('APIキーのマスク処理', () => {
    it('短いAPIキーを正しくマスクすること', async () => {
      // HTTPエラーを設定して、マスク処理をトリガー
      const mockErrorResponse = createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      
      mockHttpClient.request.mockResolvedValueOnce(mockErrorResponse);
      
      // APIキーが短い場合
      const shortApiKey = '1234';
      
      // エラーをキャッチして、console.errorの呼び出しを検証
      try {
        await client.fetchInfo(shortApiKey);
      } catch (error) {
        // エラーは期待通り
      }
      
      // console.errorが呼ばれ、APIキーがマスクされていることを確認
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('API Key (masked): ********')
      );
    });
    
    it('長いAPIキーを正しくマスクすること', async () => {
      // HTTPエラーを設定して、マスク処理をトリガー
      const mockErrorResponse = createMockResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      
      mockHttpClient.request.mockResolvedValueOnce(mockErrorResponse);
      
      // APIキーが長い場合
      const longApiKey = '1234567890abcdef';
      
      // エラーをキャッチして、console.errorの呼び出しを検証
      try {
        await client.fetchInfo(longApiKey);
      } catch (error) {
        // エラーは期待通り
      }
      
      // console.errorが呼ばれ、APIキーがマスクされていることを確認
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('API Key (masked): 1234...cdef')
      );
    });
  });
}); 