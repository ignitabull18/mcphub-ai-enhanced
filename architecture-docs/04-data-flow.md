# Data Flow

## Request/Response Flows and Message Routing

This document details how data flows through the MCPHub system, from client requests to MCP server responses, including all intermediate processing steps.

## 🔄 Core Data Flow Patterns

### 1. SSE Connection Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Auth as Auth MW
    participant SSE as SSE Service
    participant MCP as MCP Service
    participant Server as MCP Server
    
    Client->>Gateway: GET /sse/{group}
    Gateway->>Auth: Validate JWT/Bearer
    Auth->>SSE: Create SSE connection
    SSE->>SSE: Generate sessionId
    SSE->>MCP: getMcpServer(sessionId, group)
    MCP->>MCP: Create Server instance
    MCP->>Server: Connect transport
    Server-->>MCP: Connection established
    MCP-->>SSE: Server ready
    SSE-->>Client: SSE stream opened
    
    Note over Client,Server: Bidirectional communication established
    
    Client->>Gateway: POST /messages?sessionId=xxx
    Gateway->>SSE: handleSseMessage
    SSE->>MCP: Forward message
    MCP->>Server: Send MCP message
    Server-->>MCP: Response
    MCP-->>SSE: Forward response
    SSE-->>Client: SSE event
```

### 2. HTTP Streaming Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Auth as Auth MW
    participant SSE as SSE Service
    participant MCP as MCP Service
    participant Server as MCP Server
    
    Client->>Gateway: POST /mcp/{group}
    Gateway->>Auth: Validate auth
    Auth->>SSE: handleMcpPostRequest
    
    alt Initialize Request
        SSE->>SSE: Create new transport
        SSE->>MCP: getMcpServer(sessionId, group)
        MCP->>Server: Initialize connection
        Server-->>MCP: Server info
        MCP-->>SSE: Capabilities
        SSE-->>Client: Initialize response
    else Tool Request
        SSE->>MCP: Forward request
        MCP->>Server: Execute tool
        Server-->>MCP: Tool result
        MCP-->>SSE: Response
        SSE-->>Client: Tool response
    end
```

### 3. Smart Routing Flow

```mermaid
graph TB
    subgraph "Client Request"
        REQ[Tool Query]
    end
    
    subgraph "Smart Routing"
        EMBED[Generate Embedding]
        SEARCH[Vector Search]
        FILTER[Filter Results]
        RANK[Rank Tools]
    end
    
    subgraph "Tool Discovery"
        DISC1[search_tools]
        DISC2[call_tool]
    end
    
    subgraph "Execution"
        SELECT[Select Server]
        EXEC[Execute Tool]
        RESULT[Return Result]
    end
    
    REQ --> EMBED
    EMBED --> SEARCH
    SEARCH --> FILTER
    FILTER --> RANK
    RANK --> DISC1
    DISC1 --> DISC2
    DISC2 --> SELECT
    SELECT --> EXEC
    EXEC --> RESULT
```

## 📨 Message Formats

### MCP Protocol Messages

#### Initialize Request
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "mcphub",
      "version": "1.0.0"
    }
  }
}
```

#### Tool List Request
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

#### Tool Execution Request
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "San Francisco"
    }
  }
}
```

### API Response Formats

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "timestamp": "2025-01-06T10:30:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid credentials",
    "details": {}
  },
  "timestamp": "2025-01-06T10:30:00Z"
}
```

## 🎯 Routing Strategies

### 1. Direct Server Routing
```typescript
// Route: /mcp/{serverName}
flowchart LR
    Request --> ServerName
    ServerName --> LoadConfig
    LoadConfig --> ConnectServer
    ConnectServer --> ForwardMessage
    ForwardMessage --> Response
```

### 2. Group-Based Routing
```typescript
// Route: /mcp/{groupId}
flowchart LR
    Request --> GroupId
    GroupId --> ResolveServers
    ResolveServers --> FilterTools
    FilterTools --> RouteToServers
    RouteToServers --> AggregateResponses
    AggregateResponses --> Response
```

### 3. Global Routing
```typescript
// Route: /mcp (no group specified)
flowchart LR
    Request --> AllServers
    AllServers --> CheckPermissions
    CheckPermissions --> BroadcastRequest
    BroadcastRequest --> CollectResponses
    CollectResponses --> Response
