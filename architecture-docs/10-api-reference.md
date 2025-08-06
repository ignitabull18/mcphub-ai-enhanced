# API Reference

## Complete REST API Documentation

This document provides comprehensive documentation for all MCPHub REST API endpoints, including request/response formats, authentication requirements, and usage examples.

## 🔐 Authentication

All API endpoints require authentication unless otherwise specified. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

Or for SSE connections, use query parameter:
```
?token=<jwt_token>
```

## 📚 API Endpoints

### Authentication

#### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "isAdmin": true
  }
}
```

#### POST /api/auth/register
Register a new user (admin only).

**Request:**
```json
{
  "username": "newuser",
  "password": "securepass123",
  "isAdmin": false
}
```

#### POST /api/auth/change-password
Change password for current user.

**Request:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

#### GET /api/auth/me
Get current user information.

**Response:**
```json
{
  "username": "admin",
  "isAdmin": true,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Server Management

#### GET /api/servers
List all configured MCP servers.

**Query Parameters:**
- `status` (optional): Filter by status (connected, disconnected, error)
- `type` (optional): Filter by type (stdio, sse, http, openapi)

**Response:**
```json
[
  {
    "name": "weather-api",
    "type": "http",
    "url": "http://localhost:8080",
    "enabled": true,
    "status": "connected",
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather",
        "inputSchema": {...}
      }
    ]
  }
]
```

#### POST /api/servers
Create a new MCP server.

**Request:**
```json
{
  "name": "new-server",
  "type": "stdio",
  "command": "python",
  "args": ["server.py"],
  "env": {
    "API_KEY": "xxx"
  },
  "enabled": true
}
```

#### PUT /api/servers/:name
Update server configuration.

**Request:**
```json
{
  "enabled": false,
  "env": {
    "API_KEY": "new-key"
  }
}
```

#### DELETE /api/servers/:name
Delete a server configuration.

#### POST /api/servers/:name/toggle
Toggle server enabled state.

**Response:**
```json
{
  "enabled": true,
  "message": "Server enabled successfully"
}
```

### Tool Management

#### POST /api/servers/:serverName/tools/:toolName/toggle
Enable or disable a specific tool.

**Request:**
```json
{
  "enabled": false
}
```

#### PUT /api/servers/:serverName/tools/:toolName/description
Update tool description.

**Request:**
```json
{
  "description": "Updated tool description"
}
```

#### POST /api/tools/call/:server
Execute a tool on a specific server.

**Request:**
```json
{
  "tool": "get_weather",
  "arguments": {
    "location": "San Francisco",
    "units": "celsius"
  }
}
```

**Response:**
```json
{
  "result": {
    "temperature": 18,
    "conditions": "sunny",
    "humidity": 65
  }
}
```

### Group Management

#### GET /api/groups
List all server groups.

**Response:**
```json
[
  {
    "id": "uuid-1234",
    "name": "production",
    "description": "Production servers",
    "servers": ["server1", "server2"],
    "owner": "admin"
  }
]
```

#### GET /api/groups/:id
Get specific group details.

#### POST /api/groups
Create a new group.

**Request:**
```json
{
  "name": "development",
  "description": "Development servers",
  "servers": ["dev-server1", "dev-server2"]
}
```

#### PUT /api/groups/:id
Update group configuration.

**Request:**
```json
{
  "name": "staging",
  "description": "Updated description",
  "servers": ["server1", "server3"]
}
```

#### DELETE /api/groups/:id
Delete a group.

#### POST /api/groups/:id/servers
Add server to group.

**Request:**
```json
{
  "serverName": "new-server"
}
```

#### DELETE /api/groups/:id/servers/:serverName
Remove server from group.

#### PUT /api/groups/:id/servers/batch
Batch update servers in group.

**Request:**
```json
{
  "servers": [
    {
      "name": "server1",
      "tools": ["tool1", "tool2"]
    },
    {
      "name": "server2",
      "tools": "all"
    }
  ]
}
```

#### GET /api/groups/:id/server-configs
Get server configurations within group.

#### PUT /api/groups/:id/server-configs/:serverName/tools
Update tool configuration for server in group.

**Request:**
```json
{
  "tools": ["allowed_tool1", "allowed_tool2"]
}
```

### User Management (Admin Only)

#### GET /api/users
List all users.

**Response:**
```json
[
  {
    "username": "user1",
    "isAdmin": false,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

#### GET /api/users/:username
Get specific user details.

#### POST /api/users
Create new user.

**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "isAdmin": false
}
```

#### PUT /api/users/:username
Update user.

**Request:**
```json
{
  "isAdmin": true,
  "password": "newpassword"
}
```

#### DELETE /api/users/:username
Delete user.

#### GET /api/users-stats
Get user statistics.

**Response:**
```json
{
  "totalUsers": 10,
  "adminUsers": 2,
  "activeToday": 5,
  "newThisWeek": 3
}
```

### System Configuration

#### GET /api/settings
Get all system settings.

**Response:**
```json
{
  "mcpServers": {...},
  "groups": [...],
  "systemConfig": {
    "routing": {
      "enableGlobalRoute": true,
      "enableGroupNameRoute": true,
      "enableBearerAuth": false
    },
    "smartRouting": {
      "enabled": true,
      "threshold": 0.7
    }
  }
}
```

#### PUT /api/system-config
Update system configuration.

**Request:**
```json
{
  "routing": {
    "enableGlobalRoute": false
  },
  "smartRouting": {
    "threshold": 0.8
  }
}
```

### Market/Store

#### GET /api/market/servers
List all available servers in marketplace.

**Query Parameters:**
- `category` (optional): Filter by category
- `tag` (optional): Filter by tag
- `search` (optional): Search query

**Response:**
```json
[
  {
    "name": "weather-server",
    "display_name": "Weather API Server",
    "description": "Provides weather data",
    "categories": ["utility", "data"],
    "tags": ["weather", "api"],
    "author": {
      "name": "John Doe"
    },
    "installations": {
      "npm": {
        "type": "npm",
        "command": "npx",
        "args": ["weather-mcp-server"]
      }
    }
  }
]
```

#### GET /api/market/servers/:name
Get specific server details from marketplace.

#### GET /api/market/categories
List all marketplace categories.

#### GET /api/market/tags
List all marketplace tags.

### Logs

#### GET /api/logs
Get system logs.

**Query Parameters:**
- `level` (optional): Filter by log level (error, warn, info, debug)
- `since` (optional): ISO timestamp
- `limit` (optional): Maximum entries (default: 100)

**Response:**
```json
[
  {
    "timestamp": "2025-01-06T10:30:00Z",
    "level": "error",
    "message": "Failed to connect to server",
    "metadata": {
      "server": "weather-api",
      "error": "Connection timeout"
    }
  }
]
```

#### DELETE /api/logs
Clear all logs (admin only).

#### GET /api/logs/stream
Stream logs via SSE.

**SSE Events:**
```
data: {"timestamp":"2025-01-06T10:30:00Z","level":"info","message":"Server connected"}

data: {"timestamp":"2025-01-06T10:31:00Z","level":"error","message":"Tool execution failed"}
```

### Runtime Configuration

#### GET /api/config/runtime
Get runtime configuration.

**Response:**
```json
{
  "version": "1.0.0",
  "environment": "production",
  "features": {
    "smartRouting": true,
    "multiTenant": true
  }
}
```

#### GET /api/config/public
Get public configuration (no auth required).

**Response:**
```json
{
  "authRequired": true,
  "smartRoutingEnabled": true,
  "version": "1.0.0"
}
```

## 🔄 MCP Protocol Endpoints

### SSE Connection

#### GET /sse/:group?
Establish SSE connection for MCP communication.

**Query Parameters:**
- `token` (required if auth enabled): JWT token

**SSE Events:**
```
event: message
data: {"jsonrpc":"2.0","method":"tools/list","params":{}}

event: ping
data: keep-alive
```

#### POST /messages
Send message through SSE connection.

**Query Parameters:**
- `sessionId` (required): SSE session ID

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "NYC"
    }
  }
}
```

### HTTP Streaming

#### POST /mcp/:group?
Send MCP request via HTTP.

**Headers:**
- `mcp-session-id` (optional): Session ID for persistent connection

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.1.0",
    "serverInfo": {
      "name": "mcphub",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {}
    }
  }
}
```

