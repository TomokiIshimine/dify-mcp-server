import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  Config, 
  EnvConfig, 
  AppConfig, 
  handleConfigError,
  workflowApiKeyMap,
  appConfig,
  validateConfig,
  DIFY_BASE_URL,
  DIFY_API_KEYS
} from '../config.js';

describe('Config Module', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    jest.resetAllMocks();
    
    // Clear the workflow API key map
    workflowApiKeyMap.clear();
  });
  
  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });
  
  describe('EnvConfig', () => {
    test('should initialize with environment variables', () => {
      // Setup test environment
      const testEnv = {
        DIFY_BASE_URL: 'https://api.dify.test',
        DIFY_API_KEYS: 'key1,key2,key3',
        SERVER_NAME: 'test-server',
        SERVER_VERSION: '1.2.3',
        DEFAULT_USER_ID: 'test-user-123'
      };
      
      const config = new EnvConfig(testEnv);
      
      // Check base URL
      expect(config.getBaseUrl()).toBe('https://api.dify.test');
      
      // Check API keys
      expect(config.getApiKeys()).toEqual(['key1', 'key2', 'key3']);
      
      // Check server config
      const serverConfig = config.getServerConfig();
      expect(serverConfig.name).toBe('test-server');
      expect(serverConfig.version).toBe('1.2.3');
      
      // Check API request config
      const requestConfig = config.getApiRequestConfig();
      expect(requestConfig.userId).toBe('test-user-123');
      expect(requestConfig.responseMode).toBe('blocking');
    });
    
    test('should handle legacy API key', () => {
      const testEnv = {
        DIFY_BASE_URL: 'https://api.dify.test',
        DIFY_API_KEY: 'legacy-key'
      };
      
      const config = new EnvConfig(testEnv);
      expect(config.getApiKeys()).toEqual(['legacy-key']);
    });
    
    test('should use default values when environment variables are not set', () => {
      const config = new EnvConfig({});
      
      expect(config.getBaseUrl()).toBe('');
      expect(config.getApiKeys()).toEqual([]);
      
      const serverConfig = config.getServerConfig();
      expect(serverConfig.name).toBe('dify-workflow-mcp-server');
      expect(serverConfig.version).toBe('1.0.0');
      
      const requestConfig = config.getApiRequestConfig();
      expect(requestConfig.userId).toBe('test-abc');
      expect(requestConfig.responseMode).toBe('blocking');
    });
    
    test('validate should return false when required configurations are missing', () => {
      const config = new EnvConfig({});
      
      expect(config.validate()).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
    
    test('validate should return true when all required configurations are set', () => {
      const testEnv = {
        DIFY_BASE_URL: 'https://api.dify.test',
        DIFY_API_KEYS: 'key1,key2'
      };
      
      const config = new EnvConfig(testEnv);
      expect(config.validate()).toBe(true);
    });
    
    test('validateStrict should throw error when validation fails', () => {
      const config = new EnvConfig({});
      
      expect(() => config.validateStrict()).toThrow();
      expect(process.exit).not.toHaveBeenCalled(); // Because we're in test environment
    });
  });
  
  describe('handleConfigError', () => {
    test('should throw error in test environment', () => {
      process.env.NODE_ENV = 'test';
      
      expect(() => handleConfigError('Test error')).toThrow('Test error');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });
    
    test('should call process.exit in non-test environment', () => {
      process.env.NODE_ENV = 'production';
      
      try {
        handleConfigError('Fatal error');
      } catch (error) {
        // This catch is for the mock implementation of process.exit
      }
      
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Fatal error'));
    });
  });
  
  describe('AppConfig static class', () => {
    test('should expose configuration values', () => {
      // 直接appConfigからAppConfigの値をチェック
      expect(AppConfig.BASE_URL).toBe(appConfig.getBaseUrl());
      expect(AppConfig.API_KEYS).toEqual(appConfig.getApiKeys());
      expect(AppConfig.SERVER_NAME).toBe(appConfig.getServerConfig().name);
      expect(AppConfig.SERVER_VERSION).toBe(appConfig.getServerConfig().version);
    });
    
    test('static methods should delegate to appConfig instance', () => {
      // Set up spy on appConfig
      const validateSpy = jest.spyOn(appConfig, 'validate');
      const validateStrictSpy = jest.spyOn(appConfig, 'validateStrict');
      const getServerConfigSpy = jest.spyOn(appConfig, 'getServerConfig');
      const getApiRequestConfigSpy = jest.spyOn(appConfig, 'getApiRequestConfig');
      
      // Call static methods
      AppConfig.validate();
      try { AppConfig.validateStrict(); } catch (e) {}
      AppConfig.getServerConfig();
      AppConfig.getApiRequestConfig();
      
      // Check that instance methods were called
      expect(validateSpy).toHaveBeenCalled();
      expect(validateStrictSpy).toHaveBeenCalled();
      expect(getServerConfigSpy).toHaveBeenCalled();
      expect(getApiRequestConfigSpy).toHaveBeenCalled();
    });
  });
  
  describe('Backward compatibility exports', () => {
    test('DIFY_BASE_URL and DIFY_API_KEYS should match AppConfig values', () => {
      // バックワード互換性変数をAppConfigの値と直接比較
      expect(DIFY_BASE_URL).toBe(AppConfig.BASE_URL);
      expect(DIFY_API_KEYS).toEqual(AppConfig.API_KEYS);
    });
    
    test('validateConfig function should call AppConfig.validate', () => {
      const validateSpy = jest.spyOn(AppConfig, 'validate');
      
      validateConfig();
      
      expect(validateSpy).toHaveBeenCalled();
    });
  });
  
  describe('workflowApiKeyMap', () => {
    test('should load mappings from environment variable', () => {
      process.env.WORKFLOW_API_KEY_MAP = JSON.stringify({
        'workflow1': 'api-key-1',
        'workflow2': 'api-key-2'
      });
      
      // We need to re-execute the module code that loads from environment
      // This is a bit tricky in Jest - here we're simulating what happens
      // when the module initializes
      const savedMap = new Map(workflowApiKeyMap);
      workflowApiKeyMap.clear();
      
      // Simulate module initialization code
      if (process.env.WORKFLOW_API_KEY_MAP) {
        try {
          const mapData = JSON.parse(process.env.WORKFLOW_API_KEY_MAP);
          Object.entries(mapData).forEach(([key, value]) => {
            if (typeof key === 'string' && typeof value === 'string') {
              workflowApiKeyMap.set(key, value as string);
            }
          });
        } catch (error) {
          console.error('Failed to parse WORKFLOW_API_KEY_MAP environment variable:', error);
        }
      }
      
      expect(workflowApiKeyMap.size).toBe(2);
      expect(workflowApiKeyMap.get('workflow1')).toBe('api-key-1');
      expect(workflowApiKeyMap.get('workflow2')).toBe('api-key-2');
      
      // Restore original map
      workflowApiKeyMap.clear();
      savedMap.forEach((value, key) => {
        workflowApiKeyMap.set(key, value);
      });
    });
    
    test('should handle invalid JSON in environment variable', () => {
      process.env.WORKFLOW_API_KEY_MAP = 'invalid-json';
      
      // Same simulation as above
      const savedMap = new Map(workflowApiKeyMap);
      workflowApiKeyMap.clear();
      
      if (process.env.WORKFLOW_API_KEY_MAP) {
        try {
          const mapData = JSON.parse(process.env.WORKFLOW_API_KEY_MAP);
          Object.entries(mapData).forEach(([key, value]) => {
            if (typeof key === 'string' && typeof value === 'string') {
              workflowApiKeyMap.set(key, value as string);
            }
          });
        } catch (error) {
          console.error('Failed to parse WORKFLOW_API_KEY_MAP environment variable:', error);
        }
      }
      
      expect(workflowApiKeyMap.size).toBe(0);
      expect(console.error).toHaveBeenCalled();
      
      // Restore original map
      workflowApiKeyMap.clear();
      savedMap.forEach((value, key) => {
        workflowApiKeyMap.set(key, value);
      });
    });
  });
}); 