// generate-opencode-token.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Use the same JWT secret that the Rube server uses
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev';

// Generate a JWT token for OpenCode with appropriate permissions
const payload = {
  agentId: 'opencode-client',
  userId: process.env.RUBE_USER_ID || 'user-opencode',
  permissions: {
    tools: true,
    resources: true,
    prompts: true,
    toolCalls: true
  },
  type: 'agent',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const token = jwt.sign(payload, JWT_SECRET);
console.log('OpenCode Authorization Token:');
console.log(token);
console.log('');
console.log('Add this token to your OpenCode configuration file:');
console.log('~/.config/opencode/config.json');
console.log('');
console.log('Example configuration:');
console.log('{');
console.log('  "mcp_servers": [');
console.log('    {');
console.log('      "name": "rube-remote",');
console.log('      "url": "https://rube.composio.dev/mcp",');
console.log('      "auth_token": "' + token + '"');
console.log('    }');
console.log('  ],');
console.log('  "active_mcp_server": "rube-remote"');
console.log('}');