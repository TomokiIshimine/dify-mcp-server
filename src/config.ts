// Configuration management for the application

/**
 * 設定エラーのハンドリング関数
 */
export function handleConfigError(message: string): never {
  console.error(`Configuration error: ${message}`);
  
  // テスト中は終了せずに例外をスローする
  if (process.env.NODE_ENV === 'test') {
    throw new Error(message);
  }
  
  process.exit(1);
}

/**
 * 設定インターフェース
 */
export interface Config {
  getBaseUrl(): string;
  getApiKeys(): string[];
  getServerConfig(): { name: string; version: string };
  getApiRequestConfig(): { responseMode: string; userId: string };
  validate(): boolean;
  validateStrict(): void;
}

/**
 * 環境変数からの設定読み込みクラス
 */
export class EnvConfig implements Config {
  private readonly baseUrl: string;
  private readonly apiKeys: string[];
  private readonly serverName: string;
  private readonly serverVersion: string;
  private readonly userId: string;
  private readonly responseMode: string;
  
  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = env.DIFY_BASE_URL || '';
    
    // API キーの処理
    const apiKeys = env.DIFY_API_KEYS ? 
      env.DIFY_API_KEYS.split(',').map(key => key.trim()) : 
      [];
    
    // レガシーAPIキーの処理（後方互換性のため）
    if (env.DIFY_API_KEY && apiKeys.length === 0) {
      apiKeys.push(env.DIFY_API_KEY);
    }
    
    this.apiKeys = apiKeys;
    this.serverName = env.SERVER_NAME || "dify-workflow-mcp-server";
    this.serverVersion = env.SERVER_VERSION || "1.0.0";
    this.userId = env.DEFAULT_USER_ID || "test-abc";
    this.responseMode = "blocking";
  }
  
  getBaseUrl(): string {
    return this.baseUrl;
  }
  
  getApiKeys(): string[] {
    return this.apiKeys;
  }
  
  getServerConfig() {
    return {
      name: this.serverName,
      version: this.serverVersion
    };
  }
  
  getApiRequestConfig() {
    return {
      responseMode: this.responseMode,
      userId: this.userId
    };
  }
  
  /**
   * 設定の検証
   */
  validate(): boolean {
    if (!this.baseUrl) {
      console.error("Environment variable DIFY_BASE_URL is not set");
      return false;
    }
    
    if (this.apiKeys.length === 0) {
      console.error("No API keys found. Please set either DIFY_API_KEY or DIFY_API_KEYS environment variable.");
      return false;
    }
    
    return true;
  }
  
  /**
   * 設定を厳格に検証し、問題があれば処理を停止
   */
  validateStrict(): void {
    if (!this.validate()) {
      handleConfigError("Invalid configuration. Please check environment variables.");
    }
  }
}

// Map to store the mapping between workflow names and API keys
export const workflowApiKeyMap = new Map<string, string>();

// テスト時またはAPIキーマップが環境変数で設定されている場合は読み込む
if (process.env.WORKFLOW_API_KEY_MAP) {
  try {
    const mapData = JSON.parse(process.env.WORKFLOW_API_KEY_MAP);
    Object.entries(mapData).forEach(([key, value]) => {
      if (typeof key === 'string' && typeof value === 'string') {
        workflowApiKeyMap.set(key, value);
      }
    });
    console.log(`Loaded ${workflowApiKeyMap.size} workflow API key mappings from environment`);
  } catch (error) {
    console.error('Failed to parse WORKFLOW_API_KEY_MAP environment variable:', error);
  }
}

// デフォルト設定インスタンス
export const appConfig = new EnvConfig();

// アプリケーション設定のシングルトンインスタンス (後方互換性のため)
export class AppConfig {
  static readonly BASE_URL = appConfig.getBaseUrl();
  static readonly API_KEYS = appConfig.getApiKeys();
  static readonly SERVER_NAME = appConfig.getServerConfig().name;
  static readonly SERVER_VERSION = appConfig.getServerConfig().version;
  static readonly DEFAULT_USER_ID = appConfig.getApiRequestConfig().userId;
  static readonly DEFAULT_RESPONSE_MODE = appConfig.getApiRequestConfig().responseMode;
  
  static validate(): boolean {
    return appConfig.validate();
  }
  
  static validateStrict(): void {
    appConfig.validateStrict();
  }
  
  static getServerConfig() {
    return appConfig.getServerConfig();
  }
  
  static getApiRequestConfig() {
    return appConfig.getApiRequestConfig();
  }
}

// バックワードコンパティビリティのための変数
export const DIFY_BASE_URL = AppConfig.BASE_URL;
export const DIFY_API_KEYS = AppConfig.API_KEYS;

// バックワードコンパティビリティのための関数
export function validateConfig(): boolean {
  return AppConfig.validate();
} 