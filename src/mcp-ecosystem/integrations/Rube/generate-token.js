// generate-token.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev';

const payload = {
  agentId: process.env.COMPOSIO_MCP_ID || 'opencode-agent',
  userId: process.env.COMPOSIO_USER_ID || 'user-123',
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
console.log('Authorization Token:', token);