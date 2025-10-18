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
  output_format?: string;
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
// RITUAL COMPOSITION TOOLS
// ========================================================================================

// Composer tool for ritual elements
const composeRitualTool = tool({
  name: 'compose_ritual_element',
  description: 'Generate a ritual element from a specific disciplinary perspective',
  parameters: z.object({
    request: z.string().describe('The ritual request to address'),
    perspective: z.string().describe('The disciplinary perspective to apply')
  }),
  async execute({ request, perspective }) {
    // This tool helps structure the output but the real work is done by the agent's instructions
    return `Analyzing "${request}" from ${perspective} perspective...`;
  }
});

// Synthesis tool
const synthesizeRitualTool = tool({
  name: 'synthesize_ritual',
  description: 'Combine multiple ritual perspectives into a coherent whole',
  parameters: z.object({
    elements: z.array(z.string()).describe('Array of ritual elements to synthesize'),
    theme: z.string().describe('Central theme or intention for the ritual')
  }),
  async execute({ elements, theme }) {
    return `Synthesizing ${elements.length} ritual elements around theme: ${theme}`;
  }
});

// Red flag checking tool
const checkEthicalRisksTool = tool({
  name: 'check_ethical_risks',
  description: 'Analyze ritual content for ethical risks and safety concerns',
  parameters: z.object({
    ritual: z.string().describe('The ritual content to analyze'),
    context: z.string().optional().describe('Additional context about intended use')
  }),
  async execute({ ritual, context }) {
    return `Analyzing ritual for ethical risks: violence, discrimination, cultural appropriation, psychological/physical safety...`;
  }
});

