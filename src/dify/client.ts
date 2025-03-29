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

// Dify APIクライアントのインターフェース
export interface DifyClient {
  fetchInfo(apiKey: string): Promise<DifyInfoResponse>;
  fetchParameters(apiKey: string): Promise<DifyParametersResponse>;
  runWorkflow(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse>;
}

// APIクライアントの実装
export class DifyApiClient implements DifyClient {
  private readonly config: Config;
  
  constructor(config: Config) {
    this.config = config;
  }
  
  // APIキーをマスクする（ログ出力用）
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return "********";
    }
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  }
  
  // レスポンスエラーを処理
  private async handleApiResponseError(response: FetchResponse, endpoint: string, apiKey: string): Promise<never> {
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
  
  // /info エンドポイントにリクエスト
  async fetchInfo(apiKey: string): Promise<DifyInfoResponse> {
    const baseUrl = this.config.getBaseUrl();
    
    const infoResponse = await fetch(`${baseUrl}/info`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!infoResponse.ok) {
      await this.handleApiResponseError(infoResponse, "/info", apiKey);
    }

    const infoDataText = await infoResponse.text();
    
    try {
      return JSON.parse(infoDataText) as DifyInfoResponse;
    } catch (parseError) {
      this.handleParseError(parseError, "/info");
    }
  }
  
  // /parameters エンドポイントにリクエスト
  async fetchParameters(apiKey: string): Promise<DifyParametersResponse> {
    const baseUrl = this.config.getBaseUrl();
    
    const paramsResponse = await fetch(`${baseUrl}/parameters`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!paramsResponse.ok) {
      await this.handleApiResponseError(paramsResponse, "/parameters", apiKey);
    }

    const paramsDataText = await paramsResponse.text();
    
    try {
      return JSON.parse(paramsDataText) as DifyParametersResponse;
    } catch (parseError) {
      this.handleParseError(parseError, "/parameters");
    }
  }
  
  // /workflows/run エンドポイントにリクエスト
  async runWorkflow(apiKey: string, params: Record<string, any>): Promise<DifyWorkflowResponse> {
    const baseUrl = this.config.getBaseUrl();
    const apiConfig = this.config.getApiRequestConfig();
    
    const response = await fetch(`${baseUrl}/workflows/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: params,
        response_mode: apiConfig.responseMode,
        user: apiConfig.userId
      })
    });
    
    if (!response.ok) {
      await this.handleApiResponseError(response, "/workflows/run", apiKey);
    }
    
    const resultText = await response.text();
    
    try {
      return JSON.parse(resultText) as DifyWorkflowResponse;
    } catch (parseError) {
      console.error("Failed to parse workflow execution response:", parseError);
      console.error("Response text:", resultText);
      this.handleParseError(parseError, "/workflows/run");
    }
  }
} 