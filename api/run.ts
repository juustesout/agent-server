import { VercelRequest, VercelResponse } from '@vercel/node';
import { Agent, run, tool, handoff, user } from '@openai/agents';
import { z } from 'zod';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// ========================================================================================
// SIMPLIFIED OPENAI AGENTS SDK API
// ========================================================================================

// Types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AgentConfig {
  name: string;
  instructions: string;
  model?: string;
  tools?: any[];
  handoffs?: any[];
}

interface ChatRequest {
  message: string;
  history?: any[];
  stream?: boolean;
}

// Validation schemas
const AgentCreateSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().min(1),
  model: z.string().optional().default('gpt-4o'),
  tools: z.array(z.any()).optional().default([]),
  handoffs: z.array(z.any()).optional().default([])
});

const ChatSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.any()).optional().default([]),
  stream: z.boolean().optional().default(false)
});

// Agent storage (in production, use a database)
const agents = new Map<string, Agent>();
const agentConfigs = new Map<string, AgentConfig>();

// Rate limiter
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};

// ========================================================================================
// TOOLS - Using the correct OpenAI Agents SDK tool() helper
// ========================================================================================

// Weather tool
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get weather information for a given location',
  parameters: z.object({
    location: z.string().describe('The location to get weather for')
  }),
  async execute({ location }) {
    // Simulate weather API call
    const weatherData = {
      'New York': 'Sunny, 72°F',
      'London': 'Cloudy, 61°F',
      'Tokyo': 'Rainy, 68°F',
      'Paris': 'Partly cloudy, 65°F',
      'Sydney': 'Clear, 78°F'
    };
    return weatherData[location as keyof typeof weatherData] || `Weather data not available for ${location}. Please try a major city.`;
  }
});

// Calculator tool
const calculateTool = tool({
  name: 'calculate',
  description: 'Perform mathematical calculations with expressions',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2", "15 * 0.18")')
  }),
  async execute({ expression }) {
    try {
      // Simple evaluation (in production, use a safer math parser)
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch {
      return `Invalid mathematical expression: ${expression}. Please use basic arithmetic.`;
    }
  }
});

// File search tool
const searchFilesTool = tool({
  name: 'search_files',
  description: 'Search for files by name or content',
  parameters: z.object({
    query: z.string().describe('Search query for finding files')
  }),
  async execute({ query }) {
    // Simulate file search
    const mockFiles = [
      'quarterly_report_q3.pdf',
      'budget_2024.xlsx', 
      'meeting_notes.docx',
      'project_proposal.pptx',
      'user_manual.pdf',
      'financial_data.csv'
    ];
    const results = mockFiles.filter(file => 
      file.toLowerCase().includes(query.toLowerCase())
    );
    
    if (results.length === 0) {
      return `No files found matching "${query}". Available files include reports, budgets, notes, and manuals.`;
    }
    
    return `Found ${results.length} file(s) matching "${query}": ${results.join(', ')}`;
  }
});

// ========================================================================================
// SPECIALIZED AGENTS
// ========================================================================================

function createWeatherAgent(): Agent {
  return new Agent({
    name: 'Weather Assistant',
    instructions: `You are a weather specialist. Use the get_weather tool to provide current weather information for any location.
    
    Always be helpful and provide detailed weather information when requested.`,
    model: 'gpt-4o',
    tools: [getWeatherTool]
  });
}

function createMathAgent(): Agent {
  return new Agent({
    name: 'Math Assistant', 
    instructions: `You are a mathematics specialist. Use the calculate tool to perform mathematical calculations.
    
    You can handle basic arithmetic, percentages, and mathematical expressions. Always show your work when possible.`,
    model: 'gpt-4o',
    tools: [calculateTool]
  });
}

function createResearchAgent(): Agent {
  return new Agent({
    name: 'Research Assistant',
    instructions: `You are a research specialist. Use the search_files tool to find relevant documents and information.
    
    Help users find the information they need from available files and documents.`,
    model: 'gpt-4o',
    tools: [searchFilesTool]
  });
}

