// Simple test script to demonstrate the formatter

import { formatOutput } from './utils/formatter';

// Sample data mimicking agents
const agents = [
  {
    id: 'agent-123456789',
    name: 'Customer Support Agent',
    status: 'active',
    created: new Date().toLocaleString(),
    description: 'Handles customer inquiries and support tickets',
  },
  {
    id: 'agent-987654321',
    name: 'Sales Assistant',
    status: 'inactive',
    created: new Date(Date.now() - 86400000).toLocaleString(), // 1 day ago
    description: 'Helps with sales inquiries and lead qualification',
  },
  {
    id: 'agent-abcdef123',
    name: 'Technical Support',
    status: 'active',
    created: new Date(Date.now() - 172800000).toLocaleString(), // 2 days ago
    description: 'Provides technical troubleshooting and guidance',
  },
];

// Define column order and headers
const columns = ['id', 'name', 'status', 'created', 'description'];
const headers = ['Agent ID', 'Name', 'Status', 'Created At', 'Description'];

// Test table format (default)
console.log('\n--- Table Format (Default) ---');
console.log(formatOutput(agents, { columns, headers }));

// Test JSON format
console.log('\n--- JSON Format ---');
console.log(formatOutput(agents, { format: 'json', columns, headers }));

// Test with a single item
console.log('\n--- Single Item ---');
console.log(formatOutput(agents[0], { columns, headers }));
