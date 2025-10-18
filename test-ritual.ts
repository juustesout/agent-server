import { createRitualWorkflowAgent } from './api/run';

async function testRitualWorkflow() {
  console.log('🧪 Testing Ritual Workflow Agent creation...');
  
  try {
    // Test agent creation
    const agent = createRitualWorkflowAgent();
    console.log('✅ Agent created successfully:', agent.name);
    
    // Test basic functionality
    console.log('Agent instructions preview:', agent.instructions.substring(0, 100) + '...');
    
    console.log('🎉 Test passed! Agent creation works.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testRitualWorkflow();