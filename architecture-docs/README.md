# MCPHub Architecture Documentation

## 📚 Complete Technical Documentation for MCPHub System

Welcome to the comprehensive architecture documentation for MCPHub - a unified hub for managing and scaling Model Context Protocol (MCP) servers. This documentation provides detailed insights into the system's design, implementation, and operational aspects.

## 🎯 Purpose

MCPHub serves as a centralized orchestration layer that:
- **Manages multiple MCP servers** with different transport protocols (stdio, SSE, HTTP, OpenAPI)
- **Provides unified access** through streamable HTTP and SSE endpoints
- **Enables intelligent routing** with AI-powered tool discovery
- **Supports multi-tenancy** with user-scoped data and configurations
- **Offers flexible grouping** for organizing servers by use case

## 📖 Documentation Index

### Core Architecture
1. **[System Overview](01-system-overview.md)** - High-level architecture and design principles
2. **[Backend Architecture](02-backend-architecture.md)** - Express.js server structure and components
3. **[Frontend Architecture](03-frontend-architecture.md)** - React application structure and UI components
4. **[Data Flow](04-data-flow.md)** - Request/response flows and message routing

### Implementation Details
5. **[Service Layer](05-service-layer.md)** - Service registry pattern and dependency injection
6. **[MCP Protocol](06-mcp-protocol.md)** - Protocol implementation and transport handling
7. **[Authentication](07-authentication.md)** - Security, JWT auth, and access control
8. **[Smart Routing](08-smart-routing.md)** - AI-powered tool discovery system

### Data & API
9. **[Database Schema](09-database-schema.md)** - TypeORM entities and data models
10. **[API Reference](10-api-reference.md)** - Complete REST API documentation

### Operations
11. **[Deployment](11-deployment.md)** - Docker, environment config, and production setup

## 🏗️ Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Protocol**: MCP SDK (@modelcontextprotocol/sdk)
- **Database**: PostgreSQL with pgvector extension
- **Authentication**: JWT with bcrypt
- **ORM**: TypeORM

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **State Management**: Context API
- **UI Components**: shadcn/ui
- **i18n**: react-i18next

### Infrastructure
- **Containerization**: Docker
- **Process Management**: Child process spawning
- **Transport**: SSE, HTTP, stdio, WebSocket
- **AI Integration**: OpenAI API for embeddings

## 🔑 Key Features

### 1. Multi-Protocol Support
- **stdio**: Local subprocess communication
- **SSE**: Server-Sent Events for real-time streaming
- **HTTP**: RESTful communication
- **OpenAPI**: Auto-discovery from OpenAPI specs

### 2. Intelligent Routing
- **Smart Routing**: Semantic search for tool discovery
- **Group Routing**: Organize servers into logical groups
- **Direct Routing**: Access individual servers directly

### 3. Access Control
- **User Management**: Role-based access control
- **Group Permissions**: Fine-grained tool access
- **Bearer Auth**: API token authentication
- **Multi-tenancy**: User-scoped data isolation

### 4. Dynamic Configuration
- **Hot Reload**: Update configurations without restart
- **Service Override**: Customize service implementations
- **Environment Variables**: Flexible deployment config

## 🚀 Quick Navigation

| Section | Description | Key Topics |
|---------|-------------|------------|
| [System Overview](01-system-overview.md) | Architecture fundamentals | Design patterns, component overview |
| [Backend Details](02-backend-architecture.md) | Server implementation | Routes, controllers, services |
| [Frontend Details](03-frontend-architecture.md) | UI implementation | Components, state, routing |
| [Service Layer](05-service-layer.md) | Core services | Registry, dependency injection |
| [Smart Routing](08-smart-routing.md) | AI integration | Vector search, tool discovery |
| [API Reference](10-api-reference.md) | Endpoint documentation | REST APIs, request/response |
| [Deployment](11-deployment.md) | Production setup | Docker, Nginx, monitoring |

## 📊 Visual Diagrams

All architecture diagrams are created using Mermaid and stored in the [`diagrams/`](diagrams/) folder:

- **System Overview**: High-level component interaction
- **Backend Flow**: Request processing pipeline
- **Frontend Flow**: User interaction flow
- **Authentication Flow**: JWT validation process
- **MCP Communication**: Server spawning and messaging
- **Smart Routing Flow**: Vector search workflow
- **Deployment**: Container and network architecture

## 🎓 Learning Path

### For New Developers
1. Start with [System Overview](01-system-overview.md)
2. Understand [Data Flow](04-data-flow.md)
3. Explore [Service Layer](05-service-layer.md)
4. Review [API Reference](10-api-reference.md)

### For System Administrators
1. Begin with [Deployment](11-deployment.md)
2. Review [Authentication](07-authentication.md)
3. Understand [Database Schema](09-database-schema.md)
4. Configure using environment variables

### For Integrators
1. Focus on [API Reference](10-api-reference.md)
2. Understand [MCP Protocol](06-mcp-protocol.md)
3. Learn about [Smart Routing](08-smart-routing.md)
4. Review authentication requirements

## 📝 Documentation Standards

This documentation follows these principles:
- **Clarity**: Technical accuracy with clear explanations
- **Completeness**: Comprehensive coverage of all components
- **Visual Aid**: Diagrams for complex concepts
- **Code Examples**: Practical implementation samples
- **Cross-References**: Links between related topics

## 🔄 Version

Documentation Version: 1.0.0  
MCPHub Version: Latest (dev)  
Last Updated: January 2025

---

*For the main project README, see [../README.md](../README.md)*