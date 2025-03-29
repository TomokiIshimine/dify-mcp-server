import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { WorkflowManager } from '../dify/workflow.js';
import {
  handleInitializationError,
  initializeWorkflowManager,
  setupRequestHandlers,
  handleCallToolRequest,
  createServer,
  setupServer
} from '../server.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the server module
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      setRequestHandler: jest.fn()
    }))
  };
});

// Type for request handlers
type RequestHandler = (request: any) => Promise<any>;

// Sample tool for testing
const sampleTools: Tool[] = [
  {
    name: 'tool1',
    description: 'Test tool 1',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Mock server instance
const mockServerInstance = {
  setRequestHandler: jest.fn()
};

// Create mocks
const mockWorkflowManager = {
  initialize: jest.fn(() => Promise.resolve()),
  getTools: jest.fn(() => sampleTools),
  executeWorkflow: jest.fn(() => Promise.resolve('test result'))
};

const mockConfig = {
  validateStrict: jest.fn(),
  getServerConfig: jest.fn(() => ({
    name: 'test-server',
    version: '1.0.0'
  }))
};

// Error for testing
const mockError = new Error('Test error');

describe('Server module', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('handleInitializationError', () => {
    it('should log error message and exit process', () => {
      expect(() => {
        handleInitializationError(mockError);
      }).toThrow();
      
      expect(console.error).toHaveBeenCalledWith('Failed to retrieve or convert Dify Workflow information:');
      expect(console.error).toHaveBeenCalledWith(`Error message: ${mockError.message}`);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should not exit process when exitProcess is false', () => {
      expect(() => {
        handleInitializationError(mockError, false);
      }).toThrow(mockError);
      
      expect(console.error).toHaveBeenCalledWith('Failed to retrieve or convert Dify Workflow information:');
      expect(process.exit).not.toHaveBeenCalled();
    });
    
    it('should handle non-Error objects', () => {
      const nonError = 'string error';
      expect(() => {
        handleInitializationError(nonError);
      }).toThrow();
      
      expect(console.error).toHaveBeenCalledWith('Failed to retrieve or convert Dify Workflow information:');
      expect(console.error).toHaveBeenCalledWith(`Unknown error type: ${nonError}`);
    });
  });
  
  describe('initializeWorkflowManager', () => {
    it('should initialize workflow manager successfully', async () => {
      const result = await initializeWorkflowManager(mockWorkflowManager as unknown as WorkflowManager);
      
      expect(mockWorkflowManager.initialize).toHaveBeenCalled();
      expect(result).toBe(mockWorkflowManager);
    });
    
    it('should handle initialization errors', async () => {
      mockWorkflowManager.initialize.mockImplementationOnce(() => Promise.reject(mockError));
      
      await expect(initializeWorkflowManager(mockWorkflowManager as unknown as WorkflowManager)).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('setupRequestHandlers', () => {
    it('should set up request handlers correctly', () => {
      setupRequestHandlers(mockServerInstance as unknown as any, mockWorkflowManager as unknown as WorkflowManager);
      
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledWith(
        ListToolsRequestSchema,
        expect.any(Function)
      );
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledWith(
        CallToolRequestSchema,
        expect.any(Function)
      );
    });
    
    it('should handle list tools request correctly', async () => {
      // Set up the handlers
      setupRequestHandlers(mockServerInstance as unknown as any, mockWorkflowManager as unknown as WorkflowManager);
      
      // Find the handler call for ListToolsRequestSchema
      const handlerCall = mockServerInstance.setRequestHandler.mock.calls.find(
        call => call[0] === ListToolsRequestSchema
      );
      
      if (!handlerCall) {
        console.error('List tools handler was not found');
        return;
      }
      
      // Get the handler function (second argument of the call)
      const handler = handlerCall[1] as RequestHandler;
      
      // Call the handler function
      const result = await handler({});
      
      expect(result).toEqual({ tools: sampleTools });
      expect(mockWorkflowManager.getTools).toHaveBeenCalled();
    });
  });
  
  describe('handleCallToolRequest', () => {
    const mockRequest = {
      params: {
        name: 'testTool',
        arguments: { param1: 'value1' }
      }
    };
    
    it('should handle tool request correctly', async () => {
      const result = await handleCallToolRequest(mockWorkflowManager as unknown as WorkflowManager, mockRequest);
      
      expect(mockWorkflowManager.executeWorkflow).toHaveBeenCalledWith(
        'testTool',
        { param1: 'value1' }
      );
      
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'test result'
          }
        ]
      });
    });
    
    it('should throw error when parameters are undefined', async () => {
      const requestWithNoArgs = {
        params: {
          name: 'testTool'
        }
      };
      
      await expect(handleCallToolRequest(mockWorkflowManager as unknown as WorkflowManager, requestWithNoArgs))
        .rejects.toThrow(/Workflow parameters are undefined/);
        
      expect(console.error).toHaveBeenCalled();
      expect(mockWorkflowManager.executeWorkflow).not.toHaveBeenCalled();
    });
    
    it('should handle errors from executeWorkflow', async () => {
      mockWorkflowManager.executeWorkflow.mockImplementationOnce(() => Promise.reject(mockError));
      
      await expect(handleCallToolRequest(mockWorkflowManager as unknown as WorkflowManager, mockRequest))
        .rejects.toThrow(mockError);
        
      expect(console.error).toHaveBeenCalled();
    });
    
    it('should handle non-Error objects from executeWorkflow', async () => {
      const nonError = 'string error';
      mockWorkflowManager.executeWorkflow.mockImplementationOnce(() => Promise.reject(nonError));
      
      await expect(handleCallToolRequest(mockWorkflowManager as unknown as WorkflowManager, mockRequest))
        .rejects.toThrow(/Unknown error occurred/);
        
      expect(console.error).toHaveBeenCalled();
    });
    
    it('should handle object return values', async () => {
      const objectResult = { key: 'value' };
      const anyMockWorkflowManager = mockWorkflowManager as any;
      anyMockWorkflowManager.executeWorkflow.mockImplementationOnce(() => Promise.resolve(objectResult));
      
      const result = await handleCallToolRequest(anyMockWorkflowManager as WorkflowManager, mockRequest);
      
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(objectResult)
          }
        ]
      });
    });
  });
  
  describe('createServer', () => {
    it('should return a server instance with required methods', () => {
      // Reset mock functions
      jest.clearAllMocks();
      
      // Test configuration
      const mockServerConfig = {
        name: 'test-server',
        version: '1.0.0'
      };
      
      // Call the function
      const result = createServer(mockServerConfig);
      
      // Verify the result exists
      expect(result).toBeDefined();
      // Verify it's an object
      expect(typeof result).toBe('object');
      // Verify required methods exist
      expect(result.setRequestHandler).toBeDefined();
      expect(typeof result.setRequestHandler).toBe('function');
    });
  });
  
  describe('setupServer', () => {
    it('should set up server correctly', async () => {
      const mockWorkflowManagerFactory = jest.fn(() => mockWorkflowManager as unknown as WorkflowManager);
      
      const server = await setupServer(mockConfig as any, mockWorkflowManagerFactory);
      
      expect(mockConfig.validateStrict).toHaveBeenCalled();
      expect(mockWorkflowManager.initialize).toHaveBeenCalled();
    });
    
    it('should handle initialization errors', async () => {
      const mockWorkflowManagerFactory = jest.fn(() => mockWorkflowManager as unknown as WorkflowManager);
      mockWorkflowManager.initialize.mockImplementationOnce(() => Promise.reject(mockError));
      
      await expect(setupServer(mockConfig as any, mockWorkflowManagerFactory)).rejects.toThrow();
        
      expect(mockConfig.validateStrict).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 