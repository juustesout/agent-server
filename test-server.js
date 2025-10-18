const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple test server to debug the API locally
const port = 3001;

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  try {
    // Import the handler - we'll need to compile TypeScript first
    console.log('Loading handler...');
    
    // For now, let's just test if we can import the module
    const { default: handler } = await import('./api/run.ts');
    
    // Create mock Vercel request/response objects
    const mockReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: {}
    };
    
    // Collect request body if it's POST
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          mockReq.body = JSON.parse(body);
        } catch (e) {
          mockReq.body = {};
        }
        
        const mockRes = {
          status: (code) => ({
            json: (data) => {
              res.writeHead(code, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data, null, 2));
            },
            end: () => {
              res.writeHead(code);
              res.end();
            }
          }),
          json: (data) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data, null, 2));
          },
          writeHead: res.writeHead.bind(res),
          write: res.write.bind(res),
          end: res.end.bind(res)
        };
        
        await handler(mockReq, mockRes);
      });
    } else {
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            res.writeHead(code, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data, null, 2));
          }
        }),
        json: (data) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data, null, 2));
        }
      };
      
      await handler(mockReq, mockRes);
    }
    
  } catch (error) {
    console.error('Handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }, null, 2));
  }
});

server.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log('Try: http://localhost:3001/api/ritual-workflow');
});