// Test script to check API endpoints
const axios = require('axios');

const apiKey = 'NFpdjoLpJr6P7BVh2jCZx5lk6btBI6rL1UFRzrCz';
const orgId = 'ee8e59aa-1498-49a9-b875-8aedb544acc9';
const baseUrl = 'https://inbound.xpander.ai';

async function testEndpoint(endpoint, method = 'get', data = null) {
  try {
    console.log(`Testing ${method.toUpperCase()} ${endpoint}`);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    };
    
    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(`${baseUrl}${endpoint}`, config);
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(`${baseUrl}${endpoint}`, data, config);
    }
    
    console.log('Success!', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('Error:', error.response ? error.response.status : error.message);
    if (error.response && error.response.data) {
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function main() {
  // Focus on the xpander/agents path that returned 403
  const endpoints = [
    // Testing GET endpoints
    `/v1/xpander/agents/${orgId}`,
    `/v1/xpander/agents`, // Without org ID
    `/v1/xpander/agents?organization=${orgId}`, // With org ID as query param
    `/v1/xpander/agents/list?organization=${orgId}`,
    `/v1/xpander/agents/list`,
    
    // Try with organization in path
    `/v1/xpander/organizations/${orgId}/agents`,
    `/v1/xpander/organization/${orgId}/agents`,
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    console.log('-------------------');
  }

  // Let's also try a POST request to create an agent
  console.log('\nTesting POST requests:');
  await testEndpoint(`/v1/xpander/agents`, 'post', {
    name: 'Test Agent',
    organization: orgId
  });
}

main().catch(console.error); 