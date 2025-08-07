import express from 'express';
import config from './config/index.js';
import path from 'path';
import fs from 'fs';
import { initUpstreamServers, connected, registerVirtualServer } from './services/mcpService.js';
import { initMiddlewares } from './middlewares/index.js';
import { initRoutes } from './routes/index.js';
import { initI18n } from './utils/i18n.js';
import {
  handleSseConnection,
  handleSseMessage,
  handleMcpPostRequest,
  handleMcpOtherRequest,
} from './services/sseService.js';
import { initializeDefaultUser } from './models/User.js';
import { sseUserContextMiddleware } from './middlewares/userContext.js';
import { HubManagementVirtualServer } from './services/virtualServers/hubManagementServer.js';

// Get the current working directory (will be project root in most cases)
const currentFileDir = process.cwd() + '/src';

export class AppServer {
  private app: express.Application;
  private port: number | string;
  private frontendPath: string | null = null;
  private basePath: string;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.basePath = config.basePath;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize i18n before other components
      await initI18n();
      console.log('i18n initialized successfully');

      // Initialize default admin user if no users exist
      await initializeDefaultUser();

      initMiddlewares(this.app);
      initRoutes(this.app);
      console.log('Server initialized successfully');

      // Register the hub-management virtual server
      const hubManagementServer = new HubManagementVirtualServer();
      await registerVirtualServer(hubManagementServer);
      
      initUpstreamServers()
        .then(() => {
          console.log('MCP server initialized successfully');

          // Original routes (global and group-based)
          this.app.get(`${this.basePath}/sse/:group?`, sseUserContextMiddleware, (req, res) =>
            handleSseConnection(req, res),
          );
          this.app.post(`${this.basePath}/messages`, sseUserContextMiddleware, handleSseMessage);
          this.app.post(
            `${this.basePath}/mcp/:group?`,
            sseUserContextMiddleware,
            handleMcpPostRequest,
          );
          this.app.get(
            `${this.basePath}/mcp/:group?`,
            sseUserContextMiddleware,
            handleMcpOtherRequest,
          );
          this.app.delete(
            `${this.basePath}/mcp/:group?`,
            sseUserContextMiddleware,
            handleMcpOtherRequest,
          );

          // User-scoped routes with user context middleware
          this.app.get(`${this.basePath}/:user/sse/:group?`, sseUserContextMiddleware, (req, res) =>
            handleSseConnection(req, res),
          );
          this.app.post(
            `${this.basePath}/:user/messages`,
            sseUserContextMiddleware,
            handleSseMessage,
          );
          this.app.post(
            `${this.basePath}/:user/mcp/:group?`,
            sseUserContextMiddleware,
            handleMcpPostRequest,
          );
          this.app.get(
            `${this.basePath}/:user/mcp/:group?`,
            sseUserContextMiddleware,
            handleMcpOtherRequest,
          );
          this.app.delete(
            `${this.basePath}/:user/mcp/:group?`,
            sseUserContextMiddleware,
            handleMcpOtherRequest,
          );
        })
        .catch((error) => {
          console.error('Error initializing MCP server:', error);
          throw error;
        })
        .finally(() => {
          // Find and serve frontend
          this.findAndServeFrontend();
        });
    } catch (error) {
      console.error('Error initializing server:', error);
      throw error;
    }
  }

  private findAndServeFrontend(): void {
    // Try the main frontend build first
    this.frontendPath = path.join(process.cwd(), 'public');
    
    // Fallback to static frontend if main frontend not found
    const staticFrontendPath = path.join(process.cwd(), 'public-static');

    if (fs.existsSync(this.frontendPath) && fs.existsSync(path.join(this.frontendPath, 'index.html'))) {
      console.log(`Serving frontend from: ${this.frontendPath}`);
      
      // Serve frontend on /app path
      this.app.use('/app', express.static(this.frontendPath));
      
      // Add the wildcard route for SPA on /app path
      this.app.get('/app/*', (_req, res) => {
        res.sendFile(path.join(this.frontendPath!, 'index.html'));
      });

      // Redirect root to /app for frontend access
      this.app.get('/', (_req, res) => {
        res.redirect('/app');
      });
      
      // Keep API routes on /api path
      console.log('Frontend available at /app, API at /api');
    } else if (fs.existsSync(staticFrontendPath) && fs.existsSync(path.join(staticFrontendPath, 'index.html'))) {
      console.log(`Serving static frontend from: ${staticFrontendPath}`);
      
      // Serve static frontend on /app path
      this.app.use('/app', express.static(staticFrontendPath));
      
      // Add the wildcard route for SPA on /app path
      this.app.get('/app/*', (_req, res) => {
        res.sendFile(path.join(staticFrontendPath, 'index.html'));
      });

      // Redirect root to /app for frontend access
      this.app.get('/', (_req, res) => {
        res.redirect('/app');
      });
      
      // Keep API routes on /api path
      console.log('Static frontend available at /app, API at /api');
    } else {
      console.warn('No frontend found. Server will run without frontend.');
      
      // Show helpful message with API endpoints
      this.app.get('/', (_req, res) => {
        res.send(`
          <html>
            <head><title>MCPHub API</title></head>
            <body>
              <h1>MCPHub API is Running</h1>
              <p>The frontend UI is not available, but the API is working.</p>
              <h2>Available Endpoints:</h2>
              <ul>
                <li><a href="/api/servers">/api/servers</a> - List MCP servers</li>
                <li><a href="/api/settings">/api/settings</a> - Get settings</li>
                <li><a href="/api/health">/api/health</a> - Health check</li>
              </ul>
              <p>If you need the frontend, please check the deployment configuration.</p>
            </body>
          </html>
        `);
      });
    }
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
      if (this.frontendPath) {
        console.log(`Open http://localhost:${this.port} in your browser to access MCPHub UI`);
      } else {
        console.log(
          `MCPHub API is running on http://localhost:${this.port}, but the UI is not available`,
        );
      }
    });
  }

  connected(): boolean {
    return connected();
  }

  getApp(): express.Application {
    return this.app;
  }

  // Removed findFrontendDistPath as frontend is now copied to a fixed /app/public location
  // The logic for finding package root is still relevant for other parts of the application,
  // but not for serving the frontend directly.
  // private findFrontendDistPath(): string | null { ... }

  // Helper method to find the package root (where package.json is located)
  private findPackageRoot(): string | null {
    const debug = process.env.DEBUG === 'true';

    // Possible locations for package.json
    const possibleRoots = [
      // Standard npm package location
      path.resolve(currentFileDir, '..', '..'),
      // Current working directory
      process.cwd(),
      // When running from dist directory
      path.resolve(currentFileDir, '..'),
      // When installed via npx
      path.resolve(currentFileDir, '..', '..', '..'),
    ];

    // Special handling for npx
    if (process.argv[1] && process.argv[1].includes('_npx')) {
      const npxDir = path.dirname(process.argv[1]);
      possibleRoots.unshift(path.resolve(npxDir, '..'));
    }

    if (debug) {
      console.log('DEBUG: Checking for package.json in:', possibleRoots);
    }

    for (const root of possibleRoots) {
      const packageJsonPath = path.join(root, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (pkg.name === 'mcphub' || pkg.name === '@samanhappy/mcphub') {
            if (debug) {
              console.log(`DEBUG: Found package.json at ${packageJsonPath}`);
            }
            return root;
          }
        } catch (e) {
          if (debug) {
            console.error(`DEBUG: Failed to parse package.json at ${packageJsonPath}:`, e);
          }
          // Continue to the next potential root
        }
      }
    }

    return null;
  }
}

export default AppServer;
