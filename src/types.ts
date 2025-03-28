// Type definitions for Dify API responses
export interface DifyInfoResponse {
  name?: string;
  description?: string;
  [key: string]: any;
}

export interface DifyParameter {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  [key: string]: any;
}

// Type definitions for new Dify Parameters API response format
export interface DifyInputField {
  label?: string;
  variable: string;
  required?: boolean;
  default?: string;
  [key: string]: any;
}

export interface DifyInputComponent {
  [componentType: string]: DifyInputField;
}

export interface DifyParametersResponse {
  user_input_form?: DifyInputComponent[];
  file_upload?: Record<string, any>;
  system_parameters?: Record<string, any>;
  parameters?: DifyParameter[] | Record<string, any>; // Kept for backward compatibility
  [key: string]: any;
}

export interface DifyWorkflowResponse {
  task_id?: string;
  workflow_run_id?: string;
  data?: {
    id?: string;
    workflow_id?: string;
    status?: string;
    outputs?: Record<string, any>;
    [key: string]: any;
  };
  result?: string;
  error?: any;
  elapsed_time?: number;
  total_tokens?: number;
  total_steps?: number;
  created_at?: number;
  finished_at?: number;
  [key: string]: any;
} 