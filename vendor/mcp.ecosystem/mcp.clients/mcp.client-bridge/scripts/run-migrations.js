// Script to run migrations
const MigrationRunner = require('../migration-runner');
const config = require('../config.json');

async function runMigrations() {
  console.log('Running MCP Client Bridge migrations...');
  
  const migrationRunner = new MigrationRunner(config.database.path);
  
  try {
    await migrationRunner.runMigrations();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migrations failed:', error);
    process.exit(1);
  }
}

runMigrations();