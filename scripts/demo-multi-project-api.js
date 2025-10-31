#!/usr/bin/env node

/**
 * Multi-Project API Demo
 *
 * Demonstrates the OpenCode multi-project API capabilities
 * including project creation, session management, and cross-project operations.
 */

const http = require('http');
const { spawn } = require('child_process');

class MultiProjectAPIDemo {
  constructor(baseURL = 'http://127.0.0.1:55500') {
    this.baseURL = baseURL;
    this.projects = [];
    this.sessions = [];
  }

  /**
   * Make HTTP request to OpenCode API
   */
  async request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseURL);
      const options = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ status: res.statusCode, data });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Demo: Create multiple projects
   */
  async demoProjectCreation() {
    console.log('\n🏗️  Creating Multiple Projects');
    console.log('='.repeat(50));

    const projectConfigs = [
      {
        name: 'MCP Ecosystem',
        worktree: '/Users/lorenzorasmussen/.local/share/mcp',
        metadata: {
          description: 'Main MCP ecosystem project',
          tags: ['mcp', 'ecosystem', 'production'],
          settings: {
            defaultProvider: 'openai',
            defaultModel: 'gpt-4',
          },
        },
      },
      {
        name: 'Qwen Client',
        worktree: '/Users/lorenzorasmussen/projects/qwen-client',
        metadata: {
          description: 'Qwen MCP client implementation',
          tags: ['qwen', 'client', 'mcp'],
          settings: {
            defaultProvider: 'anthropic',
            defaultModel: 'claude-3-sonnet',
          },
        },
      },
      {
        name: 'Documentation Site',
        worktree: '/Users/lorenzorasmussen/projects/docs',
        metadata: {
          description: 'Project documentation website',
          tags: ['docs', 'website', 'static'],
          settings: {
            defaultProvider: 'openai',
            defaultModel: 'gpt-3.5-turbo',
          },
        },
      },
    ];

    for (const config of projectConfigs) {
      try {
        const response = await this.request('POST', '/project/init', config);
        if (response.status === 201) {
          const project = response.data;
          this.projects.push(project);
          console.log(`✅ Created project: ${project.name} (${project.id})`);
          console.log(`   Worktree: ${project.worktree}`);
          console.log(`   Tags: ${project.metadata.tags.join(', ')}`);
        } else {
          console.log(`❌ Failed to create project: ${config.name}`);
          console.log(`   Error: ${response.data}`);
        }
      } catch (error) {
        console.log(`❌ Error creating project ${config.name}: ${error.message}`);
      }
      console.log('');
    }
  }

  /**
   * Demo: List all projects
   */
  async demoProjectListing() {
    console.log('\n📋 Listing All Projects');
    console.log('='.repeat(50));

    try {
      const response = await this.request('GET', '/project');
      if (response.status === 200) {
        const { projects, total, active } = response.data;
        console.log(`📊 Total Projects: ${total} (${active} active)`);
        console.log('');

        for (const project of projects) {
          console.log(`🏗️  ${project.name}`);
          console.log(`   ID: ${project.id}`);
          console.log(`   Worktree: ${project.worktree}`);
          console.log(`   Sessions: ${project.sessionCount}`);
          console.log(`   Status: ${project.status}`);
          console.log(`   Created: ${new Date(project.createdAt).toLocaleString()}`);
          console.log(`   Tags: ${project.metadata.tags.join(', ')}`);
          console.log('');
        }
      }
    } catch (error) {
      console.log(`❌ Error listing projects: ${error.message}`);
    }
  }

  /**
   * Demo: Create sessions in different projects
   */
  async demoSessionCreation() {
    console.log('\n💬 Creating Sessions Across Projects');
    console.log('='.repeat(50));

    const sessionConfigs = [
      {
        projectId: this.projects[0]?.id,
        title: 'Architecture Review',
        agent: 'architecture-specialist',
        metadata: {
          priority: 'high',
          tags: ['architecture', 'review'],
        },
      },
      {
        projectId: this.projects[0]?.id,
        title: 'Performance Testing',
        agent: 'performance-engineer',
        metadata: {
          priority: 'medium',
          tags: ['performance', 'testing'],
        },
      },
      {
        projectId: this.projects[1]?.id,
        title: 'Client Implementation',
        agent: 'backend-developer',
        metadata: {
          priority: 'high',
          tags: ['implementation', 'client'],
        },
      },
      {
        projectId: this.projects[2]?.id,
        title: 'Documentation Update',
        agent: 'technical-writer',
        metadata: {
          priority: 'low',
          tags: ['docs', 'update'],
        },
      },
    ];

    for (const config of sessionConfigs) {
      if (!config.projectId) {
        console.log(`⚠️  Skipping session - no project available`);
        continue;
      }

      try {
        const response = await this.request('POST', `/project/${config.projectId}/session`, config);

        if (response.status === 201) {
          const session = response.data;
          this.sessions.push(session);
          const project = this.projects.find((p) => p.id === config.projectId);
          console.log(`✅ Created session: ${session.title}`);
          console.log(`   Project: ${project?.name}`);
          console.log(`   Session ID: ${session.id}`);
          console.log(`   Agent: ${session.agent}`);
          console.log(`   Status: ${session.status}`);
        } else {
          console.log(`❌ Failed to create session: ${config.title}`);
          console.log(`   Error: ${response.data}`);
        }
      } catch (error) {
        console.log(`❌ Error creating session ${config.title}: ${error.message}`);
      }
      console.log('');
    }
  }

  /**
   * Demo: List sessions for each project
   */
  async demoSessionListing() {
    console.log('\n📝 Sessions by Project');
    console.log('='.repeat(50));

    for (const project of this.projects) {
      try {
        const response = await this.request('GET', `/project/${project.id}/session`);
        if (response.status === 200) {
          const { sessions, total, active } = response.data;
          console.log(`🏗️  ${project.name} - ${total} sessions (${active} active)`);

          for (const session of sessions) {
            console.log(`   💬 ${session.title}`);
            console.log(`      ID: ${session.id}`);
            console.log(`      Agent: ${session.agent || 'None'}`);
            console.log(`      Messages: ${session.messageCount}`);
            console.log(`      Created: ${new Date(session.createdAt).toLocaleString()}`);
          }
          console.log('');
        }
      } catch (error) {
        console.log(`❌ Error listing sessions for ${project.name}: ${error.message}`);
      }
    }
  }

  /**
   * Demo: Send messages to sessions
   */
  async demoMessageSending() {
    console.log('\n📨 Sending Messages to Sessions');
    console.log('='.repeat(50));

    const messages = [
      {
        sessionId: this.sessions[0]?.id,
        projectId: this.projects[0]?.id,
        content: 'Review the current MCP architecture and suggest improvements for scalability.',
        agent: 'architecture-specialist',
      },
      {
        sessionId: this.sessions[1]?.id,
        projectId: this.projects[0]?.id,
        content: 'Run performance tests on the Qwen client and analyze bottlenecks.',
        agent: 'performance-engineer',
      },
      {
        sessionId: this.sessions[2]?.id,
        projectId: this.projects[1]?.id,
        content: 'Implement the remaining MCP server connections for the Qwen client.',
        agent: 'backend-developer',
      },
    ];

    for (const msg of messages) {
      if (!msg.sessionId || !msg.projectId) {
        console.log(`⚠️  Skipping message - no session available`);
        continue;
      }

      try {
        const response = await this.request(
          'POST',
          `/project/${msg.projectId}/session/${msg.sessionId}/message`,
          {
            parts: [{ type: 'text', text: msg.content }],
            agent: msg.agent,
            model: {
              providerID: 'openai',
              modelID: 'gpt-4',
            },
          }
        );

        if (response.status === 201) {
          const message = response.data;
          console.log(`✅ Message sent to session ${msg.sessionId}`);
          console.log(`   Content: ${msg.content.substring(0, 50)}...`);
          console.log(`   Message ID: ${message.info.id}`);
        } else {
          console.log(`❌ Failed to send message to session ${msg.sessionId}`);
          console.log(`   Error: ${response.data}`);
        }
      } catch (error) {
        console.log(`❌ Error sending message: ${error.message}`);
      }
      console.log('');
    }
  }

  /**
   * Demo: Cross-project operations
   */
  async demoCrossProjectOperations() {
    console.log('\n🔄 Cross-Project Operations');
    console.log('='.repeat(50));

    // Share a session
    if (this.sessions.length > 0) {
      const session = this.sessions[0];
      const project = this.projects.find((p) => p.id === session.projectId);

      try {
        const response = await this.request(
          'POST',
          `/project/${project.id}/session/${session.id}/share`
        );

        if (response.status === 200) {
          console.log(`✅ Shared session: ${session.title}`);
          console.log(`   Share URL: ${response.data.shareURL}`);
          console.log(`   Expires: ${new Date(response.data.expiresAt).toLocaleString()}`);
        }
      } catch (error) {
        console.log(`❌ Error sharing session: ${error.message}`);
      }
    }

    // Get project statistics
    console.log('\n📊 Project Statistics:');
    for (const project of this.projects) {
      try {
        const response = await this.request('GET', `/project/${project.id}/session`);
        if (response.status === 200) {
          const { total, active } = response.data;
          console.log(`   ${project.name}: ${total} total sessions, ${active} active`);
        }
      } catch (error) {
        console.log(`   ${project.name}: Error fetching stats`);
      }
    }
  }

  /**
   * Demo: File operations within sessions
   */
  async demoFileOperations() {
    console.log('\n📁 File Operations in Sessions');
    console.log('='.repeat(50));

    if (this.sessions.length === 0) {
      console.log('⚠️  No sessions available for file operations');
      return;
    }

    const session = this.sessions[0];
    const project = this.projects.find((p) => p.id === session.projectId);

    // Find files
    try {
      const response = await this.request(
        'GET',
        `/project/${project.id}/session/${session.id}/find/file?query=*.js&pattern=src`
      );

      if (response.status === 200) {
        console.log(`🔍 Found ${response.data.files.length} JavaScript files:`);
        response.data.files.slice(0, 5).forEach((file) => {
          console.log(`   ${file}`);
        });
        if (response.data.files.length > 5) {
          console.log(`   ... and ${response.data.files.length - 5} more`);
        }
      }
    } catch (error) {
      console.log(`❌ Error finding files: ${error.message}`);
    }

    // Get file status
    try {
      const response = await this.request(
        'GET',
        `/project/${project.id}/session/${session.id}/file/status`
      );

      if (response.status === 200) {
        const { total, modified, staged } = response.data;
        console.log(`📊 File Status: ${total} total files, ${modified} modified, ${staged} staged`);
      }
    } catch (error) {
      console.log(`❌ Error getting file status: ${error.message}`);
    }
  }

  /**
   * Run complete demo
   */
  async runDemo() {
    console.log('🚀 OpenCode Multi-Project API Demo');
    console.log('====================================');
    console.log(`Base URL: ${this.baseURL}`);
    console.log('');

    try {
      // Test API connectivity
      const healthResponse = await this.request('GET', '/doc');
      if (healthResponse.status !== 200) {
        throw new Error(
          'API not accessible. Make sure OpenCode is running with multi-project extension.'
        );
      }

      await this.demoProjectCreation();
      await this.demoProjectListing();
      await this.demoSessionCreation();
      await this.demoSessionListing();
      await this.demoMessageSending();
      await this.demoCrossProjectOperations();
      await this.demoFileOperations();

      console.log('\n🎉 Demo completed successfully!');
      console.log('');
      console.log('📋 Summary:');
      console.log(`   Projects created: ${this.projects.length}`);
      console.log(`   Sessions created: ${this.sessions.length}`);
      console.log(`   Messages sent: ${Math.min(3, this.sessions.length)}`);
      console.log('');
      console.log('💡 Next steps:');
      console.log('   1. Explore the API documentation at /doc');
      console.log('   2. Try the web interface (if available)');
      console.log('   3. Integrate with your existing tools');
      console.log('   4. Customize project settings and agents');
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('   1. Ensure OpenCode server is running with multi-project extension');
      console.log('   2. Check that the base URL is correct');
      console.log('   3. Verify network connectivity');
      console.log('   4. Check server logs for errors');
    }
  }
}

// CLI Interface
async function main() {
  const baseURL = process.argv[2] || 'http://127.0.0.1:55500';
  const demo = new MultiProjectAPIDemo(baseURL);
  await demo.runDemo();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MultiProjectAPIDemo;
