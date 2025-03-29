import { describe, test, expect } from '@jest/globals';
import {
  DifyInfoResponse,
  DifyParameter,
  DifyInputField,
  DifyInputComponent,
  DifyParametersResponse,
  DifyWorkflowResponse
} from '../types.js';

describe('DifyInfoResponse', () => {
  test('should allow creation of valid DifyInfoResponse objects', () => {
    const validResponse: DifyInfoResponse = {
      name: 'Test Application',
      description: 'A test application for Dify API',
      customField: 'custom value'
    };

    expect(validResponse.name).toBe('Test Application');
    expect(validResponse.description).toBe('A test application for Dify API');
    expect(validResponse.customField).toBe('custom value');
  });

  test('should allow undefined name and description', () => {
    const response: DifyInfoResponse = {
      customField: 'value'
    };
    
    expect(response.name).toBeUndefined();
    expect(response.description).toBeUndefined();
    expect(response.customField).toBe('value');
  });
});

describe('DifyParameter', () => {
  test('should allow creation of valid DifyParameter objects', () => {
    const param: DifyParameter = {
      name: 'temperature',
      type: 'number',
      description: 'The sampling temperature to use',
      required: true,
      defaultValue: 0.7
    };

    expect(param.name).toBe('temperature');
    expect(param.type).toBe('number');
    expect(param.required).toBe(true);
    expect(param.defaultValue).toBe(0.7);
  });

  test('should require only name field', () => {
    const minimalParam: DifyParameter = {
      name: 'model'
    };

    expect(minimalParam.name).toBe('model');
    expect(minimalParam.type).toBeUndefined();
    expect(minimalParam.description).toBeUndefined();
    expect(minimalParam.required).toBeUndefined();
  });
});

describe('DifyInputField', () => {
  test('should allow creation of valid DifyInputField objects', () => {
    const field: DifyInputField = {
      label: 'API Key',
      variable: 'api_key',
      required: true,
      default: 'default-key'
    };

    expect(field.label).toBe('API Key');
    expect(field.variable).toBe('api_key');
    expect(field.required).toBe(true);
    expect(field.default).toBe('default-key');
  });

  test('should require only variable field', () => {
    const minimalField: DifyInputField = {
      variable: 'system_prompt'
    };

    expect(minimalField.variable).toBe('system_prompt');
    expect(minimalField.label).toBeUndefined();
    expect(minimalField.required).toBeUndefined();
    expect(minimalField.default).toBeUndefined();
  });
});

describe('DifyInputComponent', () => {
  test('should allow creation of valid DifyInputComponent objects', () => {
    const component: DifyInputComponent = {
      'textInput': {
        label: 'Query',
        variable: 'query',
        required: true
      }
    };

    expect(component.textInput).toBeDefined();
    expect(component.textInput.label).toBe('Query');
    expect(component.textInput.variable).toBe('query');
    expect(component.textInput.required).toBe(true);
  });
});

describe('DifyParametersResponse', () => {
  test('should allow creation of valid DifyParametersResponse objects', () => {
    const response: DifyParametersResponse = {
      user_input_form: [
        {
          'textInput': {
            label: 'API Key',
            variable: 'api_key',
            required: true
          }
        }
      ],
      file_upload: {
        allowed: true,
        required: false
      },
      system_parameters: {
        max_tokens: 2048
      },
      parameters: [
        {
          name: 'temperature',
          type: 'number',
          required: true
        }
      ]
    };

    expect(response.user_input_form).toHaveLength(1);
    expect(response.file_upload?.allowed).toBe(true);
    expect(response.system_parameters?.max_tokens).toBe(2048);
    expect(Array.isArray(response.parameters)).toBe(true);
    if (Array.isArray(response.parameters)) {
      expect(response.parameters[0].name).toBe('temperature');
    }
  });

  test('should allow parameters as a record object', () => {
    const response: DifyParametersResponse = {
      parameters: {
        temperature: {
          type: 'number',
          description: 'Sampling temperature'
        }
      }
    };

    expect(Array.isArray(response.parameters)).toBe(false);
    expect(typeof response.parameters).toBe('object');
  });
});

describe('DifyWorkflowResponse', () => {
  test('should allow creation of valid DifyWorkflowResponse objects', () => {
    const response: DifyWorkflowResponse = {
      task_id: 'task-123',
      workflow_run_id: 'workflow-456',
      data: {
        id: 'run-789',
        workflow_id: 'workflow-456',
        status: 'completed',
        outputs: {
          result: 'Success'
        }
      },
      result: 'Operation completed successfully',
      elapsed_time: 1500,
      total_tokens: 250,
      total_steps: 3,
      created_at: 1617294512,
      finished_at: 1617294542
    };

    expect(response.task_id).toBe('task-123');
    expect(response.workflow_run_id).toBe('workflow-456');
    expect(response.data?.id).toBe('run-789');
    expect(response.data?.status).toBe('completed');
    expect(response.result).toBe('Operation completed successfully');
    expect(response.elapsed_time).toBe(1500);
    expect(response.total_tokens).toBe(250);
    expect(response.total_steps).toBe(3);
  });

  test('should allow minimal response with only required fields', () => {
    const minimalResponse: DifyWorkflowResponse = {};

    expect(minimalResponse.task_id).toBeUndefined();
    expect(minimalResponse.data).toBeUndefined();
    expect(minimalResponse.result).toBeUndefined();
  });

  test('should handle error in response', () => {
    const errorResponse: DifyWorkflowResponse = {
      task_id: 'task-123',
      error: {
        code: 'invalid_parameter',
        message: 'The parameter is invalid'
      }
    };

    expect(errorResponse.task_id).toBe('task-123');
    expect(errorResponse.error).toBeDefined();
    expect(errorResponse.error.code).toBe('invalid_parameter');
    expect(errorResponse.error.message).toBe('The parameter is invalid');
  });
}); 