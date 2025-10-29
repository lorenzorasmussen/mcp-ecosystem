/**
 * App Integration Service for Rube MCP Server
 * Handles integration with external apps like Gmail, GitHub, Slack
 */

const { logger } = require('../utils/logger');
const { config } = require('../config');
const axios = require('axios');
const querystring = require('querystring');
const AppConnection = require('../database/models/AppConnection');
const { AppConnectionNotFoundError, OAuthError } = require('../utils/errors');

class AppIntegrationService {
  constructor() {
    // Initialize OAuth configurations
    this.oauthConfigs = config.apps.oauth;
  }

  // Get Google OAuth URL
  async getGoogleAuthUrl() {
    const config = this.oauthConfigs.google;
    if (!config.clientId) {
      throw new Error('Google OAuth not configured. Missing CLIENT_ID');
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${config.redirectUri}&` +
      `response_type=code&` +
      `scope=https://www.googleapis.com/auth/gmail.send&` +
      `access_type=offline&` +
      `prompt=consent`;

    return authUrl;
  }

  // Handle Google OAuth callback
  async handleGoogleCallback(code) {
    const config = this.oauthConfigs.google;
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Google OAuth not configured. Missing CLIENT_ID or CLIENT_SECRET');
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      });

      return {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
        email: tokenResponse.data.email || 'unknown',
        scope: tokenResponse.data.scope,
      };
    } catch (error) {
      logger.error('Error in Google OAuth callback:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send email via Gmail - with actual API call
  async sendGmail(userId, args) {
    // Get the user's Google connection
    const connection = await AppConnection.findByUserIdAndAppId(userId, 'google');
    if (!connection || !connection.active) {
      throw new AppConnectionNotFoundError('google');
    }

    // Check if token needs refresh
    const tokenNeedsRefresh = connection.expiresAt && Date.now() >= connection.expiresAt;
    let accessToken = connection.accessToken;
    
    if (tokenNeedsRefresh && connection.refreshToken) {
      // Refresh the token
      const newTokens = await this.refreshGoogleToken(connection.refreshToken);
      accessToken = newTokens.accessToken;
      
      // Update the connection with new tokens
      await AppConnection.update(connection.id, {
        accessToken: newTokens.accessToken,
        expiresAt: newTokens.expiresAt,
      });
    }

    try {
      // Prepare the email
      const emailLines = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        '',
        args.body
      ];
      
      const emailContent = emailLines.join('\r\n');
      const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      // Send the email using Gmail API
      const response = await axios.post(
        'https://www.googleapis.com/gmail/v1/users/me/messages/send',
        {
          raw: encodedEmail
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Email sent successfully via Gmail for user ${userId}`, { 
        messageId: response.data.id,
        to: args.to,
        subject: args.subject 
      });

      return {
        success: true,
        messageId: response.data.id,
        sentAt: new Date().toISOString(),
        recipient: args.to,
      };
    } catch (error) {
      logger.error(`Error sending email via Gmail for user ${userId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Refresh Google token
  async refreshGoogleToken(refreshToken) {
    const config = this.oauthConfigs.google;
    
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    return {
      accessToken: tokenResponse.data.access_token,
      expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
    };
  }

  // Get GitHub OAuth URL
  async getGithubAuthUrl() {
    const config = this.oauthConfigs.github;
    if (!config.clientId) {
      throw new Error('GitHub OAuth not configured. Missing CLIENT_ID');
    }

    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${config.redirectUri}&` +
      `scope=repo`;

    return authUrl;
  }

  // Handle GitHub OAuth callback
  async handleGithubCallback(code) {
    const config = this.oauthConfigs.github;
    if (!config.clientId || !config.clientSecret) {
      throw new Error('GitHub OAuth not configured. Missing CLIENT_ID or CLIENT_SECRET');
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
      }, {
        headers: {
          Accept: 'application/json',
        },
      });

      // Get user info to include in response
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${tokenResponse.data.access_token}`,
        }
      });

      return {
        accessToken: tokenResponse.data.access_token,
        tokenType: tokenResponse.data.token_type,
        scope: tokenResponse.data.scope,
        username: userResponse.data.login,
        email: userResponse.data.email || 'unknown',
      };
    } catch (error) {
      logger.error('Error in GitHub OAuth callback:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create GitHub issue - with actual API call
  async createGithubIssue(userId, args) {
    // Get the user's GitHub connection
    const connection = await AppConnection.findByUserIdAndAppId(userId, 'github');
    if (!connection || !connection.active) {
      throw new AppConnectionNotFoundError('github');
    }

    try {
      // Create the issue using GitHub API
      const response = await axios.post(
        `https://api.github.com/repos/${args.owner}/${args.repo}/issues`,
        {
          title: args.title,
          body: args.body || '',
        },
        {
          headers: {
            'Authorization': `token ${connection.accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
          }
        }
      );

      logger.info(`GitHub issue created successfully for user ${userId}`, { 
        issueUrl: response.data.html_url,
        issueNumber: response.data.number,
        owner: args.owner,
        repo: args.repo,
        title: args.title 
      });

      return {
        success: true,
        issueUrl: response.data.html_url,
        issueNumber: response.data.number,
        createdAt: response.data.created_at,
      };
    } catch (error) {
      logger.error(`Error creating GitHub issue for user ${userId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Get Slack OAuth URL
  async getSlackAuthUrl() {
    const config = this.oauthConfigs.slack;
    if (!config.clientId) {
      throw new Error('Slack OAuth not configured. Missing CLIENT_ID');
    }

    const scopes = [
      'chat:write',
      'channels:read',
      'groups:read',
      'im:read',
      'mpim:read'
    ].join(',');

    const authUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${config.clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${config.redirectUri}`;

    return authUrl;
  }

  // Handle Slack OAuth callback
  async handleSlackCallback(code) {
    const config = this.oauthConfigs.slack;
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Slack OAuth not configured. Missing CLIENT_ID or CLIENT_SECRET');
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', 
        querystring.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
        })
      );

      if (!tokenResponse.data.ok) {
        throw new Error(`Slack OAuth error: ${tokenResponse.data.error}`);
      }

      return {
        accessToken: tokenResponse.data.access_token,
        botAccessToken: tokenResponse.data.authed_user.access_token,
        teamId: tokenResponse.data.team.id,
        teamName: tokenResponse.data.team.name,
        userId: tokenResponse.data.authed_user.id,
        scope: tokenResponse.data.scope,
      };
    } catch (error) {
      logger.error('Error in Slack OAuth callback:', error.response?.data || error.message);
      throw error;
    }
  }

  // Send message via Slack - with actual API call
  async sendSlackMessage(userId, args) {
    // Get the user's Slack connection
    const connection = await AppConnection.findByUserIdAndAppId(userId, 'slack');
    if (!connection || !connection.active) {
      throw new Error('Slack account not connected or inactive');
    }

    try {
      // Send the message using Slack API
      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: args.channel,
          text: args.text,
        },
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      logger.info(`Slack message sent successfully for user ${userId}`, { 
        ts: response.data.ts,
        channel: args.channel,
        text: args.text 
      });

      return {
        success: response.data.ok,
        ts: response.data.ts,
        channel: args.channel,
      };
    } catch (error) {
      logger.error(`Error sending Slack message for user ${userId}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = {
  appIntegrationService: new AppIntegrationService(),
};