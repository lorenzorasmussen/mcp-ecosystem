// generate-token-with-env.js - Uses actual environment variables from main .env
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load environment variables from the main .env file (not the local one)
const mainEnvPath = path.join(__dirname, '..', '..', '..', '..', '.env');
if (fs.existsSync(mainEnvPath)) {
    const envContent = fs.readFileSync(mainEnvPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev';

// Use the actual Rube environment variables
const payload = {
  agentId: process.env.RUBE_USER_ID || process.env.COMPOSIO_MCP_ID || 'opencode-agent',
  userId: process.env.RUBE_USER_ID || process.env.COMPOSIO_USER_ID || 'user-123',
  orgId: process.env.RUBE_ORG_ID || 'default-org',
  permissions: {
    tools: true,
    resources: true,
    prompts: true
  },
  type: 'agent',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const token = jwt.sign(payload, JWT_SECRET);

console.log('🔑 Rube Authorization Token Generated');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Token:', token);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Agent ID:', payload.agentId);
console.log('User ID:', payload.userId);
console.log('Org ID:', payload.orgId);
console.log('Expires:', new Date(payload.exp * 1000).toISOString());
console.log('');
console.log('📋 Environment Variables Used:');
console.log('- RUBE_USER_ID:', process.env.RUBE_USER_ID || 'Not set');
console.log('- RUBE_ORG_ID:', process.env.RUBE_ORG_ID || 'Not set');
console.log('- COMPOSIO_USER_ID:', process.env.COMPOSIO_USER_ID || 'Not set');
console.log('- COMPOSIO_MCP_ID:', process.env.COMPOSIO_MCP_ID || 'Not set');