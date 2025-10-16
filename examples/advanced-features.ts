// ========================================================================================
// ADVANCED EXAMPLES - OpenAI Agents SDK Features
// ========================================================================================

import { Agent, run, tool, handoff } from '@openai/agents';
import { z } from 'zod';

// ========================================================================================
// 1. ADVANCED TOOLS WITH TYPE SAFETY
// ========================================================================================

// Database query tool with validation
const queryDatabaseTool = tool({
  name: 'query_database',
  description: 'Query database tables for user or order information',
  parameters: z.object({
    table: z.string().describe('Table name (users or orders)'),
    query: z.string().describe('Search query'),
    limit: z.number().min(1).max(100).optional().default(10).describe('Maximum number of results')
  }),
  async execute({ table, query, limit }) {
    // Simulate database query
    const mockData = {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ],
      orders: [
        { id: 101, user_id: 1, total: 99.99, status: 'completed' },
        { id: 102, user_id: 2, total: 149.99, status: 'pending' }
      ]
    };

    const results = mockData[table as keyof typeof mockData] || [];
    return JSON.stringify(results.slice(0, limit));
  }
});

// Email sending tool
const sendEmailTool = tool({
  name: 'send_email',
  description: 'Send email messages with priority settings',
  parameters: z.object({
    to: z.string().email().describe('Email recipient'),
    subject: z.string().min(1).describe('Email subject'),
    body: z.string().min(1).describe('Email body content'),
    priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Email priority')
  }),
  async execute({ to, subject, body, priority }) {
    // Simulate email sending
    console.log(`Sending email to ${to}: ${subject}`);
    return JSON.stringify({
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      priority
    });
  }
});

