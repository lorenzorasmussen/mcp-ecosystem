// Script to initialize the database
const DatabaseManager = require('../database-manager');
const MigrationRunner = require('../migration-runner');
const config = require('../config.json');

async function initDatabase() {
  console.log('Initializing MCP Client Bridge database...');
  
  const dbManager = new DatabaseManager(config.database.path);
  
  try {
    // Initialize the database connection
    await dbManager.initialize();
    console.log('Database connection established');
    
    // Run migrations if autoRun is enabled
    if (config.migrations.autoRun) {
      const migrationRunner = new MigrationRunner(config.database.path);
      await migrationRunner.runMigrations();
      console.log('Migrations completed');
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

initDatabase();