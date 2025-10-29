// Migration runner for MCP Client Bridge
// Handles applying and rolling back database migrations

const fs = require('fs');
const path = require('path');
const DatabaseManager = require('./database-manager');

class MigrationRunner {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.dbManager = new DatabaseManager(dbPath);
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async getAvailableMigrations() {
    const files = fs.readdirSync(this.migrationsDir);
    const migrations = files
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const filePath = path.join(this.migrationsDir, file);
        return {
          file,
          migration: require(filePath)
        };
      })
      .sort((a, b) => {
        // Sort by version number (assuming format like 001-, 002-, etc.)
        const versionA = parseInt(a.migration.version.match(/^\d+/)[0]);
        const versionB = parseInt(b.migration.version.match(/^\d+/)[0]);
        return versionA - versionB;
      });

    return migrations;
  }

  async getAppliedMigrations() {
    await this.dbManager.initialize();
    return await this.dbManager.all(
      'SELECT version, applied_at FROM schema_migrations ORDER BY id ASC'
    );
  }

  async runMigrations() {
    const availableMigrations = await this.getAvailableMigrations();
    const appliedMigrations = await this.getAppliedMigrations();

    // Create a set of applied migration versions for quick lookup
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    console.log(`Found ${availableMigrations.length} available migrations`);
    console.log(`Found ${appliedMigrations.length} already applied migrations`);

    // Find migrations that need to be applied
    const pendingMigrations = availableMigrations.filter(
      m => !appliedVersions.has(m.migration.version)
    );

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return;
    }

    // Apply pending migrations in order
    for (const { file, migration } of pendingMigrations) {
      console.log(`Applying migration: ${migration.version} - ${migration.description}`);
      
      try {
        await this.dbManager.transaction(async (db) => {
          await migration.up(db);
          await db.run(
            'INSERT INTO schema_migrations (version, description, applied_by) VALUES (?, ?, ?)',
            [migration.version, migration.description, 'migration-runner']
          );
        });
        
        console.log(`Successfully applied migration: ${migration.version}`);
      } catch (error) {
        console.error(`Failed to apply migration ${migration.version}:`, error);
        throw error;
      }
    }
  }

  async rollbackLastMigration() {
    await this.dbManager.initialize();
    
    // Get the last applied migration
    const lastMigration = await this.dbManager.get(
      'SELECT version, description FROM schema_migrations ORDER BY id DESC LIMIT 1'
    );

    if (!lastMigration) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back migration: ${lastMigration.version} - ${lastMigration.description}`);

    // Find the corresponding migration file
    const migrationFiles = fs.readdirSync(this.migrationsDir);
    const migrationFile = migrationFiles.find(f => 
      require(path.join(this.migrationsDir, f)).version === lastMigration.version
    );

    if (!migrationFile) {
      throw new Error(`Migration file for version ${lastMigration.version} not found`);
    }

    const migration = require(path.join(this.migrationsDir, migrationFile));

    try {
      await this.dbManager.transaction(async (db) => {
        await migration.down(db);
        await db.run(
          'DELETE FROM schema_migrations WHERE version = ?',
          [lastMigration.version]
        );
      });
      
      console.log(`Successfully rolled back migration: ${lastMigration.version}`);
    } catch (error) {
      console.error(`Failed to rollback migration ${lastMigration.version}:`, error);
      throw error;
    }
  }
}

module.exports = MigrationRunner;