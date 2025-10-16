// Utility functions for the OpenAI Agents API

export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const pollRunCompletion = async (
  threadId: string, 
  runId: string, 
  apiKey: string,
  maxAttempts: number = 30,
  intervalMs: number = 1000
): Promise<any> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.data.status === 'completed') {
      return result.data;
    }
    
    if (result.success && ['failed', 'cancelled', 'expired'].includes(result.data.status)) {
      throw new Error(`Run ${result.data.status}: ${result.data.last_error?.message || 'Unknown error'}`);
    }
    
    await delay(intervalMs);
  }
  
  throw new Error('Run polling timeout');
};

export const validateEnvironment = (): void => {
  const required = ['OPENAI_API_KEY', 'API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

export const sanitizeError = (error: any): { code: string; message: string } => {
  if (error?.error) {
    return {
      code: error.error.code || 'unknown_error',
      message: error.error.message || 'An error occurred'
    };
  }
  
  return {
    code: 'unknown_error',
    message: error.message || 'An unexpected error occurred'
  };
};