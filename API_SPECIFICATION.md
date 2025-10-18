# OpenAI Agents API Specification

## 🚀 **Base Information**

- **Base URL**: `https://yahla.vercel.app`
- **API Version**: `1.0.0`
- **Protocol**: HTTPS
- **Content-Type**: `application/json`

## 🔐 **Authentication**

All endpoints require API key authentication via header:

```http
x-api-key: YOUR_API_KEY
```

Alternative authentication (Bearer token):
```http
Authorization: Bearer YOUR_API_KEY
```

## 📊 **Rate Limiting**

- **Limit**: 100 requests per minute per IP
- **Response**: `429 Too Many Requests` when exceeded

## 🛠 **API Endpoints**

### **1. List Agents**
```http
GET /api/agents
```

**Description**: Retrieve all available AI agents and their configurations.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "weather",
      "name": "Weather Assistant",
      "instructions": "You are a weather specialist that helps users get weather information.",
      "model": "gpt-4o",
      "tools": ["get_weather"],
      "created_at": 1697472000000
    },
    {
      "id": "math",
      "name": "Math Assistant",
      "instructions": "You are a mathematics specialist that helps users with calculations.",
      "model": "gpt-4o",
      "tools": ["calculate"],
      "created_at": 1697472000000
    },
    {
      "id": "research",
      "name": "Research Assistant",
      "instructions": "You are a research specialist that helps users find files and documents.",
      "model": "gpt-4o",
      "tools": ["search_files"],
      "created_at": 1697472000000
    },
    {
      "id": "coordinator",
      "name": "Coordinator",
      "instructions": "You are a coordinator that routes requests to specialized agents.",
      "model": "gpt-4o",
      "handoffs": ["weather", "math", "research"],
      "created_at": 1697472000000
    }
  ]
}
```

### **2. Get Specific Agent**
```http
GET /api/agents/{agent_id}
```

**Parameters**:
- `agent_id`: Agent identifier (weather, math, research, coordinator)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "weather",
    "name": "Weather Assistant",
    "instructions": "You are a weather specialist that helps users get weather information.",
    "model": "gpt-4o",
    "tools": ["get_weather"]
  }
}
```

### **3. Chat with Specific Agent**
```http
POST /api/chat/{agent_id}
```

**Parameters**:
- `agent_id`: Agent identifier (weather, math, research, coordinator)

**Request Body**:
```json
{
  "message": "What's the weather in Amsterdam?",
  "history": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant", 
      "content": "Hi! How can I help you today?"
    }
  ],
  "stream": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "The current weather in Amsterdam is 15°C with partly cloudy skies...",
    "history": [
      {
        "role": "user",
        "content": "What's the weather in Amsterdam?"
      },
      {
        "role": "assistant",
        "content": "The current weather in Amsterdam is 15°C with partly cloudy skies..."
      }
    ],
    "agent_used": "weather",
    "tools_used": ["get_weather"]
  }
}
```

### **4. Quick Chat (Smart Routing)**
```http
POST /api/quick-chat
```

**Description**: Intelligent routing via coordinator agent to the most appropriate specialist.

**Request Body**:
```json
{
  "message": "Calculate 25 * 47 and tell me the weather in London",
  "history": [],
  "stream": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "I'll help you with both requests. First, 25 * 47 = 1175. For London weather, it's currently 12°C with light rain...",
    "history": [...],
    "agent_used": "coordinator",
    "last_agent": "Math Assistant"
  }
}
```

### **5. Weather Chat (Direct)**
```http
POST /api/chat/weather
```

**Description**: Direct access to weather agent for weather-related queries.

**Request Body**:
```json
{
  "message": "What's the weather forecast for this week in Berlin?",
  "history": [],
  "stream": false
}
```

## 🔧 **Advanced Features & Capabilities**

### **Multi-Agent Workflows with Handoffs**
```json
{
  "coordinator": {
    "can_handoff_to": ["weather", "math", "research"],
    "intelligent_routing": true,
    "context_preservation": true
  }
}
```

### **Stateful Conversations**
- Conversation history maintained across multiple turns
- Context preserved during agent handoffs
- Session continuity for complex workflows

### **Built-in Tools & Function Calling**

