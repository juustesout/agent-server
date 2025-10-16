// Simplified types for OpenAI Agents SDK

// Base API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Agent interfaces (simplified for Agents SDK)
export interface AgentCreateRequest {
  name: string;
  instructions: string;
  model?: string;
  tools?: any[];
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  id: string;
  name: string;
  instructions: string;
  model: string;
  tools: any[];
  metadata: Record<string, any>;
  created_at: number;
}

// Run interfaces (simplified)
export interface RunRequest {
  agent_id: string;
  message: string;
  stream?: boolean;
  context?: any[];
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  stream?: boolean;
  context?: any[];
}

export interface ChatResponse {
  response: string;
  context: any[];
  usage?: any;
  run_id: string;
}

// Error interface
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}