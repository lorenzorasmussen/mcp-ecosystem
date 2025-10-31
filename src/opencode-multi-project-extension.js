#!/usr/bin/env node

/**
 * OpenCode Multi-Project Extension
 *
 * Extends OpenCode server to support multiple projects and worktrees
 * with a single server instance while maintaining backward compatibility.
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class MultiProjectExtension {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), '.opencode');
    this.projectsDir = path.join(this.baseDir, 'projects');
    this.sessionsDir = path.join(this.baseDir, 'sessions');
    this.messagesDir = path.join(this.baseDir, 'messages');
    this.cacheDir = path.join(this.baseDir, 'cache');

    this.projects = new Map();
    this.sessions = new Map();
    this.cache = new Map();

    this.initializeDirectories();
  }

  /**
   * Initialize storage directories
   */
  async initializeDirectories() {
    const dirs = [
      this.baseDir,
      this.projectsDir,
      this.sessionsDir,
      this.messagesDir,
      this.cacheDir,
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error.message);
      }
    }
  }

  /**
   * Generate unique project ID
   */
  generateProjectId() {
    return `proj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `ses_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Project Management Methods
   */

  async listProjects() {
    try {
      const files = await fs.readdir(this.projectsDir);
      const projects = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(this.projectsDir, file), 'utf8');
          const project = JSON.parse(content);
          projects.push(project);
        }
      }

      return {
        projects: projects.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed)),
        total: projects.length,
        active: projects.filter((p) => p.status === 'active').length,
      };
    } catch (error) {
      return { projects: [], total: 0, active: 0 };
    }
  }

  async createProject(projectData) {
    const project = {
      id: projectData.id || this.generateProjectId(),
      name: projectData.name,
      worktree: projectData.worktree,
      vcs: projectData.vcs || 'git',
      branch: projectData.branch || 'main',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      sessionCount: 0,
      status: 'active',
      metadata: {
        description: projectData.metadata?.description || '',
        tags: projectData.metadata?.tags || [],
        settings: projectData.metadata?.settings || {},
      },
    };

    // Validate worktree exists
    try {
      await fs.access(project.worktree);
    } catch (error) {
      throw new Error(`Worktree directory does not exist: ${project.worktree}`);
    }

    // Save project
    await fs.writeFile(
      path.join(this.projectsDir, `${project.id}.json`),
      JSON.stringify(project, null, 2)
    );

    this.projects.set(project.id, project);
    return project;
  }

  async getProject(projectId) {
    if (this.projects.has(projectId)) {
      return this.projects.get(projectId);
    }

    try {
      const content = await fs.readFile(path.join(this.projectsDir, `${projectId}.json`), 'utf8');
      const project = JSON.parse(content);
      this.projects.set(projectId, project);
      return project;
    } catch (error) {
      return null;
    }
  }

  async updateProject(projectId, updates) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const updatedProject = {
      ...project,
      ...updates,
      lastAccessed: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(this.projectsDir, `${projectId}.json`),
      JSON.stringify(updatedProject, null, 2)
    );

    this.projects.set(projectId, updatedProject);
    return updatedProject;
  }

  /**
   * Session Management Methods
   */

  async listSessions(projectId) {
    try {
      const projectSessionsDir = path.join(this.sessionsDir, projectId);
      const files = await fs.readdir(projectSessionsDir);
      const sessions = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(projectSessionsDir, file), 'utf8');
          const session = JSON.parse(content);
          sessions.push(session);
        }
      }

      return {
        sessions: sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        total: sessions.length,
        active: sessions.filter((s) => s.status === 'active').length,
      };
    } catch (error) {
      return { sessions: [], total: 0, active: 0 };
    }
  }

  async createSession(projectId, sessionData) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const session = {
      id: sessionData.id || this.generateSessionId(),
      title: sessionData.title || 'New Session',
      projectId,
      parentID: sessionData.parentID || null,
      directory: sessionData.directory || project.worktree,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      messageCount: 0,
      agent: sessionData.agent || null,
      model: sessionData.model || null,
      system: sessionData.system || null,
      metadata: sessionData.metadata || {},
      children: [],
      permissions: {
        canEdit: true,
        canShare: true,
        canDelete: true,
      },
    };

    // Create project sessions directory if needed
    const projectSessionsDir = path.join(this.sessionsDir, projectId);
    await fs.mkdir(projectSessionsDir, { recursive: true });

    // Save session
    await fs.writeFile(
      path.join(projectSessionsDir, `${session.id}.json`),
      JSON.stringify(session, null, 2)
    );

    // Create messages directory
    const sessionMessagesDir = path.join(this.messagesDir, projectId, session.id);
    await fs.mkdir(sessionMessagesDir, { recursive: true });

    this.sessions.set(session.id, session);

    // Update project session count
    await this.updateProject(projectId, {
      sessionCount: (await this.listSessions(projectId)).total,
    });

    return session;
  }

  async getSession(projectId, sessionId) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    try {
      const content = await fs.readFile(
        path.join(this.sessionsDir, projectId, `${sessionId}.json`),
        'utf8'
      );
      const session = JSON.parse(content);
      this.sessions.set(sessionId, session);
      return session;
    } catch (error) {
      return null;
    }
  }

  async updateSession(projectId, sessionId, updates) {
    const session = await this.getSession(projectId, sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(this.sessionsDir, projectId, `${sessionId}.json`),
      JSON.stringify(updatedSession, null, 2)
    );

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async deleteSession(projectId, sessionId) {
    const session = await this.getSession(projectId, sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Delete session file
    await fs.unlink(path.join(this.sessionsDir, projectId, `${sessionId}.json`));

    // Delete messages directory
    const sessionMessagesDir = path.join(this.messagesDir, projectId, sessionId);
    try {
      await fs.rmdir(sessionMessagesDir, { recursive: true });
    } catch (error) {
      // Directory might not exist
    }

    this.sessions.delete(sessionId);

    // Update project session count
    await this.updateProject(projectId, {
      sessionCount: (await this.listSessions(projectId)).total,
    });

    return true;
  }

  /**
   * Message Management Methods
   */

  async listMessages(projectId, sessionId) {
    try {
      const sessionMessagesDir = path.join(this.messagesDir, projectId, sessionId);
      const files = await fs.readdir(sessionMessagesDir);
      const messages = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(sessionMessagesDir, file), 'utf8');
          const message = JSON.parse(content);
          messages.push(message);
        }
      }

      return {
        messages: messages.sort((a, b) => new Date(a.info.createdAt) - new Date(b.info.createdAt)),
        total: messages.length,
        hasMore: false,
      };
    } catch (error) {
      return { messages: [], total: 0, hasMore: false };
    }
  }

  async createMessage(projectId, sessionId, messageData) {
    const session = await this.getSession(projectId, sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const message = {
      info: {
        id: messageData.info?.id || `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        role: messageData.info?.role || 'user',
        createdAt: messageData.info?.createdAt || new Date().toISOString(),
        sessionId,
      },
      parts: messageData.parts || [],
    };

    // Save message
    const sessionMessagesDir = path.join(this.messagesDir, projectId, sessionId);
    await fs.writeFile(
      path.join(sessionMessagesDir, `${message.info.id}.json`),
      JSON.stringify(message, null, 2)
    );

    // Update session message count
    const messages = await this.listMessages(projectId, sessionId);
    await this.updateSession(projectId, sessionId, {
      messageCount: messages.total,
      updatedAt: new Date().toISOString(),
    });

    return message;
  }

  /**
   * Express Router Setup
   */

  createRouter() {
    const router = express.Router();

    // Project Management Routes
    router.get('/project', async (req, res) => {
      try {
        const result = await this.listProjects();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/project/init', async (req, res) => {
      try {
        const project = await this.createProject(req.body);
        res.status(201).json(project);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Session Management Routes
    router.get('/project/:projectId/session', async (req, res) => {
      try {
        const { projectId } = req.params;
        const result = await this.listSessions(projectId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/project/:projectId/session', async (req, res) => {
      try {
        const { projectId } = req.params;
        const session = await this.createSession(projectId, req.body);
        res.status(201).json(session);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    router.get('/project/:projectId/session/:sessionId', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        const session = await this.getSession(projectId, sessionId);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }
        res.json(session);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.delete('/project/:projectId/session/:sessionId', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        await this.deleteSession(projectId, sessionId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Message Management Routes
    router.get('/project/:projectId/session/:sessionId/message', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        const result = await this.listMessages(projectId, sessionId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/project/:projectId/session/:sessionId/message', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        const message = await this.createMessage(projectId, sessionId, req.body);
        res.status(201).json(message);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // Session Operations
    router.post('/project/:projectId/session/:sessionId/init', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        // Initialize session logic here
        const session = await this.updateSession(projectId, sessionId, {
          status: 'initializing',
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/project/:projectId/session/:sessionId/abort', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        const session = await this.updateSession(projectId, sessionId, {
          status: 'aborted',
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/project/:projectId/session/:sessionId/share', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        const session = await this.updateSession(projectId, sessionId, {
          shared: true,
          shareURL: `https://opencode.dev/shared/${sessionId}`,
          shareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        res.json({
          shared: true,
          shareURL: session.shareURL,
          expiresAt: session.shareExpiresAt,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.delete('/project/:projectId/session/:sessionId/share', async (req, res) => {
      try {
        const { projectId, sessionId } = req.params;
        const session = await this.updateSession(projectId, sessionId, {
          shared: false,
          shareURL: null,
          shareExpiresAt: null,
        });
        res.json({ shared: false });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  /**
   * Migration utilities
   */

  async migrateExistingSessions(existingSessionsDir) {
    console.log('🔄 Starting migration of existing sessions...');

    try {
      const files = await fs.readdir(existingSessionsDir);
      let migratedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(existingSessionsDir, file), 'utf8');
          const session = JSON.parse(content);

          // Create default project if needed
          const defaultProject = await this.createProject({
            name: 'Migrated Project',
            worktree: session.directory || process.cwd(),
            metadata: {
              description: 'Auto-created during migration',
              tags: ['migrated'],
            },
          });

          // Migrate session
          await this.createSession(defaultProject.id, {
            ...session,
            directory: session.directory || defaultProject.worktree,
          });

          migratedCount++;
        }
      }

      console.log(`✅ Migrated ${migratedCount} sessions to multi-project structure`);
      return migratedCount;
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }
}

module.exports = MultiProjectExtension;