// File management tool
const createFileTool = tool({
  name: 'create_file',
  description: 'Create a new file with specified content',
  parameters: z.object({
    filename: z.string().describe('Name of the file to create'),
    content: z.string().describe('Content to write to the file')
  }),
  async execute({ filename, content }) {
    // Simulate file creation
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Created file: ${filename} (ID: ${fileId})`);
    return `File created successfully: ${filename} (ID: ${fileId})`;
  }
});

// ========================================================================================
// 2. GUARDRAILS - Input Validation and Safety
// ========================================================================================

// Content safety guardrail
const contentSafetyGuardrail = {
  name: 'Content Safety',
  check: async (input: string) => {
    // Simulate content moderation
    const bannedWords = ['spam', 'hack', 'malware', 'phishing'];
    const lowerInput = input.toLowerCase();
    
    for (const word of bannedWords) {
      if (lowerInput.includes(word)) {
        return {
          passed: false,
          reason: `Content contains prohibited term: ${word}`,
          action: 'block'
        };
      }
    }
    
    return { passed: true };
  }
};

// Rate limiting guardrail
const rateLimitGuardrail = {
  name: 'Rate Limiting',
  check: async (input: string, context: any) => {
    // Check if user has exceeded rate limits
    const userId = context?.userId || 'anonymous';
    const requestCount = context?.requestCount || 0;
    
    if (requestCount > 50) {
      return {
        passed: false,
        reason: 'Rate limit exceeded for user',
        action: 'throttle'
      };
    }
    
    return { passed: true };
  }
};

// Business hours guardrail
const businessHoursGuardrail = {
  name: 'Business Hours',
  check: async () => {
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    if (isWeekend || hour < 9 || hour > 17) {
      return {
        passed: false,
        reason: 'Outside business hours (Mon-Fri, 9AM-5PM)',
        action: 'defer',
        message: 'Thank you for your message. We will respond during business hours.'
      };
    }
    
    return { passed: true };
  }
};

// ========================================================================================
// 3. SPECIALIZED AGENTS WITH HANDOFFS
// ========================================================================================

// Customer Support Agent
function createCustomerSupportAgent(): Agent {
  return new Agent({
    name: 'Customer Support',
    instructions: `You are a helpful customer support agent. You can:
    - Answer general questions
    - Look up user information
    - Check order status
    - Create support tickets
    
    For complex technical issues, hand off to the Technical Support agent.
    For billing issues, hand off to the Billing agent.`,
    model: 'gpt-4o',
    tools: [queryDatabaseTool]
  });
}

// Technical Support Agent
function createTechnicalSupportAgent(): Agent {
  return new Agent({
    name: 'Technical Support',
    instructions: `You are a technical support specialist. You can:
    - Diagnose technical problems
    - Provide step-by-step troubleshooting
    - Create technical documentation
    - Escalate to engineering if needed
    
    Always ask for specific error messages and system information.`,
    model: 'gpt-4o',
    tools: [createFileTool, queryDatabaseTool]
  });
}

// Billing Agent
function createBillingAgent(): Agent {
  return new Agent({
    name: 'Billing Support',
    instructions: `You are a billing specialist. You can:
    - Check account balances
    - Process refunds
    - Update payment methods
    - Send billing notifications
    
    Always verify user identity before discussing financial information.`,
    model: 'gpt-4o',
    tools: [queryDatabaseTool, sendEmailTool]
  });
}

// Manager Agent with Handoffs
function createManagerAgent(): Agent {
  const customerSupport = createCustomerSupportAgent();
  const technicalSupport = createTechnicalSupportAgent();
  const billingSupport = createBillingAgent();

  return new Agent({
    name: 'Support Manager',
    instructions: `You are a support manager that routes customer inquiries to the right specialist.
    
    Route to:
    - Customer Support: General questions, order status, basic support
    - Technical Support: Bug reports, technical issues, troubleshooting
    - Billing Support: Payment issues, refunds, account billing
    
    You can also handle escalations and complex multi-department issues.`,
    model: 'gpt-4o',
    handoffs: [customerSupport, technicalSupport, billingSupport]
  });
}

// ========================================================================================
// 4. WORKFLOW AGENTS - Multi-step Processes
// ========================================================================================

// Order Processing Workflow
function createOrderProcessingAgent(): Agent {
  return new Agent({
    name: 'Order Processor',
    instructions: `You process customer orders through multiple steps:
    
    1. Validate order details
    2. Check inventory
    3. Calculate pricing
    4. Process payment
    5. Create shipping label
    6. Send confirmation email
    
    Handle each step carefully and report any issues.`,
    model: 'gpt-4o',
    tools: [queryDatabaseTool, sendEmailTool, createFileTool]
  });
}

// Content Creation Workflow
function createContentCreatorAgent(): Agent {
  return new Agent({
    name: 'Content Creator',
    instructions: `You help create marketing content:
    
    1. Research topic and audience
    2. Create outline
    3. Write content
    4. Generate supporting materials
    5. Review and optimize
    
    Always maintain brand voice and follow content guidelines.`,
    model: 'gpt-4o',
    tools: [createFileTool, queryDatabaseTool]
  });
}

// ========================================================================================
// 5. CONTEXT-AWARE AGENTS
// ========================================================================================

function createPersonalAssistantAgent(): Agent {
  return new Agent({
    name: 'Personal Assistant',
    instructions: `You are a personal assistant that remembers context across conversations.
    
    - Remember user preferences and past conversations
    - Provide personalized recommendations
    - Schedule and remind about tasks
    - Learn from user feedback
    
    Always reference previous context when relevant.`,
    model: 'gpt-4o',
    tools: [sendEmailTool, createFileTool]
  });
}

// ========================================================================================
// 6. EXAMPLE USAGE PATTERNS
// ========================================================================================

// Simple weather tool definition
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather information for a city',
  parameters: z.object({
    city: z.string().describe('City name to get weather for')
  }),
  async execute({ city }) {
    // Simulate weather lookup
    const mockWeather: Record<string, { temp: number; condition: string }> = {
      'New York': { temp: 72, condition: 'Sunny' },
      'San Francisco': { temp: 65, condition: 'Foggy' }
    };
    const weather = mockWeather[city] || { temp: 70, condition: 'Unknown' };
    return `The weather in ${city} is ${weather.temp}°F and ${weather.condition}.`;
  }
});

export async function exampleUsagePatterns() {
  // Example 1: Simple agent interaction
  const weatherAgent = new Agent({
    name: 'Weather Bot',
    instructions: 'Provide weather information',
    tools: [getWeatherTool]
  });
  
  const result1 = await run(weatherAgent, 'What\'s the weather in New York?');
  console.log('Weather Result:', result1.finalOutput);

  // Example 2: Agent with handoffs
  const managerAgent = createManagerAgent();
  const result2 = await run(managerAgent, 'I\'m having trouble with my login');
  console.log('Manager Result:', result2.finalOutput);

  // Example 3: Workflow processing
  const orderAgent = createOrderProcessingAgent();
  const result3 = await run(orderAgent, 'Process order #12345 for customer john@example.com', {
    context: { orderId: '12345', customerId: 'cust_123' }
  });
  console.log('Order Result:', result3.finalOutput);

  // Example 4: Context-aware conversation
  const assistantAgent = createPersonalAssistantAgent();
  
  // First message
  const result4a = await run(assistantAgent, 'I like coffee shops with outdoor seating');
  
  // Follow-up message (with context)
  const result4b = await run(assistantAgent, result4a.history.concat({ role: 'user', content: 'Find me a place nearby' }));
  
  console.log('Assistant Result:', result4b.finalOutput);
}

// ========================================================================================
// 7. ADVANCED CONFIGURATION
// ========================================================================================

export const advancedAgentConfig = {
  // High-performance agent with optimizations
  performanceOptimized: new Agent({
    name: 'Performance Agent',
    instructions: 'Optimized for speed and efficiency',
    model: 'gpt-4o-mini', // Faster model
    tools: []
  }),

  // Creative agent with higher temperature
  creativeAgent: new Agent({
    name: 'Creative Agent',
    instructions: 'Generate creative and original content',
    model: 'gpt-4o',
    tools: [createFileTool]
  }),

  // Analytical agent with structured output
  analyticalAgent: new Agent({
    name: 'Analytical Agent',
    instructions: 'Provide detailed analysis with structured data',
    model: 'gpt-4o',
    tools: [queryDatabaseTool]
  })
};

// ========================================================================================
// 8. ERROR HANDLING AND MONITORING
// ========================================================================================

export async function robustAgentExecution(agent: Agent, message: string, options: any = {}) {
  try {
    const startTime = Date.now();
    
    const result = await run(agent, message, {
      ...options,
      timeout: 30000, // 30 second timeout
      retries: 3
    });
    
    const duration = Date.now() - startTime;
    
    // Log metrics
    console.log('Agent Execution Metrics:', {
      agent: agent.name,
      duration: `${duration}ms`,
      finalOutput: result.finalOutput?.toString().substring(0, 100) + '...',
      newItemsCount: result.newItems?.length || 0,
      success: true
    });
    
    return result;
  } catch (error) {
    console.error('Agent Execution Error:', {
      agent: agent.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    // Return fallback response
    return {
      finalOutput: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.',
      error: true,
      context: []
    };
  }
}