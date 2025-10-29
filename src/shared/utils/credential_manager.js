#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use XDG config directory for credentials
const CONFIG_DIR = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME, ".config");
const CREDENTIALS_DIR = path.join(CONFIG_DIR, "mcp");
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "credentials.enc");
const KEY_FILE = path.join(CREDENTIALS_DIR, "master.key");

// Ensure directories exist
if (!fs.existsSync(CREDENTIALS_DIR)) {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
}

class CredentialManager {
  constructor() {
    this.masterKey = this.getOrCreateMasterKey();
    this.credentials = this.loadCredentials();
  }

  getOrCreateMasterKey() {
    if (fs.existsSync(KEY_FILE)) {
      return fs.readFileSync(KEY_FILE);
    } else {
      // Generate a new master key
      const key = crypto.randomBytes(32);
      fs.writeFileSync(KEY_FILE, key);
      // Set restrictive permissions
      fs.chmodSync(KEY_FILE, 0o600);
      console.log("🔐 New master key created and saved");
      return key;
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.masterKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  decrypt(encryptedText) {
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.masterKey, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  loadCredentials() {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return {};
    }

    try {
      const encryptedData = fs.readFileSync(CREDENTIALS_FILE, "utf8");
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error("Failed to load credentials:", error);
      return {};
    }
  }

  saveCredentials() {
    try {
      const data = JSON.stringify(this.credentials, null, 2);
      const encryptedData = this.encrypt(data);
      fs.writeFileSync(CREDENTIALS_FILE, encryptedData);
      // Set restrictive permissions
      fs.chmodSync(CREDENTIALS_FILE, 0o600);
    } catch (error) {
      console.error("Failed to save credentials:", error);
      throw error;
    }
  }

  setCredential(service, key, value) {
    if (!this.credentials[service]) {
      this.credentials[service] = {};
    }
    this.credentials[service][key] = value;
    this.saveCredentials();
    console.log(`✅ Credential set for ${service}.${key}`);
  }

  getCredential(service, key) {
    return this.credentials[service]?.[key];
  }

  getServiceCredentials(service) {
    return this.credentials[service] || {};
  }

  listServices() {
    return Object.keys(this.credentials);
  }

  deleteCredential(service, key) {
    if (this.credentials[service] && this.credentials[service][key]) {
      delete this.credentials[service][key];
      this.saveCredentials();
      console.log(`🗑️ Credential deleted for ${service}.${key}`);
      return true;
    }
    return false;
  }

  deleteService(service) {
    if (this.credentials[service]) {
      delete this.credentials[service];
      this.saveCredentials();
      console.log(`🗑️ All credentials deleted for service ${service}`);
      return true;
    }
    return false;
  }

  // Convenience methods for common services
  setGoogleCredentials(credentials) {
    this.setCredential("google", "credentials", credentials);
  }

  getGoogleCredentials() {
    return this.getCredential("google", "credentials");
  }

  setNotionToken(token) {
    this.setCredential("notion", "token", token);
  }

  getNotionToken() {
    return this.getCredential("notion", "token");
  }

  setOpenAIKey(key) {
    this.setCredential("openai", "api_key", key);
  }

  getOpenAIKey() {
    return this.getCredential("openai", "api_key");
  }

  setGeminiKey(key) {
    this.setCredential("gemini", "api_key", key);
  }

  getGeminiKey() {
    return this.getCredential("gemini", "api_key");
  }
}

// CLI interface for managing credentials
async function main() {
  const args = process.argv.slice(2);
  const manager = new CredentialManager();

  if (args.length === 0) {
    console.log("MCP Credential Manager");
    console.log("Usage:");
    console.log("  node credential_manager.js list");
    console.log("  node credential_manager.js get <service> [key]");
    console.log("  node credential_manager.js set <service> <key> <value>");
    console.log("  node credential_manager.js delete <service> [key]");
    console.log("  node credential_manager.js services");
    return;
  }

  const command = args[0];

  switch (command) {
    case "list":
      console.log("Stored credentials:");
      for (const service of manager.listServices()) {
        const creds = manager.getServiceCredentials(service);
        console.log(`  ${service}:`);
        for (const key of Object.keys(creds)) {
          console.log(`    ${key}: [HIDDEN]`);
        }
      }
      break;

    case "get":
      const [service, key] = args.slice(1);
      if (!service) {
        console.error("Service name required");
        return;
      }
      if (key) {
        const value = manager.getCredential(service, key);
        console.log(value || "Not found");
      } else {
        const creds = manager.getServiceCredentials(service);
        console.log(JSON.stringify(creds, null, 2));
      }
      break;

    case "set":
      const [setService, setKey, setValue] = args.slice(1);
      if (!setService || !setKey || !setValue) {
        console.error("Service, key, and value required");
        return;
      }
      manager.setCredential(setService, setKey, setValue);
      break;

    case "delete":
      const [delService, delKey] = args.slice(1);
      if (!delService) {
        console.error("Service name required");
        return;
      }
      if (delKey) {
        manager.deleteCredential(delService, delKey);
      } else {
        manager.deleteService(delService);
      }
      break;

    case "services":
      console.log("Available services:", manager.listServices().join(", "));
      break;

    default:
      console.error("Unknown command:", command);
  }
}

export default CredentialManager;

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}