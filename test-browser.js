// Test JavaScript code voor browser console op yahla.vercel.app

// Vervang YOUR_API_KEY met je echte API key
const API_KEY = 'YOUR_API_KEY'; 
const BASE_URL = 'https://yahla.vercel.app';

// Test 1: List agents
async function testAgents() {
  try {
    const response = await fetch(`${BASE_URL}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('🤖 Agents:', data);
    return data;
  } catch (error) {
    console.error('❌ Agents test failed:', error);
  }
}

// Test 2: Quick chat
async function testQuickChat() {
  try {
    const response = await fetch(`${BASE_URL}/api/quick-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Wat is het weer in Amsterdam?"
      })
    });
    const data = await response.json();
    console.log('💬 Quick Chat:', data);
    return data;
  } catch (error) {
    console.error('❌ Quick chat test failed:', error);
  }
}

// Test 3: Math calculation
async function testMath() {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/math`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Bereken 21% BTW over €125"
      })
    });
    const data = await response.json();
    console.log('🧮 Math:', data);
    return data;
  } catch (error) {
    console.error('❌ Math test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Testing yahla.vercel.app API...\n');
  
  await testAgents();
  await testQuickChat();
  await testMath();
  
  console.log('\n✅ All tests completed!');
}

// Start testing
runAllTests();