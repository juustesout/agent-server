# Vercel CLI Deployment

## Prerequisites
```bash
npm install -g vercel
```

## Deployment Steps

1. **Login to Vercel**:
```bash
vercel login
```

2. **Deploy from project root**:
```bash
cd "c:\Users\juust\Local Sites\agentic\app\public\wp-content\plugins\agent-server"
vercel
```

3. **Follow the prompts**:
   - Set up and deploy? → Y
   - Which scope? → Your account
   - Link to existing project? → N
   - Project name? → agent-server (or your choice)
   - Directory? → ./
   - Override settings? → N

4. **Set environment variables**:
```bash
vercel env add OPENAI_API_KEY
vercel env add API_KEY
vercel env add ALLOWED_ORIGINS
```

5. **Redeploy with env vars**:
```bash
vercel --prod
```