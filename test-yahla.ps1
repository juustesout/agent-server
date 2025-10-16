# Test Commands voor yahla.vercel.app

## 1. Test agents endpoint
curl https://yahla.vercel.app/api/agents `
  -H "Authorization: Bearer YOUR_API_KEY" `
  -H "Content-Type: application/json"

## 2. Test quick chat (smart routing)
curl https://yahla.vercel.app/api/quick-chat `
  -X POST `
  -H "Authorization: Bearer YOUR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"What is the weather in Tokyo?\"}'

## 3. Test math agent
curl https://yahla.vercel.app/api/chat/math `
  -X POST `
  -H "Authorization: Bearer YOUR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"Calculate 15% tip on 84.50 euro\"}'

## 4. Test weather agent
curl https://yahla.vercel.app/api/chat/weather `
  -X POST `
  -H "Authorization: Bearer YOUR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"How is the weather in London?\"}'

## 5. Test with conversation history
curl https://yahla.vercel.app/api/chat/coordinator `
  -X POST `
  -H "Authorization: Bearer YOUR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"I need help\", \"history\": []}'