function createCoordinatorAgent(): Agent {
  // Create specialized agents for handoffs
  const weatherAgent = createWeatherAgent();
  const mathAgent = createMathAgent();
  const researchAgent = createResearchAgent();

  return new Agent({
    name: 'Coordinator',
    instructions: `You are a coordinator that helps users by delegating to specialized agents when needed.
    
    - For weather-related questions, transfer to the Weather Assistant
    - For math calculations, transfer to the Math Assistant  
    - For research and file searches, transfer to the Research Assistant
    - For general conversation, handle it yourself
    
    Always explain what you're doing when transferring to another agent.`,
    model: 'gpt-4o',
    handoffs: [weatherAgent, mathAgent, researchAgent]
  });
}

// ========================================================================================
// MIDDLEWARE
// ========================================================================================

const withMiddleware = (handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) => {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      // Security headers
      helmet()(req, res, () => {});
      
      // CORS
      await new Promise<void>((resolve, reject) => {
        cors(corsOptions)(req, res, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Rate limiting
      try {
        const key = (req.headers['x-forwarded-for'] as string) || 'default';
        await rateLimiter.consume(key);
      } catch {
        res.status(429).json({
          success: false,
          error: 'rate_limit_exceeded',
          message: 'Too many requests, please try again later'
        });
        return;
      }

      // API key validation
      const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'] as string;
      if (!apiKey || apiKey !== process.env.API_KEY) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or missing API key'
        });
        return;
      }

      await handler(req, res);
    } catch (error) {
      console.error('Middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: 'An unexpected error occurred'
      });
    }
  };
};

// ========================================================================================
// ROUTE HANDLERS
// ========================================================================================

