// Test your deployed API
const API_BASE = 'https://your-project-name.vercel.app'; // Replace with your Vercel URL
const API_KEY = 'your-api-key'; // Your custom API key

async function testAPI() {
  try {
    // Test 1: List agents
    console.log('🤖 Testing agents endpoint...');
    const agentsResponse = await fetch(`${API_BASE}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const agents = await agentsResponse.json();
    console.log('✅ Agents:', agents.data?.length, 'agents found');

    // Test 2: Quick chat
    console.log('\n💬 Testing quick chat...');
    const chatResponse = await fetch(`${API_BASE}/api/quick-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "What's the weather in Tokyo?"
      })
    });
    const chatResult = await chatResponse.json();
    console.log('✅ Chat result:', chatResult.data?.response);

    // Test 3: Math calculation
    console.log('\n🧮 Testing math agent...');
    const mathResponse = await fetch(`${API_BASE}/api/chat/math`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Calculate 15% tip on $84.50"
      })
    });
    const mathResult = await mathResponse.json();
    console.log('✅ Math result:', mathResult.data?.response);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testAPI();