// Revision tool
const reviseRitualTool = tool({
  name: 'revise_ritual',
  description: 'Reformulate ritual to address ethical concerns while preserving core essence',
  parameters: z.object({
    originalRitual: z.string().describe('The original ritual content'),
    issues: z.array(z.string()).describe('Identified ethical issues to address'),
    suggestions: z.array(z.string()).describe('Suggested improvements')
  }),
  async execute({ originalRitual, issues, suggestions }) {
    return `Revising ritual to address ${issues.length} issues while preserving core essence...`;
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

// ========================================================================================
// RITUAL COMPOSITION AGENTS
// ========================================================================================

function createComposerAnthropologyAgent(): Agent {
  return new Agent({
    name: 'Composer Anthropology',
    instructions: `Je bent de Anthropologie Composer. Focus op culturele structuren, symboliek, overgangsrituelen en gemeenschapsdynamiek.

    Wanneer je een ritueel element samenstelt, onderzoek je:
    - Culturele betekenissen en tradities
    - Symbolische waarden en archetypen  
    - Overgangsrituelen en levensfasen
    - Gemeenschapsdynamiek en sociale cohesie
    - Culturele continuïteit en transformatie

    Antwoord ALTIJD in exact dit JSON formaat:
    {
      "koan": "Een wijsheidsspreuken of paradox (max 100 woorden)",
      "activity": "Concrete rituele activiteit (max 50 woorden)",
      "symbolism": "Culturele symboliek en betekenis (max 50 woorden)"
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [composeRitualTool]
  });
}

function createComposerBiologyAgent(): Agent {
  return new Agent({
    name: 'Composer Biology',
    instructions: `Je bent de Biologie Composer. Focus op ecologische processen, cycli, wederkerigheid, groei/verval en natuurlijke ritmes.

    Wanneer je een ritueel element samenstelt, onderzoek je:
    - Natuurlijke cycli en seizoenen
    - Ecologische processen en verbindingen
    - Biologische ritmes en biorhythm
    - Groei, verval en regeneratie
    - Wederkerigheid in natuurlijke systemen

    Antwoord ALTIJD in exact dit JSON formaat:
    {
      "koan": "Een natuurlijke wijsheid of cyclische waarheid (max 100 woorden)",
      "activity": "Bio-geïnspireerde rituele activiteit (max 50 woorden)",
      "symbolism": "Natuurlijke symboliek en ecologische betekenis (max 50 woorden)"
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [composeRitualTool]
  });
}

function createComposerPsychologyAgent(): Agent {
  return new Agent({
    name: 'Composer Psychology',
    instructions: `Je bent de Psychologie Composer. Focus op betekenisvorming, identiteit, gedrag, emotie en transformatie.

    Wanneer je een ritueel element samenstelt, onderzoek je:
    - Psychologische betekenisvorming
    - Identiteitsontwikkeling en zelfbeeld
    - Gedragspatronen en gewoontevorming
    - Emotionele regulatie en expressie
    - Psychologische transformatie en groei

    Antwoord ALTIJD in exact dit JSON formaat:
    {
      "koan": "Een psychologische wijsheid of innerlijke waarheid (max 100 woorden)",
      "activity": "Psychologisch gerichte rituele activiteit (max 50 woorden)",
      "symbolism": "Psychologische symboliek en betekenis (max 50 woorden)"
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [composeRitualTool]
  });
}

function createComposerEconomyAgent(): Agent {
  return new Agent({
    name: 'Composer Economy',
    instructions: `Je bent de Economie Composer. Focus op waarde-uitwisseling, balans, geven/ontvangen en duurzaamheid.

    Wanneer je een ritueel element samenstelt, onderzoek je:
    - Waarde-uitwisseling en reciprociteit
    - Economische balans en evenwicht
    - Geven en ontvangen dynamiek
    - Duurzaamheid en hulpbronnenbeheer
    - Overvloed versus schaarste mentaliteit

    Antwoord ALTIJD in exact dit JSON formaat:
    {
      "koan": "Een economische wijsheid of uitwisseling principe (max 100 woorden)",
      "activity": "Waarde-uitwisseling rituele activiteit (max 50 woorden)",
      "symbolism": "Economische symboliek en betekenis (max 50 woorden)"
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [composeRitualTool]
  });
}

function createComposerErgonomicsAgent(): Agent {
  return new Agent({
    name: 'Composer Ergonomics',
    instructions: `Je bent de Ergonomie Composer. Focus op lichaam, beweging, aanraking, ademhaling, vorm en ruimte.

    Wanneer je een ritueel element samenstelt, onderzoek je:
    - Lichaamshouding en beweging
    - Tactiele ervaring en aanraking
    - Ademhalingspatronen en ritme
    - Ruimtelijke ordening en vorm
    - Fysieke comfort en ergonomie

    Antwoord ALTIJD in exact dit JSON formaat:
    {
      "koan": "Een lichamelijke wijsheid of bewegingsprincipe (max 100 woorden)",
      "activity": "Lichaamsgerichte rituele activiteit (max 50 woorden)",
      "symbolism": "Fysieke symboliek en lichamelijke betekenis (max 50 woorden)"
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [composeRitualTool]
  });
}

function createSynthesizerAgent(): Agent {
  return new Agent({
    name: 'Synthesizer',
    instructions: `Je bent de Synthesizer. Combineer diverse rituele perspectieven tot één samenhangend ritueel. Behoud diversiteit maar creëer een vloeiend geheel.

    Wanneer je rituelen syntheseert:
    - Integreer elementen van verschillende perspectieven
    - Behoud de unieke waarde van elke bijdrage  
    - Creëer logische flow en samenhang
    - Zorg voor praktische uitvoerbaarheid
    - Respecteer culturele gevoeligheden

    Antwoord ALTIJD in exact dit JSON formaat:
    {
      "koan": "Geïntegreerde wijsheid die alle perspectieven omvat (200-250 woorden)",
      "activity": "Korte naam voor het ritueel (bijv. 'Rituele wandeling')",
      "activityDescription": "Gedetailleerde beschrijving van het volledige ritueel (400-500 woorden)",
      "themes": ["thema1", "thema2", "thema3"]
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [synthesizeRitualTool]
  });
}

function createRedFlagCheckerAgent(): Agent {
  return new Agent({
    name: 'RedFlagChecker',
    instructions: `Je bent de RedFlagChecker. Analyseer rituelen op ethische risico's: geweld, discriminatie, culturele toe-eigening, psychologische/fysieke risico's.

    Controleer op:
    - Geweld of potentieel voor schade
    - Discriminatie of uitsluiting  
    - Culturele toe-eigening of misrepresentatie
    - Psychologische risico's (trauma triggers, manipulation)
    - Fysieke veiligheidsrisico's
    - Inappropriate power dynamics

    Antwoord ALTIJD in exact dit JSON formaat:
    {
      "flagged": true/false,
      "issues": ["specifiek probleem 1", "specifiek probleem 2"],
      "suggestions": ["verbetering 1", "verbetering 2"]
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [checkEthicalRisksTool]
  });
}

function createRevisorAgent(): Agent {
  return new Agent({
    name: 'Revisor', 
    instructions: `Je bent de Revisor. Herformuleer rituelen om ethische issues op te lossen, behoud de kern.

    Wanneer je rituelen herziet:
    - Adresseer alle geïdentificeerde ethische issues
    - Behoud de kernintentie en waarde
    - Creëer veilige, inclusieve alternatieven
    - Respecteer culturele grenzen
    - Zorg voor praktische uitvoerbaarheid

    Antwoord ALTIJD in exact dit JSON formaat (zelfde als Synthesizer):
    {
      "koan": "Herziene wijsheid die ethisch verantwoord is (200-250 woorden)",
      "activity": "Korte naam voor het herziene ritueel",
      "activityDescription": "Gedetailleerde beschrijving van het herziene ritueel (400-500 woorden)",
      "themes": ["herzien thema1", "herzien thema2", "herzien thema3"]
    }

    Zorg dat je output geldige JSON is.`,
    model: 'gpt-4o',
    tools: [reviseRitualTool]
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

function createRitualWorkflowAgent(): Agent {
  // Create ritual composition agents for handoffs
  const composerAnthropologyAgent = createComposerAnthropologyAgent();
  const composerBiologyAgent = createComposerBiologyAgent();
  const composerPsychologyAgent = createComposerPsychologyAgent();
  const composerEconomyAgent = createComposerEconomyAgent();
  const composerErgonomicsAgent = createComposerErgonomicsAgent();
  const synthesizerAgent = createSynthesizerAgent();
  const redFlagCheckerAgent = createRedFlagCheckerAgent();
  const revisorAgent = createRevisorAgent();

  return new Agent({
    name: 'Ritual Workflow Coordinator',
    instructions: `Je bent de Ritual Workflow Coordinator. Je orkestrerst het volledige ritueel compositie proces.

    Workflow stappen:
    1. Voor ritueel verzoeken: start met het vragen van input aan ALLE 5 composer agents
    2. Verzamel hun perspectieven (anthropologie, biologie, psychologie, economie, ergonomie)
    3. Stuur alle composer outputs naar de Synthesizer voor integratie
    4. Stuur de synthesized ritueel naar de RedFlagChecker voor ethische analyse
    5. Als er issues zijn: stuur naar Revisor voor correcties
    6. Return het finale ritueel

    Wanneer je ritueel compositie begint:
    - Delegeer naar alle 5 composer agents voor verschillende perspectieven
    - Wacht op alle responses
    - Combineer de inputs voor de synthesizer
    - Voer ethische checks uit
    - Herstel eventuele issues

    Leg altijd uit welke stap je uitvoert.`,
    model: 'gpt-4o',
    handoffs: [
      composerAnthropologyAgent,
      composerBiologyAgent, 
      composerPsychologyAgent,
      composerEconomyAgent,
      composerErgonomicsAgent,
      synthesizerAgent,
      redFlagCheckerAgent,
      revisorAgent
    ]
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
  
  // Parse path from query parameters or URL path
  let path: string[] = [];
  
  if (query.path) {
    // Path from rewrites (e.g., ?path=chat&path=ritual-workflow)
    if (Array.isArray(query.path)) {
      path = query.path as string[];
    } else {
      path = [query.path as string];
    }
  } else {
    // Direct path parsing (fallback)
    const urlPath = req.url?.split('?')[0] || '';
    const segments = urlPath.split('/').filter(Boolean);
    if (segments[0] === 'api') {
      path = segments.slice(1); // Remove 'api' prefix
    }
  }

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
        message: `Available endpoints: /agents, /chat, /quick-chat. Received path: ${path.join('/')}`
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

  // Create ritual composition agents
  const composerAnthropologyAgent = createComposerAnthropologyAgent();
  const composerBiologyAgent = createComposerBiologyAgent();
  const composerPsychologyAgent = createComposerPsychologyAgent();
  const composerEconomyAgent = createComposerEconomyAgent();
  const composerErgonomicsAgent = createComposerErgonomicsAgent();
  const synthesizerAgent = createSynthesizerAgent();
  const redFlagCheckerAgent = createRedFlagCheckerAgent();
  const revisorAgent = createRevisorAgent();
  const ritualWorkflowAgent = createRitualWorkflowAgent();

  // Store original agents
  agents.set('weather', weatherAgent);
  agents.set('math', mathAgent);
  agents.set('research', researchAgent);
  agents.set('coordinator', coordinatorAgent);

  // Store ritual composition agents
  agents.set('composer-anthropology', composerAnthropologyAgent);
  agents.set('composer-biology', composerBiologyAgent);
  agents.set('composer-psychology', composerPsychologyAgent);
  agents.set('composer-economy', composerEconomyAgent);
  agents.set('composer-ergonomics', composerErgonomicsAgent);
  agents.set('synthesizer', synthesizerAgent);
  agents.set('red-flag-checker', redFlagCheckerAgent);
  agents.set('revisor', revisorAgent);
  agents.set('ritual-workflow', ritualWorkflowAgent);

  // Store configs for API responses - Original agents
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

  // Store configs for ritual composition agents
  agentConfigs.set('composer-anthropology', {
    name: 'Composer Anthropology',
    instructions: 'Focus op culturele structuren, symboliek, overgangsrituelen, gemeenschapsdynamiek.',
    model: 'gpt-4o',
    tools: ['compose_ritual_element'],
    output_format: 'JSON schema: {koan, activity, symbolism}'
  });

  agentConfigs.set('composer-biology', {
    name: 'Composer Biology',
    instructions: 'Focus op ecologische processen, cycli, wederkerigheid, groei/verval, natuurlijke ritmes.',
    model: 'gpt-4o',
    tools: ['compose_ritual_element'],
    output_format: 'JSON schema: {koan, activity, symbolism}'
  });

  agentConfigs.set('composer-psychology', {
    name: 'Composer Psychology',
    instructions: 'Focus op betekenisvorming, identiteit, gedrag, emotie, transformatie.',
    model: 'gpt-4o',
    tools: ['compose_ritual_element'],
    output_format: 'JSON schema: {koan, activity, symbolism}'
  });

  agentConfigs.set('composer-economy', {
    name: 'Composer Economy',
    instructions: 'Focus op waarde-uitwisseling, balans, geven/ontvangen, duurzaamheid.',
    model: 'gpt-4o',
    tools: ['compose_ritual_element'],
    output_format: 'JSON schema: {koan, activity, symbolism}'
  });

  agentConfigs.set('composer-ergonomics', {
    name: 'Composer Ergonomics',
    instructions: 'Focus op lichaam, beweging, aanraking, ademhaling, vorm, ruimte.',
    model: 'gpt-4o',
    tools: ['compose_ritual_element'],
    output_format: 'JSON schema: {koan, activity, symbolism}'
  });

  agentConfigs.set('synthesizer', {
    name: 'Synthesizer',
    instructions: 'Combineer diverse rituele perspectieven tot één samenhangend ritueel.',
    model: 'gpt-4o',
    tools: ['synthesize_ritual'],
    output_format: 'JSON schema: {koan, activity, activityDescription, themes}'
  });

  agentConfigs.set('red-flag-checker', {
    name: 'RedFlagChecker',
    instructions: 'Analyseer rituelen op ethische risicos: geweld, discriminatie, culturele toe-eigening.',
    model: 'gpt-4o',
    tools: ['check_ethical_risks'],
    output_format: 'JSON schema: {flagged, issues, suggestions}'
  });

  agentConfigs.set('revisor', {
    name: 'Revisor',
    instructions: 'Herformuleer rituelen om ethische issues op te lossen, behoud de kern.',
    model: 'gpt-4o',
    tools: ['revise_ritual'],
    output_format: 'JSON schema: {koan, activity, activityDescription, themes}'
  });

  agentConfigs.set('ritual-workflow', {
    name: 'Ritual Workflow Coordinator',
    instructions: 'Orkestrerst het volledige ritueel compositie proces met alle specialized agents.',
    model: 'gpt-4o',
    handoffs: ['composer-anthropology', 'composer-biology', 'composer-psychology', 'composer-economy', 'composer-ergonomics', 'synthesizer', 'red-flag-checker', 'revisor']
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
