// ========================================================================================
// CLIENT EXAMPLES - How to use the OpenAI Agents API
// ========================================================================================

// Simple TypeScript client for the OpenAI Agents API
class AgentsAPIClient {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`API Error: ${error.message}`);
    }

    return response.json();
  }

  // Get list of available agents
  async getAgents() {
    return this.request('/api/agents');
  }

  // Get specific agent
  async getAgent(agentId: string) {
    return this.request(`/api/agents/${agentId}`);
  }

  // Create a custom agent
  async createAgent(config: {
    name: string;
    instructions: string;
    model?: string;
    tools?: any[];
  }) {
    return this.request('/api/agents', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Chat with a specific agent
  async chat(agentId: string, message: string, options: {
    context?: any[];
    stream?: boolean;
  } = {}) {
    if (options.stream) {
      return this.streamChat(agentId, message, options.context);
    }

    return this.request(`/api/chat/${agentId}`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        context: options.context || [],
        stream: false,
      }),
    });
  }

  // Quick chat with coordinator (smart routing)
  async quickChat(message: string, context: any[] = []) {
    return this.request('/api/quick-chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        context,
      }),
    });
  }

  // Streaming chat
  private async streamChat(agentId: string, message: string, context: any[] = []) {
    const response = await fetch(`${this.baseURL}/api/chat/${agentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        message,
        context,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stream Error: ${response.statusText}`);
    }

    return this.parseEventStream(response);
  }

  private async *parseEventStream(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                yield JSON.parse(data);
              } catch (e) {
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// ========================================================================================
// USAGE EXAMPLES
// ========================================================================================

// Initialize client
const client = new AgentsAPIClient(
  process.env.API_BASE_URL || 'https://your-deployment.vercel.app',
  process.env.API_KEY || 'your-api-key'
);

// Example 1: List available agents
export async function example1_ListAgents() {
  try {
    const response = await client.getAgents();
    console.log('Available agents:', response.data);
    
    // Expected output:
    // [
    //   { id: 'weather', name: 'Weather Assistant', ... },
    //   { id: 'math', name: 'Math Assistant', ... },
    //   { id: 'research', name: 'Research Assistant', ... },
    //   { id: 'coordinator', name: 'Coordinator', ... }
    // ]
  } catch (error) {
    console.error('Error listing agents:', error);
  }
}

// Example 2: Simple chat with weather agent
export async function example2_WeatherChat() {
  try {
    const response = await client.chat('weather', 'What\'s the weather like in New York?');
    console.log('Weather response:', response.data.response);
    
    // Expected: The weather in New York is Sunny, 72°F
  } catch (error) {
    console.error('Error getting weather:', error);
  }
}

// Example 3: Math calculation
export async function example3_MathCalculation() {
  try {
    const response = await client.chat('math', 'Calculate 15% tip on $84.50');
    console.log('Math response:', response.data.response);
    
    // Expected: A 15% tip on $84.50 would be $12.68
  } catch (error) {
    console.error('Error with math:', error);
  }
}

// Example 4: Quick chat (smart routing)
export async function example4_SmartRouting() {
  const questions = [
    'What\'s the weather in Tokyo?',           // → Weather Agent
    'Calculate 25 * 47',                      // → Math Agent  
    'Find files related to quarterly report', // → Research Agent
    'How are you doing today?'                // → Coordinator handles directly
  ];

  for (const question of questions) {
    try {
      const response = await client.quickChat(question);
      console.log(`Q: ${question}`);
      console.log(`A: ${response.data.response}`);
      console.log(`Agent used: ${response.data.agent_used}`);
      console.log(`Handoffs: ${JSON.stringify(response.data.handoffs)}`);
      console.log('---');
    } catch (error) {
      console.error(`Error with question "${question}":`, error);
    }
  }
}

// Example 5: Conversational context
export async function example5_ConversationContext() {
  try {
    let context: any[] = [];

    // First message
    const response1 = await client.chat('coordinator', 'I need help with a technical issue', { context });
    console.log('Response 1:', response1.data.response);
    context = response1.data.context;

    // Follow-up message (with context)
    const response2 = await client.chat('coordinator', 'It\'s about login problems', { context });
    console.log('Response 2:', response2.data.response);
    context = response2.data.context;

    // Another follow-up
    const response3 = await client.chat('coordinator', 'The error message says "Invalid credentials"', { context });
    console.log('Response 3:', response3.data.response);
    
  } catch (error) {
    console.error('Error in conversation:', error);
  }
}

// Example 6: Streaming responses
export async function example6_StreamingChat() {
  try {
    console.log('Starting streaming chat...');
    
    const stream = await client.chat('coordinator', 'Tell me a story about AI agents', { stream: true });
    
    for await (const chunk of stream) {
      if (chunk.type === 'start') {
        console.log('Stream started with agent:', chunk.agent);
      } else if (chunk.type === 'result') {
        console.log('Final result:', chunk.data.response);
      } else if (chunk.type === 'end') {
        console.log('Stream ended');
      } else if (chunk.type === 'error') {
        console.error('Stream error:', chunk.error);
      }
    }
  } catch (error) {
    console.error('Error in streaming chat:', error);
  }
}

// Example 7: Create custom agent
export async function example7_CustomAgent() {
  try {
    const customAgent = await client.createAgent({
      name: 'Code Reviewer',
      instructions: `You are a code reviewer that helps developers improve their code.
      
      You can:
      - Review code for bugs and improvements
      - Suggest best practices
      - Explain complex concepts
      - Provide refactoring suggestions
      
      Always be constructive and educational in your feedback.`,
      model: 'gpt-4o',
      tools: []
    });

    console.log('Created custom agent:', customAgent.data);

    // Test the custom agent
    const codeReview = await client.chat(customAgent.data.id, `
      Review this JavaScript function:
      
      function getUserData(id) {
        var user = database.query("SELECT * FROM users WHERE id = " + id);
        return user;
      }
    `);

    console.log('Code review:', codeReview.data.response);
    
  } catch (error) {
    console.error('Error creating custom agent:', error);
  }
}

// ========================================================================================
// RUN ALL EXAMPLES
// ========================================================================================

export async function runAllExamples() {
  console.log('🚀 Running OpenAI Agents API Examples...\n');

  await example1_ListAgents();
  await example2_WeatherChat();
  await example3_MathCalculation();
  await example4_SmartRouting();
  await example5_ConversationContext();
  await example6_StreamingChat();
  await example7_CustomAgent();

  console.log('\n✅ All examples completed!');
}
    return this.request(`/api/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
