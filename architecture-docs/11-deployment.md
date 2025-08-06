# Deployment Architecture

## Docker Containerization, Environment Configuration, and Production Setup

This document provides comprehensive guidance for deploying MCPHub in various environments, from development to production.

## 🐳 Docker Deployment

### Basic Docker Setup

```bash
# Pull and run the official image
docker run -p 3000:3000 \
  -v ./mcp_settings.json:/app/mcp_settings.json \
  -v ./data:/app/data \
  samanhappy/mcphub
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  mcphub:
    image: samanhappy/mcphub:latest
    container_name: mcphub
    ports:
      - "3000:3000"
    volumes:
      - ./mcp_settings.json:/app/mcp_settings.json
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - SKIP_AUTH=${SKIP_AUTH:-false}
      - BASE_PATH=${BASE_PATH:-}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    restart: unless-stopped
    networks:
      - mcphub-network

  postgres:
    image: pgvector/pgvector:pg16
    container_name: mcphub-postgres
    environment:
      POSTGRES_DB: mcphub
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - mcphub-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: mcphub-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mcphub
    networks:
      - mcphub-network
    restart: unless-stopped

networks:
  mcphub-network:
    driver: bridge

volumes:
  postgres-data:
```

### Custom Dockerfile

```dockerfile
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache python3

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create data directory
RUN mkdir -p /app/data /app/logs

# Set user
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## 🔧 Environment Configuration

### Environment Variables

```bash
# .env file
# Server Configuration
NODE_ENV=production
PORT=3000
BASE_PATH=/mcphub

# Authentication
JWT_SECRET=your-secret-key-minimum-32-chars
SKIP_AUTH=false

# Database (for Smart Routing)
DATABASE_URL=postgresql://user:password@localhost:5432/mcphub

# OpenAI (for Smart Routing)
OPENAI_API_KEY=sk-...

# Request Timeouts
INIT_TIMEOUT=300000
REQUEST_TIMEOUT=60000

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/mcphub.log