```

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Frontend
    participant API
    participant Auth
    participant DB
    
    Client->>Frontend: Enter credentials
    Frontend->>API: POST /auth/login
    API->>Auth: Validate credentials
    Auth->>DB: Check user
    DB-->>Auth: User data
    Auth->>Auth: Generate JWT
    Auth-->>API: Token + User
    API-->>Frontend: Auth response
    Frontend->>Frontend: Store token
    
    Note over Frontend: Subsequent requests
    
    Frontend->>API: Request + Bearer token
    API->>Auth: Validate token
    Auth-->>API: User context
    API->>API: Process request
    API-->>Frontend: Response
```

## 🔄 Tool Execution Flow

### Complete Tool Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ToolDiscovery: Client requests tools
    ToolDiscovery --> ToolSelection: List available tools
    ToolSelection --> ParameterValidation: User selects tool
    ParameterValidation --> ServerRouting: Validate inputs
    ServerRouting --> ToolExecution: Route to server
    ToolExecution --> ResultProcessing: Execute tool
    ResultProcessing --> ResponseFormatting: Process result
    ResponseFormatting --> [*]: Return to client
    
    ParameterValidation --> ErrorHandling: Invalid params
    ToolExecution --> ErrorHandling: Execution error
    ErrorHandling --> ResponseFormatting: Format error
```

### Tool Discovery Process

```typescript
// 1. List all tools from a group
async function discoverTools(groupId: string) {
  const group = getGroup(groupId);
  const servers = getServersInGroup(group);
  
  const allTools = [];
  for (const server of servers) {
    const tools = await server.listTools();
    const filtered = filterToolsByGroup(tools, group.config);
    allTools.push(...filtered);
  }
  
  return allTools;
}

// 2. Execute a specific tool
async function executeTool(toolName: string, args: any) {
  const server = findServerWithTool(toolName);
  const result = await server.callTool(toolName, args);
  return result;
}
```

## 📊 Data Transformation Pipeline

### Request Processing

```mermaid
graph LR
    subgraph "Input Processing"
        RAW[Raw Request]
        PARSE[Parse JSON]
        VALIDATE[Validate Schema]
        SANITIZE[Sanitize Input]
    end
    
    subgraph "Business Logic"
        AUTH[Authenticate]
        AUTHORIZE[Authorize]
        TRANSFORM[Transform Data]
        EXECUTE[Execute Logic]
    end
    
    subgraph "Output Processing"
        FORMAT[Format Response]
        SERIALIZE[Serialize JSON]
        COMPRESS[Compress]
        SEND[Send Response]
    end
    
    RAW --> PARSE
    PARSE --> VALIDATE
    VALIDATE --> SANITIZE
    SANITIZE --> AUTH
    AUTH --> AUTHORIZE
    AUTHORIZE --> TRANSFORM
    TRANSFORM --> EXECUTE
    EXECUTE --> FORMAT
    FORMAT --> SERIALIZE
    SERIALIZE --> COMPRESS
    COMPRESS --> SEND
```

## 🌊 Streaming Data Flow

### SSE Event Stream

```typescript
// Server-Sent Events format
data: {"type":"tool-list","tools":[...]}\n\n
data: {"type":"tool-result","result":{...}}\n\n
data: {"type":"error","error":"..."}\n\n
event: ping\ndata: keep-alive\n\n
```

### Chunked Response Handling

```typescript
class StreamProcessor {
  private buffer: string = '';
  
  processChunk(chunk: string) {
    this.buffer += chunk;
    
    // Look for complete messages
    const messages = this.buffer.split('\n\n');
    this.buffer = messages.pop() || '';
    
    for (const message of messages) {
      if (message.startsWith('data: ')) {
        const data = JSON.parse(message.slice(6));
        this.handleMessage(data);
      }
    }
  }
  
  handleMessage(data: any) {
    switch(data.type) {
      case 'tool-list':
        this.updateToolList(data.tools);
        break;
      case 'tool-result':
        this.displayResult(data.result);
        break;
      case 'error':
        this.handleError(data.error);
        break;
    }
  }
}
```

## 🔀 Concurrent Request Handling

### Parallel Tool Execution

```mermaid
graph TB
    subgraph "Request Distribution"
        REQ[Client Request]
        SPLIT[Split by Server]
        Q1[Server 1 Queue]
        Q2[Server 2 Queue]
        Q3[Server 3 Queue]
    end
    
    subgraph "Parallel Processing"
        P1[Process 1]
        P2[Process 2]
        P3[Process 3]
    end
    
    subgraph "Response Aggregation"
        AGG[Aggregate Results]
        MERGE[Merge Responses]
        RESP[Client Response]
    end
    
    REQ --> SPLIT
    SPLIT --> Q1
    SPLIT --> Q2
    SPLIT --> Q3
    Q1 --> P1
    Q2 --> P2
    Q3 --> P3
    P1 --> AGG
    P2 --> AGG
    P3 --> AGG
    AGG --> MERGE
    MERGE --> RESP
