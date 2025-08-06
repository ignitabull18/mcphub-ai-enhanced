# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
pnpm dev               # Start both backend and frontend with hot-reload
pnpm backend:dev       # Backend only (TypeScript watch mode)
pnpm frontend:dev      # Frontend only (Vite dev server)

# Building
pnpm build             # Build both backend and frontend
pnpm backend:build     # TypeScript compilation to dist/
pnpm frontend:build    # Vite production build

# Testing
pnpm test              # Run all tests
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Generate coverage report
pnpm test:verbose      # Verbose test output

# Code Quality
pnpm lint              # ESLint check (*.ts files)
pnpm format            # Prettier formatting
```

## Architecture Overview

MCPHub is a TypeScript/Node.js hub that manages multiple MCP (Model Context Protocol) servers and exposes them through unified HTTP/SSE endpoints. The system provides smart routing, group management, and multi-tenancy support.

### Core Service Architecture

**Service Registry Pattern**: All services are registered in `src/services/registry.ts` allowing for dependency injection and hot-swapping. Services can be overridden for customization.

**MCP Server Management**: The `mcpService` handles spawning and managing MCP server processes. Servers are configured via `mcp_settings.json` and can use different transport types:
- **stdio**: Local subprocess communication
- **sse**: Server-Sent Events for real-time streaming
- **streamable-http**: RESTful HTTP transport
- **openapi**: REST API integration with automatic tool discovery

**Smart Routing**: When enabled, MCPHub uses vector embeddings (pgvector + OpenAI) to intelligently discover relevant tools based on semantic search. The `$smart` group provides `search_tools` and `call_tool` capabilities.

**Group Management**: Servers can be organized into groups with fine-grained tool access control. Each group can selectively enable/disable specific tools from its member servers.

### Request Flow

1. **Client Request** → `/mcp/:group` or `/sse/:group`
2. **Authentication** → JWT/Bearer token validation (unless skipAuth is enabled)
3. **Group Resolution** → Determine target servers from group/server name
4. **Tool Discovery** → Smart routing or direct tool listing
5. **MCP Communication** → Transport-specific message handling
6. **Response Streaming** → SSE or HTTP response back to client

### Key Service Interactions

- `mcpService` ← manages → MCP server processes
- `sseService` ← handles → SSE/HTTP streaming communication
- `groupService` ← organizes → server collections and permissions
- `vectorSearchService` ← powers → smart tool discovery
- `dataService` ← filters → user-specific data and context

## Development Guidelines

### Import Convention
Use ESM modules with `.js` extensions for TypeScript imports:
```typescript
import { Service } from './services/service.js'; // ✓ Correct
import { Service } from './services/service.ts'; // ✗ Wrong
```

### Adding New MCP Servers
1. Update `mcp_settings.json` with server configuration
2. Restart the backend to pick up changes (hot-reload enabled in dev mode)
3. Verify server connection in the dashboard

### Extending Functionality
- **New API endpoints**: Add routes in `src/routes/`, controllers in `src/controllers/`
- **Service customization**: Override services via `registerService()` in registry
- **Frontend features**: Start from `frontend/src/pages/`, follow React/TypeScript patterns
- **Custom transports**: Implement transport interface in `src/services/transports/`

### Testing Patterns
Tests use Jest with TypeScript support. Mock services using `jest-mock-extended`:
```typescript
const mockService = mock<McpService>();
registerService('mcpService', mockService);
```

### Configuration Files
- `mcp_settings.json`: MCP server definitions and groups
- `.env`: Environment variables (JWT_SECRET, OPENAI_API_KEY, etc.)
- `data/users.json`: User authentication data (auto-created)

## Important Considerations

- All code comments must be in English
- Frontend uses i18n - add translations to `frontend/public/locales/`
- Server processes are managed as child processes - ensure proper cleanup
- MCP protocol messages use JSON-RPC 2.0 format
- Smart routing requires PostgreSQL with pgvector extension
- Authentication can be disabled with `SKIP_AUTH=true` for development