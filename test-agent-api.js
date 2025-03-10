// Test script to check agent API endpoints
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
      },
      // Set timeout to 5 seconds
      timeout: 5000
    };
    
    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(`${baseUrl}${endpoint}`, config);
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(`${baseUrl}${endpoint}`, data, config);
    }
    
    console.log('Success!', response.status);
    console.log('Data type:', typeof response.data);
    console.log('Is Array:', Array.isArray(response.data));
    console.log('Data length:', Array.isArray(response.data) ? response.data.length : 'N/A');
    console.log('First item example (if array):', Array.isArray(response.data) && response.data.length > 0 ? JSON.stringify(response.data[0], null, 2).substring(0, 500) + '...' : 'N/A');
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
  // Focus on agent list endpoints
  const endpoints = [
    // Standard RESTful patterns
    `/agents`,
    `/v1/agents`,
    
    // With organization query param
    `/agents?organization=${orgId}`,
    `/v1/agents?organization=${orgId}`,
    `/v1/agents?org=${orgId}`,
    
    // Organization in path
    `/organizations/${orgId}/agents`,
    `/v1/organizations/${orgId}/agents`,
    
    // Xpander specific
    `/xpander/agents`,
    `/v1/xpander/agents`,
    `/v1/xpander/agents?organization=${orgId}`,
    
    // Try list endpoint
    `/v1/agents/list`,
    `/v1/xpander/agents/list`,
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    console.log('-------------------');
  }
}

main().catch(console.error); 