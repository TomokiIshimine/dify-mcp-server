import fetch, { Response as FetchResponse } from "node-fetch";
import { DifyInfoResponse, DifyParametersResponse, DifyWorkflowResponse } from "../types.js";
import { Config } from "../config.js";

// APIリクエストに関するエラークラス
export class ApiError extends Error {
  statusCode: number;
  statusText: string;
  endpoint: string;
  
  constructor(message: string, statusCode: number, statusText: string, endpoint: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.endpoint = endpoint;
  }
}

// HTTP通信インターフェース（テスト容易性のため抽象化）
export interface HttpClient {
  request(url: string, options: RequestOptions): Promise<HttpResponse>;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
}

// Dify APIクライアントのインターフェース
export interface DifyClient {
  fetchInfo(apiKey: string): Promise<DifyInfoResponse>;
  fetchParameters(apiKey: string): Promise<DifyParametersResponse>;
  runWorkflow(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse>;
}

// レスポンスパーサーインターフェース
export interface ResponseParser {
  parse<T>(text: string): T;
}

// 標準のレスポンスパーサー実装
export class JsonResponseParser implements ResponseParser {
  parse<T>(text: string): T {
    return JSON.parse(text) as T;
  }
}

// 標準のHTTPクライアント実装
export class FetchHttpClient implements HttpClient {
  async request(url: string, options: RequestOptions): Promise<HttpResponse> {
    const response = await fetch(url, options as any);
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: async () => response.text()
    };
  }
}

// APIクライアントの実装
export class DifyApiClient implements DifyClient {
  private readonly config: Config;
  private readonly httpClient: HttpClient;
  private readonly responseParser: ResponseParser;
  
  constructor(
    config: Config, 
    httpClient: HttpClient = new FetchHttpClient(),
    responseParser: ResponseParser = new JsonResponseParser()
  ) {
    this.config = config;
    this.httpClient = httpClient;
    this.responseParser = responseParser;
  }
  
  // APIキーをマスクする（ログ出力用）
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return "********";
    }
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  }
  
  // レスポンスエラーを処理
  private async handleApiResponseError(response: HttpResponse, endpoint: string, apiKey: string): Promise<never> {
    const errorText = await response.text().catch(() => "Could not retrieve response text");
    console.error(`${endpoint} API error code: ${response.status}`);
    console.error(`${endpoint} API error message: ${response.statusText}`);
    console.error(`${endpoint} API error response: ${errorText}`);
    console.error(`API Key (masked): ${this.maskApiKey(apiKey)}`);
    
    throw new ApiError(
      `${endpoint} API error: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      endpoint
    );
  }
  
  // JSONパースエラーを処理
  private handleParseError(error: unknown, endpoint: string): never {
    console.error(`${endpoint} JSON parse error:`, error);
    if (error instanceof Error) {
      console.error(`Error stack: ${error.stack}`);
    }
    throw new Error(`Failed to parse ${endpoint} API response: ${error}`);
  }

  // 共通のリクエストヘッダーを生成
  private createHeaders(apiKey: string): Record<string, string> {
    return {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };
  }

  // APIエンドポイントURLを生成
  private getEndpointUrl(path: string): string {
    const baseUrl = this.config.getBaseUrl();
    return `${baseUrl}${path}`;
  }
  
  // /info エンドポイントにリクエスト
  async fetchInfo(apiKey: string): Promise<DifyInfoResponse> {
    const url = this.getEndpointUrl("/info");
    const headers = this.createHeaders(apiKey);
    
    const infoResponse = await this.httpClient.request(url, { headers });

    if (!infoResponse.ok) {
      await this.handleApiResponseError(infoResponse, "/info", apiKey);
    }

    const infoDataText = await infoResponse.text();
    
    try {
      return this.responseParser.parse<DifyInfoResponse>(infoDataText);
    } catch (parseError) {
      this.handleParseError(parseError, "/info");
    }
  }
  
  // /parameters エンドポイントにリクエスト
  async fetchParameters(apiKey: string): Promise<DifyParametersResponse> {
    const url = this.getEndpointUrl("/parameters");
    const headers = this.createHeaders(apiKey);
    
    const paramsResponse = await this.httpClient.request(url, { headers });

    if (!paramsResponse.ok) {
      await this.handleApiResponseError(paramsResponse, "/parameters", apiKey);
    }

    const paramsDataText = await paramsResponse.text();
    
    try {
      return this.responseParser.parse<DifyParametersResponse>(paramsDataText);
    } catch (parseError) {
      this.handleParseError(parseError, "/parameters");
    }
  }
  
  // /workflows/run エンドポイントにリクエスト
  async runWorkflow(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
    const url = this.getEndpointUrl("/workflows/run");
    const headers = this.createHeaders(apiKey);
    const apiConfig = this.config.getApiRequestConfig();
    
    const body = JSON.stringify({
      inputs: params,
      response_mode: apiConfig.responseMode,
      user: apiConfig.userId
    });
    
    const response = await this.httpClient.request(url, {
      method: "POST",
      headers,
      body
    });
    
    if (!response.ok) {
      await this.handleApiResponseError(response, "/workflows/run", apiKey);
    }
    
    const resultText = await response.text();
    
    try {
      return this.responseParser.parse<DifyWorkflowResponse>(resultText);
    } catch (parseError) {
      console.error("Failed to parse workflow execution response:", parseError);
      console.error("Response text:", resultText);
      this.handleParseError(parseError, "/workflows/run");
    }
  }
} 