```

## 💾 Data Persistence Flow

### Configuration Updates

```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant Service
    participant Cache
    participant FileSystem
    participant Servers
    
    Admin->>API: Update configuration
    API->>Service: Process update
    Service->>Cache: Clear cache
    Service->>FileSystem: Write settings.json
    FileSystem-->>Service: Success
    Service->>Servers: Notify change
    Servers->>Servers: Reload config
    Servers-->>Service: Acknowledged
    Service-->>API: Update complete
    API-->>Admin: Success response
```

## 🔍 Smart Routing Data Flow

### Vector Search Pipeline

```typescript
// 1. Query embedding generation
async function processQuery(query: string) {
  const embedding = await openai.createEmbedding(query);
  return embedding.vector;
}

// 2. Database search
async function searchTools(vector: number[]) {
  const sql = `
    SELECT tool_name, server_name, description,
           1 - (embedding <=> $1) as similarity
    FROM vector_embeddings
    WHERE 1 - (embedding <=> $1) > $2
    ORDER BY similarity DESC
    LIMIT $3
  `;
  
  return db.query(sql, [vector, threshold, limit]);
}

// 3. Result processing
function processResults(results: SearchResult[]) {
  return results.map(r => ({
    tool: r.tool_name,
    server: r.server_name,
    confidence: r.similarity,
    description: r.description
  }));
}
```

## 🚦 Error Handling Flow

```mermaid
graph TB
    subgraph "Error Detection"
        ERR[Error Occurs]
        TYPE[Classify Error]
    end
    
    subgraph "Error Types"
        VAL[Validation Error]
        AUTH[Auth Error]
        NET[Network Error]
        SRV[Server Error]
    end
    
    subgraph "Error Handling"
        LOG[Log Error]
        NOTIFY[Notify User]
        RETRY[Retry Logic]
        FALLBACK[Fallback]
    end
    
    subgraph "Recovery"
        RECOVER[Recovery Action]
        REPORT[Error Report]
    end
    
    ERR --> TYPE
    TYPE --> VAL
    TYPE --> AUTH
    TYPE --> NET
    TYPE --> SRV
    
    VAL --> LOG
    AUTH --> LOG
    NET --> RETRY
    SRV --> FALLBACK
    
    LOG --> NOTIFY
    RETRY --> RECOVER
    FALLBACK --> RECOVER
    RECOVER --> REPORT
```

## 📈 Performance Monitoring Flow

### Metrics Collection

```typescript
interface RequestMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  userId?: string;
  serverName?: string;
  toolName?: string;
}

class MetricsCollector {
  private metrics: RequestMetrics[] = [];
  
  startTimer(requestId: string) {
    this.timers[requestId] = Date.now();
  }
  
  endTimer(requestId: string, metadata: Partial<RequestMetrics>) {
    const duration = Date.now() - this.timers[requestId];
    
    this.metrics.push({
      timestamp: new Date(),
      duration,
      ...metadata
    });
    
    // Send to monitoring service
    this.sendMetrics();
  }
  
  async sendMetrics() {
    if (this.metrics.length > 100) {
      await monitoring.send(this.metrics);
      this.metrics = [];
    }
  }
}
```

## 🔒 Security Data Flow

### Request Sanitization Pipeline

```mermaid
graph LR
    subgraph "Input Security"
        INPUT[Raw Input]
        XSS[XSS Filter]
        SQL[SQL Injection Check]
        SIZE[Size Validation]
    end
    
    subgraph "Processing"
        SAFE[Safe Data]
        PROCESS[Business Logic]
    end
    
    subgraph "Output Security"
        ESCAPE[Escape Output]
        HEADERS[Security Headers]
        RESPONSE[Secure Response]
    end
    
    INPUT --> XSS
    XSS --> SQL
    SQL --> SIZE
    SIZE --> SAFE
    SAFE --> PROCESS
    PROCESS --> ESCAPE
    ESCAPE --> HEADERS
    HEADERS --> RESPONSE
```

## 📚 Related Documentation

- [Backend Architecture](02-backend-architecture.md) - Server implementation
- [Service Layer](05-service-layer.md) - Service patterns
- [MCP Protocol](06-mcp-protocol.md) - Protocol details
- [Smart Routing](08-smart-routing.md) - AI routing system

---

*Next: [Service Layer →](05-service-layer.md)*