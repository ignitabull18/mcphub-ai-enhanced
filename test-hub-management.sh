#!/bin/bash

# Test the hub-management MCP server

echo "Testing MCPHub Management Server..."
echo "===================================="
echo ""

# Test listing servers via the hub-management MCP server
echo "1. Testing list_servers tool:"
curl -X POST http://localhost:3000/api/tools/call/@hub-management \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "list_servers",
    "arguments": {
      "includeDisabled": true
    }
  }' 2>/dev/null | jq .

echo ""
echo "2. Testing get_system_config tool:"
curl -X POST http://localhost:3000/api/tools/call/@hub-management \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_system_config",
    "arguments": {}
  }' 2>/dev/null | jq .

echo ""
echo "3. Testing get_system_health tool:"
curl -X POST http://localhost:3000/api/tools/call/@hub-management \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_system_health",
    "arguments": {}
  }' 2>/dev/null | jq .

echo ""
echo "===================================="
echo "Test complete!"