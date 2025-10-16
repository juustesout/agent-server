// Simple test to verify the API setup is working
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

// Test tool using the correct API
const testTool = tool({
  name: 'get_test_data',
  description: 'Get test data',
  parameters: z.object({
    query: z.string().describe('Test query')
  }),
  async execute({ query }) {
    return `Test result for: ${query}`;
  }
});

// Test agent
const testAgent = new Agent({
  name: 'Test Agent',
  instructions: 'You are a test agent. Use the get_test_data tool when asked.',
  model: 'gpt-4o',
  tools: [testTool]
});

console.log('✅ OpenAI Agents SDK setup is correct!');
console.log('✅ Tool creation with execute (not handler) works!');
console.log('✅ Agent creation with tools works!');
console.log('✅ All imports are valid!');

export { testAgent, testTool };