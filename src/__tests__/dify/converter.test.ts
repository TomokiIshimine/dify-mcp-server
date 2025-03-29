// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { 
  determineParameterType,
  convertParametersObjectToArray,
  extractPropertiesFromUserInputForm,
  extractPropertiesFromParametersArray,
  extractPropertiesFromParameters,
  getUniqueWorkflowName,
  convertSingleWorkflowToTool,
  convertDifyWorkflowToMCPTools,
  LogHandler,
  ParameterDefinition,
  ParameterProperty,
  ExtractedProperties
} from '../../dify/converter.js';
import { WorkflowData } from '../../dify/service.js';
import { DifyInfoResponse, DifyParametersResponse } from '../../types.js';

// モックのログハンドラー
class MockLogHandler implements LogHandler {
  errors: Array<{ message: string, args: any[] }> = [];
  
  error(message: string, ...args: any[]): void {
    this.errors.push({ message, args });
  }
  
  clear(): void {
    this.errors = [];
  }
}

describe('Dify Converter モジュール', () => {
  let mockLogHandler: MockLogHandler;
  
  beforeEach(() => {
    mockLogHandler = new MockLogHandler();
    jest.clearAllMocks();
  });

  describe('determineParameterType', () => {
    it('コンポーネントタイプに基づいて正しいパラメータタイプを返す', () => {
      expect(determineParameterType('checkbox')).toBe('array');
      expect(determineParameterType('number')).toBe('number');
      expect(determineParameterType('slider')).toBe('number');
      expect(determineParameterType('switch')).toBe('boolean');
      expect(determineParameterType('select')).toBe('string');
      expect(determineParameterType('radio')).toBe('string');
      expect(determineParameterType('text')).toBe('string');
      expect(determineParameterType('unknown')).toBe('string');
    });
  });

  describe('convertParametersObjectToArray', () => {
    it('オブジェクト形式のパラメータを配列に変換する', () => {
      const parametersObj = {
        name: { 
          type: 'string', 
          description: 'Your name', 
          required: true 
        },
        age: { 
          type: 'number', 
          description: 'Your age'
        },
        simpleParam: 'value'
      };
      
      const result = convertParametersObjectToArray(parametersObj);
      
      expect(result).toEqual([
        { 
          name: 'name', 
          type: 'string', 
          description: 'Your name', 
          required: true 
        },
        { 
          name: 'age', 
          type: 'number', 
          description: 'Your age', 
          required: false 
        },
        { 
          name: 'simpleParam', 
          type: 'string', 
          description: '', 
          required: false 
        }
      ]);
    });
  });

  describe('extractPropertiesFromUserInputForm', () => {
    it('ユーザー入力フォームから正しくプロパティを抽出する', () => {
      const userInputForm = [
        { 
          text: { 
            variable: 'name', 
            label: 'Your Name', 
            required: true 
          } 
        },
        { 
          number: { 
            variable: 'age', 
            label: 'Your Age' 
          } 
        },
        { 
          checkbox: { 
            variable: 'interests', 
            label: 'Your Interests', 
            required: true 
          } 
        }
      ];
      
      const result = extractPropertiesFromUserInputForm(userInputForm, mockLogHandler);
      
      expect(result).toEqual({
        properties: {
          name: {
            type: 'string',
            description: 'Your Name'
          },
          age: {
            type: 'number',
            description: 'Your Age'
          },
          interests: {
            type: 'array',
            description: 'Your Interests'
          }
        },
        required: ['name', 'interests']
      });
    });
    
    it('variableが存在しない場合はエラーをログに記録し、そのコンポーネントをスキップする', () => {
      const userInputForm = [
        { 
          text: { 
            // variableがない
            label: 'Invalid Component' 
          } 
        },
        { 
          number: { 
            variable: 'age', 
            label: 'Your Age' 
          } 
        }
      ];
      
      const result = extractPropertiesFromUserInputForm(userInputForm, mockLogHandler);
      
      expect(result).toEqual({
        properties: {
          age: {
            type: 'number',
            description: 'Your Age'
          }
        },
        required: []
      });
      
      expect(mockLogHandler.errors.length).toBe(1);
      expect(mockLogHandler.errors[0].message).toContain('user_input_form[0]');
      expect(mockLogHandler.errors[0].message).toContain('no variable name');
    });
  });

  describe('extractPropertiesFromParametersArray', () => {
    it('パラメータ配列から正しくプロパティを抽出する', () => {
      const parameters: ParameterDefinition[] = [
        { 
          name: 'name', 
          type: 'string', 
          description: 'Your name', 
          required: true 
        },
        { 
          name: 'age', 
          type: 'number', 
          description: 'Your age' 
        }
      ];
      
      const result = extractPropertiesFromParametersArray(parameters, mockLogHandler);
      
      expect(result).toEqual({
        properties: {
          name: {
            type: 'string',
            description: 'Your name'
          },
          age: {
            type: 'number',
            description: 'Your age'
          }
        },
        required: ['name']
      });
    });
    
    it('nameが存在しない場合はエラーをログに記録し、そのパラメータをスキップする', () => {
      const parameters: ParameterDefinition[] = [
        { 
          // nameがない
          type: 'string', 
          description: 'Invalid Parameter' 
        },
        { 
          name: 'age', 
          type: 'number', 
          description: 'Your age' 
        }
      ];
      
      const result = extractPropertiesFromParametersArray(parameters, mockLogHandler);
      
      expect(result).toEqual({
        properties: {
          age: {
            type: 'number',
            description: 'Your age'
          }
        },
        required: []
      });
      
      expect(mockLogHandler.errors.length).toBe(1);
      expect(mockLogHandler.errors[0].message).toContain('Parameter[0]');
      expect(mockLogHandler.errors[0].message).toContain('no name');
    });
  });

  describe('extractPropertiesFromParameters', () => {
    it('user_input_formが存在する場合、そこからプロパティを抽出する', () => {
      const paramsData: DifyParametersResponse = {
        user_input_form: [
          { 
            text: { 
              variable: 'name', 
              label: 'Your Name', 
              required: true 
            } 
          }
        ]
      };
      
      const result = extractPropertiesFromParameters(paramsData, mockLogHandler);
      
      expect(result).toEqual({
        properties: {
          name: {
            type: 'string',
            description: 'Your Name'
          }
        },
        required: ['name']
      });
    });
    
    it('parametersが配列の場合、そこからプロパティを抽出する', () => {
      const paramsData: DifyParametersResponse = {
        parameters: [
          { 
            name: 'name', 
            type: 'string', 
            description: 'Your name', 
            required: true 
          }
        ]
      };
      
      const result = extractPropertiesFromParameters(paramsData, mockLogHandler);
      
      expect(result).toEqual({
        properties: {
          name: {
            type: 'string',
            description: 'Your name'
          }
        },
        required: ['name']
      });
    });
    
    it('parametersがオブジェクトの場合、配列に変換してからプロパティを抽出する', () => {
      const paramsData: DifyParametersResponse = {
        parameters: {
          name: { 
            type: 'string', 
            description: 'Your name', 
            required: true 
          }
        }
      };
      
      const result = extractPropertiesFromParameters(paramsData, mockLogHandler);
      
      expect(result).toEqual({
        properties: {
          name: {
            type: 'string',
            description: 'Your name'
          }
        },
        required: ['name']
      });
    });
    
    it('変換中にエラーが発生した場合、空のプロパティと必須フィールドを返す', () => {
      const paramsData: DifyParametersResponse = {
        parameters: null
      };
      
      const result = extractPropertiesFromParameters(paramsData, mockLogHandler);
      
      expect(result).toEqual({
        properties: {},
        required: []
      });
      
      expect(mockLogHandler.errors.length).toBe(1);
      expect(mockLogHandler.errors[0].message).toContain('No parameter definition found');
    });
    
    it('user_input_formもparametersも存在しない場合、エラーをログに記録して空のプロパティを返す', () => {
      const paramsData: DifyParametersResponse = {};
      
      const result = extractPropertiesFromParameters(paramsData, mockLogHandler);
      
      expect(result).toEqual({
        properties: {},
        required: []
      });
      
      expect(mockLogHandler.errors.length).toBe(1);
      expect(mockLogHandler.errors[0].message).toContain('No parameter definition found');
    });
  });

  describe('getUniqueWorkflowName', () => {
    it('既存の名前と衝突しない場合は元の名前を返す', () => {
      const existingNames = new Set(['workflow1', 'workflow2']);
      
      const result = getUniqueWorkflowName('new-workflow', existingNames);
      
      expect(result).toBe('new-workflow');
    });
    
    it('既存の名前と衝突する場合はカウンタを追加した名前を返す', () => {
      const existingNames = new Set(['workflow', 'workflow-1']);
      
      const result = getUniqueWorkflowName('workflow', existingNames);
      
      expect(result).toBe('workflow-2');
    });
  });

  describe('convertSingleWorkflowToTool', () => {
    it('ワークフローデータを正しくMCPツールに変換する', () => {
      const workflowData: WorkflowData = {
        apiKey: 'test-api-key',
        infoData: {
          name: 'test-workflow',
          description: 'Test workflow description'
        },
        paramsData: {
          user_input_form: [
            { 
              text: { 
                variable: 'query', 
                label: 'Search Query', 
                required: true 
              } 
            }
          ]
        }
      };
      
      const existingNames = new Set<string>();
      
      const result = convertSingleWorkflowToTool(workflowData, existingNames, mockLogHandler);
      
      expect(result).toEqual({
        name: 'test-workflow',
        description: 'Test workflow description',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search Query'
            }
          },
          required: ['query']
        }
      });
    });
    
    it('ワークフロー名が指定されていない場合はデフォルト名を使用する', () => {
      const workflowData: WorkflowData = {
        apiKey: 'test-api-key',
        infoData: {},
        paramsData: {
          parameters: []
        }
      };
      
      const existingNames = new Set<string>();
      
      const result = convertSingleWorkflowToTool(workflowData, existingNames, mockLogHandler);
      
      expect(result.name).toBe('dify-workflow');
      expect(result.description).toBe('Execute Dify Workflow');
    });
  });

  describe('convertDifyWorkflowToMCPTools', () => {
    it('複数のワークフローデータを正しくMCPツールに変換する', () => {
      const workflowDataList: WorkflowData[] = [
        {
          apiKey: 'api-key-1',
          infoData: {
            name: 'workflow1',
            description: 'First workflow'
          },
          paramsData: {
            parameters: [
              { 
                name: 'input1', 
                type: 'string', 
                required: true 
              }
            ]
          }
        },
        {
          apiKey: 'api-key-2',
          infoData: {
            name: 'workflow2',
            description: 'Second workflow'
          },
          paramsData: {
            parameters: [
              { 
                name: 'input2', 
                type: 'number' 
              }
            ]
          }
        }
      ];
      
      const result = convertDifyWorkflowToMCPTools(workflowDataList, mockLogHandler);
      
      expect(result.length).toBe(2);
      
      expect(result[0].name).toBe('workflow1');
      expect(result[0].description).toBe('First workflow');
      expect(result[0].inputSchema.properties.input1.type).toBe('string');
      expect(result[0].inputSchema.required).toEqual(['input1']);
      
      expect(result[1].name).toBe('workflow2');
      expect(result[1].description).toBe('Second workflow');
      expect(result[1].inputSchema.properties.input2.type).toBe('number');
      expect(result[1].inputSchema.required).toEqual([]);
    });
    
    it('名前が重複するワークフローに対して一意の名前を割り当てる', () => {
      const workflowDataList: WorkflowData[] = [
        {
          apiKey: 'api-key-1',
          infoData: {
            name: 'workflow'
          },
          paramsData: {
            parameters: []
          }
        },
        {
          apiKey: 'api-key-2',
          infoData: {
            name: 'workflow'
          },
          paramsData: {
            parameters: []
          }
        },
        {
          apiKey: 'api-key-3',
          infoData: {
            name: 'workflow'
          },
          paramsData: {
            parameters: []
          }
        }
      ];
      
      const result = convertDifyWorkflowToMCPTools(workflowDataList, mockLogHandler);
      
      expect(result.length).toBe(3);
      expect(result[0].name).toBe('workflow');
      expect(result[1].name).toBe('workflow-1');
      expect(result[2].name).toBe('workflow-2');
    });
  });
}); 