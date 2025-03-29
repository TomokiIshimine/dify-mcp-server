// Configuration management for the application

/**
 * 設定エラーのハンドリング関数
 */
export function handleConfigError(message: string): never {
  console.error(`Configuration error: ${message}`);
  process.exit(1);
}

/**
 * アプリケーション設定
 */
export class AppConfig {
  // Dify API 設定
  static readonly BASE_URL = process.env.DIFY_BASE_URL;
  static readonly API_KEYS: string[] = [];
  
  // サーバー設定
  static readonly SERVER_NAME = process.env.SERVER_NAME || "dify-workflow-mcp-server";
  static readonly SERVER_VERSION = process.env.SERVER_VERSION || "1.0.0";
  
  // API 呼び出し設定
  static readonly DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || "test-abc";
  static readonly DEFAULT_RESPONSE_MODE = "blocking";
  
  // 初期化済みフラグ
  private static initialized = false;
  
  /**
   * 設定の初期化と検証
   */
  static initialize(): void {
    if (this.initialized) return;
    
    // API キーの処理
    const apiKeys = process.env.DIFY_API_KEYS ? 
      process.env.DIFY_API_KEYS.split(',').map(key => key.trim()) : 
      [];
    
    // レガシーAPIキーの処理（後方互換性のため）
    if (process.env.DIFY_API_KEY && apiKeys.length === 0) {
      apiKeys.push(process.env.DIFY_API_KEY);
    }
    
    this.API_KEYS.push(...apiKeys);
    this.initialized = true;
  }
  
  /**
   * 設定の検証
   */
  static validate(): boolean {
    this.initialize();
    
    if (!this.BASE_URL) {
      console.error("Environment variable DIFY_BASE_URL is not set");
      return false;
    }
    
    if (this.API_KEYS.length === 0) {
      console.error("No API keys found. Please set either DIFY_API_KEY or DIFY_API_KEYS environment variable.");
      return false;
    }
    
    return true;
  }
  
  /**
   * 設定を厳格に検証し、問題があれば処理を停止
   */
  static validateStrict(): void {
    if (!this.validate()) {
      handleConfigError("Invalid configuration. Please check environment variables.");
    }
  }
  
  /**
   * サーバー設定の取得
   */
  static getServerConfig() {
    return {
      name: this.SERVER_NAME,
      version: this.SERVER_VERSION
    };
  }
  
  /**
   * API リクエスト設定の取得
   */
  static getApiRequestConfig() {
    return {
      responseMode: this.DEFAULT_RESPONSE_MODE,
      userId: this.DEFAULT_USER_ID
    };
  }
}

// 設定を初期化
AppConfig.initialize();

// Map to store the mapping between workflow names and API keys
export const workflowApiKeyMap = new Map<string, string>();

// バックワードコンパティビリティのための関数
export const DIFY_BASE_URL = AppConfig.BASE_URL;
export const DIFY_API_KEYS = AppConfig.API_KEYS;

// バックワードコンパティビリティのための関数
export function validateConfig(): boolean {
  return AppConfig.validate();
} 