export default withMiddleware(async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const { method, query } = req;
  const path = (query.path as string[]) || [];

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Initialize default agents if not exists
    if (agents.size === 0) {
      initializeDefaultAgents();
    }

    // Route handling
    if (path[0] === 'agents') {
      await handleAgents(req, res, path.slice(1));
    } else if (path[0] === 'chat') {
      await handleChat(req, res, path.slice(1));
    } else if (path[0] === 'quick-chat') {
      await handleQuickChat(req, res);
    } else {
      res.status(404).json({
        success: false,
        error: 'endpoint_not_found',
        message: 'Available endpoints: /agents, /chat, /quick-chat'
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

// ========================================================================================
// AGENT MANAGEMENT
// ========================================================================================

function initializeDefaultAgents(): void {
  // Create and store default agents
  const weatherAgent = createWeatherAgent();
  const mathAgent = createMathAgent();
  const researchAgent = createResearchAgent();
  const coordinatorAgent = createCoordinatorAgent();

  agents.set('weather', weatherAgent);
  agents.set('math', mathAgent);
  agents.set('research', researchAgent);
  agents.set('coordinator', coordinatorAgent);

  // Store configs for API responses
  agentConfigs.set('weather', {
    name: 'Weather Assistant',
    instructions: 'You are a weather specialist that helps users get weather information.',
    model: 'gpt-4o',
    tools: ['get_weather']
  });

  agentConfigs.set('math', {
    name: 'Math Assistant', 
    instructions: 'You are a mathematics specialist that helps users with calculations.',
    model: 'gpt-4o',
    tools: ['calculate']
  });

  agentConfigs.set('research', {
    name: 'Research Assistant',
    instructions: 'You are a research specialist that helps users find files and documents.',
    model: 'gpt-4o', 
    tools: ['search_files']
  });

  agentConfigs.set('coordinator', {
    name: 'Coordinator',
    instructions: 'You are a coordinator that routes requests to specialized agents.',
    model: 'gpt-4o',
    handoffs: ['weather', 'math', 'research']
  });
}

async function handleAgents(req: VercelRequest, res: VercelResponse, path: string[]): Promise<void> {
  if (req.method === 'GET' && path.length === 0) {
    // List all agents
    const agentList = Array.from(agentConfigs.entries()).map(([id, config]) => ({
      id,
      ...config,
      created_at: Date.now()
    }));

    res.json({
      success: true,
      data: agentList
    });
  } else if (req.method === 'POST' && path.length === 0) {
    // Create custom agent
    try {
      const agentData = AgentCreateSchema.parse(req.body);
      
      const agent = new Agent({
        name: agentData.name,
        instructions: agentData.instructions,
        model: agentData.model,
        tools: agentData.tools
      });

      const agentId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      agents.set(agentId, agent);
      agentConfigs.set(agentId, agentData);

      res.status(201).json({
        success: true,
        data: {
          id: agentId,
          ...agentData,
          created_at: Date.now()
        },
        message: 'Custom agent created successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid input data',
          details: error.issues
        });
      } else {
        throw error;
      }
    }
  } else if (req.method === 'GET' && path.length === 1) {
    // Get specific agent
    const agentId = path[0];
    const config = agentConfigs.get(agentId);
    
    if (!config) {
      res.status(404).json({
        success: false,
        error: 'agent_not_found',
        message: 'Agent not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: agentId,
        ...config
      }
    });
  } else {
    res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: `Method ${req.method} not allowed`
    });
  }
}

// ========================================================================================
// CHAT HANDLERS
// ========================================================================================

async function handleChat(req: VercelRequest, res: VercelResponse, path: string[]): Promise<void> {
  if (req.method === 'POST' && path.length === 1) {
    const agentId = path[0];
    const agent = agents.get(agentId);
    
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'agent_not_found',
        message: 'Agent not found'
      });
      return;
    }

    try {
      const chatData = ChatSchema.parse(req.body);
      
      if (chatData.stream) {
        // Streaming response
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        res.write(`data: ${JSON.stringify({ type: 'start', agent: agentId })}\n\n`);

        try {
          const input = chatData.history.length > 0 
            ? [...chatData.history, user(chatData.message)]
            : chatData.message;
          
          const result = await run(agent, input, {
            stream: true
          });

          res.write(`data: ${JSON.stringify({ 
            type: 'result', 
            data: {
              response: result.finalOutput,
              history: result.history,
              agent_used: agentId,
              last_agent: result.lastAgent?.name || agentId
            }
          })}\n\n`);

          res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        } catch (error) {
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`);
        }
        
        res.end();
      } else {
        // Regular response
        const input = chatData.history.length > 0 
          ? [...chatData.history, user(chatData.message)]
          : chatData.message;
        
        const result = await run(agent, input);

        res.json({
          success: true,
          data: {
            response: result.finalOutput,
            history: result.history,
            agent_used: agentId,
            last_agent: result.lastAgent?.name || agentId,
            run_id: Date.now().toString()
          }
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid input data',
          details: error.issues
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'chat_error',
          message: error instanceof Error ? error.message : 'Failed to process chat'
        });
      }
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: `Method ${req.method} not allowed`
    });
  }
}

// Quick chat with coordinator (smart routing)
async function handleQuickChat(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'POST') {
    try {
      const chatData = ChatSchema.parse(req.body);
      const coordinatorAgent = agents.get('coordinator');
      
      if (!coordinatorAgent) {
        res.status(500).json({
          success: false,
          error: 'coordinator_not_available',
          message: 'Coordinator agent not available'
        });
        return;
      }

      const input = chatData.history.length > 0 
        ? [...chatData.history, user(chatData.message)]
        : chatData.message;
      
      const result = await run(coordinatorAgent, input);

      res.json({
        success: true,
        data: {
          response: result.finalOutput,
          history: result.history,
          agent_used: 'coordinator',
          last_agent: result.lastAgent?.name || 'coordinator'
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid input data',
          details: error.issues
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'quick_chat_error',
          message: error instanceof Error ? error.message : 'Failed to process quick chat'
        });
      }
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST method allowed for quick chat'
    });
  }
}
