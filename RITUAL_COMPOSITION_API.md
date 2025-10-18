# 🚀 OpenAI Agents API - Kopieerbare Specificatie

## 📋 **Basis Informatie**

```
Base URL: https://yahla.vercel.app
API Version: 2.0.0
Authentication: x-api-key header
Content-Type: application/json
```

## 🔐 **Authentication**

```http
x-api-key: YOUR_API_KEY
```

## 🛠 **Alle Beschikbare Agents**

### **Originele Agents**
- `weather` - Weather Assistant
- `math` - Math Assistant  
- `research` - Research Assistant
- `coordinator` - General Coordinator

### **Ritual Composition Agents**
- `composer-anthropology` - Culturele structuren, symboliek
- `composer-biology` - Ecologische processen, natuurlijke ritmes
- `composer-psychology` - Betekenisvorming, emotie, transformatie
- `composer-economy` - Waarde-uitwisseling, balans, duurzaamheid
- `composer-ergonomics` - Lichaam, beweging, ademhaling, ruimte
- `synthesizer` - Combineert perspectieven tot coherent ritueel
- `red-flag-checker` - Ethische risico analyse
- `revisor` - Herformuleert rituelen om issues op te lossen
- `ritual-workflow` - Complete workflow coordinator

## 🌐 **API Endpoints**

### **Agent Discovery**
```http
GET /api/agents
GET /api/agents/{agent_id}
```

### **Chat Endpoints**
```http
POST /api/quick-chat
POST /api/chat/{agent_id}
POST /api/chat/weather
```

### **Ritual Composition Endpoints**
```http
POST /api/chat/composer-anthropology
POST /api/chat/composer-biology
POST /api/chat/composer-psychology
POST /api/chat/composer-economy
POST /api/chat/composer-ergonomics
POST /api/chat/synthesizer
POST /api/chat/red-flag-checker
POST /api/chat/revisor
POST /api/chat/ritual-workflow
```

## 📊 **JSON Output Schemas**

### **Composer Agents (anthropology, biology, psychology, economy, ergonomics)**
```json
{
  "koan": "string (max 100 woorden)",
  "activity": "string (max 50 woorden)",
  "symbolism": "string (max 50 woorden)"
}
```

### **Synthesizer & Revisor**
```json
{
  "koan": "string (200-250 woorden)",
  "activity": "string (bijv. 'Rituele wandeling')",
  "activityDescription": "string (400-500 woorden)",
  "themes": ["string", "string", "string"]
}
```

### **Red Flag Checker**
```json
{
  "flagged": boolean,
  "issues": ["string"],
  "suggestions": ["string"]
}
```

## 💻 **Code Voorbeelden**

### **JavaScript/TypeScript Client**
```javascript
class RitualCompositionClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://yahla.vercel.app';
  }

  async createRitual(request) {
    const response = await fetch(`${this.baseUrl}/api/chat/ritual-workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({
        message: request,
        history: []
      })
    });
    return response.json();
  }

  async getComposerPerspective(perspective, request) {
    const response = await fetch(`${this.baseUrl}/api/chat/composer-${perspective}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({
        message: request,
        history: []
      })
    });
    return response.json();
  }

  async checkEthicalRisks(ritual) {
    const response = await fetch(`${this.baseUrl}/api/chat/red-flag-checker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({
        message: `Analyseer dit ritueel: ${ritual}`,
        history: []
      })
    });
    return response.json();
  }

  async listAllAgents() {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      headers: { 'x-api-key': this.apiKey }
    });
    return response.json();
  }
}

// Gebruik
const client = new RitualCompositionClient('your-api-key');

// Complete ritueel workflow
const ritual = await client.createRitual('Maak een ochtend meditatie ritueel voor stress reductie');

// Specifiek perspectief
const psychologyPerspective = await client.getComposerPerspective('psychology', 'Ritueel voor zelfvertrouwen');

// Ethische check
const ethicalCheck = await client.checkEthicalRisks('Ritueel beschrijving hier...');
```

### **Python Client**
```python
import requests

class RitualCompositionClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://yahla.vercel.app"
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }
    
    def create_ritual(self, request):
        response = requests.post(
            f"{self.base_url}/api/chat/ritual-workflow",
            headers=self.headers,
            json={"message": request, "history": []}
        )
        return response.json()
    
    def get_composer_perspective(self, perspective, request):
        response = requests.post(
            f"{self.base_url}/api/chat/composer-{perspective}",
            headers=self.headers,
            json={"message": request, "history": []}
        )
        return response.json()
    
    def check_ethical_risks(self, ritual):
        response = requests.post(
            f"{self.base_url}/api/chat/red-flag-checker",
            headers=self.headers,
            json={"message": f"Analyseer dit ritueel: {ritual}", "history": []}
        )
        return response.json()
    
    def list_all_agents(self):
        response = requests.get(
            f"{self.base_url}/api/agents",
            headers={"x-api-key": self.api_key}
        )
        return response.json()

# Gebruik
client = RitualCompositionClient("your-api-key")

# Complete ritueel workflow
ritual = client.create_ritual("Maak een ochtend meditatie ritueel voor stress reductie")

# Specifiek perspectief  
psychology_perspective = client.get_composer_perspective("psychology", "Ritueel voor zelfvertrouwen")

# Ethische check
ethical_check = client.check_ethical_risks("Ritueel beschrijving hier...")
```

### **cURL Voorbeelden**
```bash
# Lijst alle agents
curl -X GET "https://yahla.vercel.app/api/agents" \
  -H "x-api-key: YOUR_API_KEY"

# Complete ritueel workflow
curl -X POST "https://yahla.vercel.app/api/chat/ritual-workflow" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Maak een ochtend meditatie ritueel voor stress reductie",
    "history": []
  }'

# Specifiek composer agent
curl -X POST "https://yahla.vercel.app/api/chat/composer-psychology" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ritueel voor zelfvertrouwen",
    "history": []
  }'

# Ethische risico check
curl -X POST "https://yahla.vercel.app/api/chat/red-flag-checker" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyseer dit ritueel: [ritueel beschrijving]",
    "history": []
  }'
```

## 🔄 **Ritual Workflow Process**

1. **Input** → `ritual-workflow` agent ontvangt ritueel verzoek
2. **Compositie** → Routeert naar alle 5 composer agents
3. **Verzameling** → Verzamelt perspectieven van alle composers
4. **Synthese** → `synthesizer` integreert tot coherent ritueel
5. **Ethische Check** → `red-flag-checker` analyseert risico's
6. **Revisie** → `revisor` lost eventuele issues op (indien nodig)
7. **Output** → Finaal ethisch verantwoord ritueel

## 🎯 **Use Cases voor Lovable.dev**

### **Vervang Conversation Starters**
```javascript
// In plaats van statische starters
const response = await client.createRitual(userInput);
```

### **Multi-Agent Ritual Generation**
```javascript
// Specifieke perspectieven combineren
const perspectives = await Promise.all([
  client.getComposerPerspective('anthropology', request),
  client.getComposerPerspective('biology', request),
  client.getComposerPerspective('psychology', request)
]);
```

### **Ethische Validatie**
```javascript
// Automatische ethische checks
const ritual = await client.createRitual(request);
const ethicalCheck = await client.checkEthicalRisks(ritual.data.response);
```

## ⚡ **Snelle Test**

```bash
# Test de API (vervang YOUR_API_KEY)
curl -X GET "https://yahla.vercel.app/api/agents" \
  -H "x-api-key: YOUR_API_KEY"
```

## 📋 **Error Responses**

```json
// 401 Unauthorized
{
  "success": false,
  "error": "unauthorized",
  "message": "Invalid or missing API key"
}

// 404 Not Found
{
  "success": false,
  "error": "agent_not_found",
  "message": "Agent not found"
}

// 429 Rate Limited
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Too many requests, please try again later"
}
```

---

**🚀 Ready for Integration!** Alle nieuwe ritual composition agents zijn live en klaar voor gebruik in Lovable.dev!