# Python/NPM Package Sources
UV_DEFAULT_INDEX=https://pypi.org/simple
npm_config_registry=https://registry.npmjs.org/
```

### Configuration Files

#### mcp_settings.json
```json
{
  "mcpServers": {
    "server1": {
      "type": "stdio",
      "command": "python",
      "args": ["server.py"],
      "env": {
        "API_KEY": "${API_KEY}"
      },
      "enabled": true
    }
  },
  "groups": [
    {
      "id": "prod-group",
      "name": "Production",
      "servers": ["server1"]
    }
  ],
  "systemConfig": {
    "routing": {
      "enableGlobalRoute": false,
      "enableBearerAuth": true,
      "bearerAuthKey": "${BEARER_KEY}"
    },
    "smartRouting": {
      "enabled": true,
      "threshold": 0.7
    }
  }
}
```

## 🌐 Nginx Configuration

### Reverse Proxy Setup

```nginx
upstream mcphub {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name mcphub.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcphub.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Important for SSE
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;

    location / {
        proxy_pass http://mcphub;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE specific
        proxy_set_header Cache-Control 'no-cache';
        proxy_set_header X-Accel-Buffering 'no';
        proxy_read_timeout 86400;
    }

    # WebSocket support (future)
    location /ws {
        proxy_pass http://mcphub;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🗄️ Database Setup

### PostgreSQL with pgvector

```sql
-- init.sql
CREATE DATABASE mcphub;

\c mcphub;

-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE vector_embeddings (
    id SERIAL PRIMARY KEY,
    tool_name VARCHAR(255) NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    description TEXT,
    input_schema JSONB,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_embeddings_tool ON vector_embeddings(tool_name);
CREATE INDEX idx_embeddings_server ON vector_embeddings(server_name);
CREATE INDEX idx_embeddings_vector ON vector_embeddings 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Create audit log table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    username VARCHAR(255),
    action VARCHAR(255),
    resource VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN,
    details JSONB
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user ON audit_logs(username);
```

## 🚀 Production Deployment

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 14+ with pgvector extension

### Production Checklist

```bash
#!/bin/bash
# Production deployment script

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y nodejs npm postgresql nginx certbot

# 3. Install pgvector
sudo apt install -y postgresql-16-pgvector

# 4. Setup PostgreSQL
sudo -u postgres createdb mcphub
sudo -u postgres psql mcphub < init.sql

# 5. Setup application
git clone https://github.com/samanhappy/mcphub.git
cd mcphub
npm install -g pnpm
pnpm install
pnpm build

# 6. Setup systemd service
sudo cp mcphub.service /etc/systemd/system/
sudo systemctl enable mcphub
sudo systemctl start mcphub

# 7. Setup Nginx
sudo cp nginx.conf /etc/nginx/sites-available/mcphub
sudo ln -s /etc/nginx/sites-available/mcphub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 8. Setup SSL
sudo certbot --nginx -d mcphub.example.com

# 9. Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Systemd Service

```ini
# /etc/systemd/system/mcphub.service
[Unit]
Description=MCPHub Server
After=network.target postgresql.service

[Service]
Type=simple
User=mcphub
WorkingDirectory=/opt/mcphub
ExecStart=/usr/bin/node /opt/mcphub/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/mcphub/output.log
StandardError=append:/var/log/mcphub/error.log

Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/mcphub/.env

[Install]
WantedBy=multi-user.target
```

## 📊 Monitoring

### Health Check Endpoint

```bash
# Health check script
#!/bin/bash
curl -f http://localhost:3000/api/health || exit 1
```

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mcphub'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Logging Configuration

```javascript
// Logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## 🔒 Security Hardening

### Security Best Practices

1. **Use HTTPS**: Always use SSL/TLS in production
2. **Strong JWT Secret**: Use at least 32 characters
3. **Database Security**: Use strong passwords, restrict access
4. **Network Isolation**: Use Docker networks or VPCs
5. **Regular Updates**: Keep dependencies updated
6. **Rate Limiting**: Configure appropriate limits
7. **Input Validation**: Enable all validation middleware
8. **Audit Logging**: Monitor all admin actions

### Firewall Rules

```bash
# iptables rules
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 5432 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -j DROP
```

## 🔄 Backup & Recovery

### Backup Script

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backup/mcphub"
DATE=$(date +%Y%m%d)

# Backup configuration
cp /opt/mcphub/mcp_settings.json $BACKUP_DIR/config-$DATE.json
cp -r /opt/mcphub/data $BACKUP_DIR/data-$DATE/

# Backup database
pg_dump mcphub > $BACKUP_DIR/db-$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

### Recovery Procedure

```bash
# Restore from backup
systemctl stop mcphub

# Restore configuration
cp /backup/mcphub/config-20250106.json /opt/mcphub/mcp_settings.json

# Restore database
psql mcphub < /backup/mcphub/db-20250106.sql

# Restore data
cp -r /backup/mcphub/data-20250106/* /opt/mcphub/data/

systemctl start mcphub
```

## 🌍 Multi-Region Deployment

### Architecture
```mermaid
graph TB
    subgraph "Region 1"
        LB1[Load Balancer]
        APP1[MCPHub Instance]
        DB1[(PostgreSQL Primary)]
    end
    
    subgraph "Region 2"
        LB2[Load Balancer]
        APP2[MCPHub Instance]
        DB2[(PostgreSQL Replica)]
    end
    
    subgraph "Global"
        CDN[CDN]
        DNS[GeoDNS]
    end
    
    DNS --> LB1
    DNS --> LB2
    CDN --> LB1
    CDN --> LB2
    LB1 --> APP1
    LB2 --> APP2
    APP1 --> DB1
    APP2 --> DB2
    DB1 -.->|Replication| DB2
```

## 🚦 Scaling Strategies

### Horizontal Scaling
- Use load balancer for multiple instances
- Shared PostgreSQL database
- Redis for session storage
- Distributed file storage for configs

### Vertical Scaling
- Increase CPU/RAM as needed
- Optimize Node.js memory settings
- Tune PostgreSQL performance
- Use connection pooling

## 📚 Related Documentation

- [System Overview](01-system-overview.md) - Architecture overview
- [Backend Architecture](02-backend-architecture.md) - Server details
- [API Reference](10-api-reference.md) - API endpoints
- [Authentication](07-authentication.md) - Security setup

---

*End of Architecture Documentation*