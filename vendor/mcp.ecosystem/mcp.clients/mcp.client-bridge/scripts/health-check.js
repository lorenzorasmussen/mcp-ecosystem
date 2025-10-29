// Script to check database health
const DatabaseManager = require('../database-manager');
const config = require('../config.json');

async function healthCheck() {
  console.log('Checking MCP Client Bridge database health...');
  
  const dbManager = new DatabaseManager(config.database.path);
  
  try {
    const result = await dbManager.healthCheck();
    console.log('Database health check result:', result);
    
    if (result.status === 'healthy') {
      console.log('Database is healthy');
      process.exit(0);
    } else {
      console.log('Database is not healthy');
      process.exit(1);
    }
  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

healthCheck();