#### Weather Agent Tools:
```json
{
  "get_weather": {
    "description": "Get current weather for any location",
    "parameters": {
      "location": "string",
      "units": "metric|imperial"
    }
  }
}
```

#### Math Agent Tools:
```json
{
  "calculate": {
    "description": "Perform mathematical calculations",
    "parameters": {
      "expression": "string"
    }
  }
}
```

#### Research Agent Tools:
```json
{
  "search_files": {
    "description": "Search for files by name or content",
    "parameters": {
      "query": "string"
    }
  }
}
```

### **Streaming Support**
Set `"stream": true` in request body for real-time responses:

```json
{
  "message": "Tell me about the weather",
  "stream": true
}
```

**Streaming Response Format**:
```
data: {"type": "start", "agent": "weather"}

data: {"type": "content", "delta": "The weather"}

data: {"type": "content", "delta": " in your area"}

data: {"type": "end", "response": "complete response"}
```

## ❌ **Error Responses**

### **401 Unauthorized**
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Invalid or missing API key"
}
```

### **404 Not Found**
```json
{
  "success": false,
  "error": "agent_not_found", 
  "message": "Agent not found"
}
```

### **400 Bad Request**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "message",
      "issue": "Required field missing"
    }
  ]
}
```

### **429 Rate Limited**
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Too many requests, please try again later"
}
```

### **500 Internal Error**
```json
{
  "success": false,
  "error": "internal_error",
  "message": "An unexpected error occurred"
}
```

## 🎯 **Use Cases & Integration Scenarios**

### **1. Replace Conversation Starters**
```javascript
// Instead of static conversation starters
const response = await fetch('https://yahla.vercel.app/api/quick-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    message: userInput,
    history: conversationHistory
  })
});
```

### **2. Multi-Agent Ritual Generation**
```javascript
// Coordinate between research, planning, and execution agents
const ritualPlan = await fetch('https://yahla.vercel.app/api/chat/coordinator', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    message: "Create a morning meditation ritual with research-backed benefits",
    history: []
  })
});
```

### **3. Specialized Agent Features**
```javascript
// Weather-specific functionality
const weather = await fetch('https://yahla.vercel.app/api/chat/weather', {
  method: 'POST',
  body: JSON.stringify({
    message: "Weather for my meditation session location"
  })
});

// Math calculations for habit tracking
const calculations = await fetch('https://yahla.vercel.app/api/chat/math', {
  method: 'POST', 
  body: JSON.stringify({
    message: "Calculate my 30-day habit completion rate: 24 completed out of 30 days"
  })
});
```

## 🔗 **SDK Integration Examples**

### **JavaScript/TypeScript**
```typescript
class LovableAgentsClient {
  constructor(private apiKey: string, private baseUrl = 'https://yahla.vercel.app') {}
  
  async quickChat(message: string, history: any[] = []) {
    const response = await fetch(`${this.baseUrl}/api/quick-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ message, history })
    });
    return response.json();
  }
  
  async chatWithAgent(agentId: string, message: string, history: any[] = []) {
    const response = await fetch(`${this.baseUrl}/api/chat/${agentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ message, history })
    });
    return response.json();
  }
  
  async getAgents() {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      headers: { 'x-api-key': this.apiKey }
    });
    return response.json();
  }
}
```

### **Python**
```python
import requests

class LovableAgentsClient:
    def __init__(self, api_key: str, base_url: str = "https://yahla.vercel.app"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }
    
    def quick_chat(self, message: str, history: list = None):
        if history is None:
            history = []
        
        response = requests.post(
            f"{self.base_url}/api/quick-chat",
            headers=self.headers,
            json={"message": message, "history": history}
        )
        return response.json()
    
    def chat_with_agent(self, agent_id: str, message: str, history: list = None):
        if history is None:
            history = []
            
        response = requests.post(
            f"{self.base_url}/api/chat/{agent_id}",
            headers=self.headers,
            json={"message": message, "history": history}
        )
        return response.json()
```

## 🚀 **Deployment & Environment**

**Environment Variables Required**:
- `OPENAI_API_KEY`: Your OpenAI API key
- `API_KEY`: Client authentication key
- `ALLOWED_ORIGINS`: CORS origins (optional)

**Hosting**: Vercel Serverless Functions
**Runtime**: Node.js 18+
**Dependencies**: OpenAI Agents SDK v0.1.9, Zod v3.23.8