#### GET /mcp/:group?
Get MCP server information.

#### DELETE /mcp/:group?
Close MCP connection.

## 📊 Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |
| 502 | Bad Gateway (MCP server error) |
| 503 | Service Unavailable |

## 🔍 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "username",
      "issue": "Username already exists"
    }
  },
  "timestamp": "2025-01-06T10:30:00Z"
}
```

## 📝 Rate Limiting

Default rate limits:
- Authentication endpoints: 5 requests per 15 minutes
- API endpoints: 100 requests per 15 minutes  
- Admin endpoints: 1000 requests per 15 minutes

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704110400
```

## 🔧 Webhooks

Configure webhooks for events:

```json
{
  "url": "https://your-webhook.com/endpoint",
  "events": ["server.connected", "tool.executed", "error.occurred"],
  "secret": "webhook-secret"
}
```

Webhook payload:
```json
{
  "event": "server.connected",
  "timestamp": "2025-01-06T10:30:00Z",
  "data": {
    "server": "weather-api",
    "status": "connected"
  },
  "signature": "sha256=..."
}
```

## 📚 Related Documentation

- [Backend Architecture](02-backend-architecture.md) - Server implementation
- [Authentication](07-authentication.md) - Auth details
- [Data Flow](04-data-flow.md) - Request flow
- [MCP Protocol](06-mcp-protocol.md) - Protocol details

---

*Next: [Deployment →](11-deployment.md)*