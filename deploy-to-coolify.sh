#!/bin/bash

# MCP-Nexus Coolify Deployment Script
# This script helps deploy the MCP-Hub variation as "mcp-nexus" on Coolify

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mcp-nexus"
PROJECT_NAME="mcp-hub"
DEFAULT_PORT=3000

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install git first."
        exit 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository. Please run this script from the project root."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to update package.json
update_package_json() {
    print_status "Updating package.json for mcp-nexus..."
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Create backup
    cp package.json package.json.backup
    
    # Update package.json using jq if available, otherwise use sed
    if command -v jq &> /dev/null; then
        jq '.name = "mcp-nexus" | .version = "1.0.0" | .description = "AI-Enhanced MCP Hub with intelligent group creation and vector-powered tool discovery"' package.json > package.json.tmp && mv package.json.tmp package.json
    else
        # Fallback to sed (basic replacement)
        sed -i.bak 's/"name": "[^"]*"/"name": "mcp-nexus"/' package.json
        sed -i.bak 's/"version": "[^"]*"/"version": "1.0.0"/' package.json
        sed -i.bak 's/"description": "[^"]*"/"description": "AI-Enhanced MCP Hub with intelligent group creation and vector-powered tool discovery"/' package.json
    fi
    
    print_success "package.json updated"
}

# Function to create environment file
create_env_file() {
    print_status "Creating .env.production file..."
    
    cat > .env.production << EOF
# MCP-Nexus Production Environment Variables
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secure-jwt-secret-here
SKIP_AUTH=false
BASE_PATH=
OPENAI_API_KEY=your-openai-api-key-here
POSTGRES_HOST=your-postgres-host-here
POSTGRES_PORT=5432
POSTGRES_DB=mcp_nexus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-postgres-password-here
REQUEST_TIMEOUT=60000
EOF
    
    print_success ".env.production created"
    print_warning "Please update the environment variables in .env.production with your actual values"
}

# Function to create Coolify configuration
create_coolify_config() {
    print_status "Creating Coolify configuration files..."
    
    # Create coolify.json configuration
    cat > coolify.json << EOF
{
  "name": "mcp-nexus",
  "description": "AI-Enhanced MCP Hub with intelligent group creation and vector-powered tool discovery",
  "repository": "your-git-repository-url",
  "branch": "main",
  "buildPack": "Dockerfile",
  "port": 3000,
  "environment": {
    "NODE_ENV": "production",
    "PORT": "3000",
    "JWT_SECRET": "your-secure-jwt-secret-here",
    "SKIP_AUTH": "false",
    "BASE_PATH": "",
    "OPENAI_API_KEY": "your-openai-api-key-here",
    "POSTGRES_HOST": "your-postgres-host-here",
    "POSTGRES_PORT": "5432",
    "POSTGRES_DB": "mcp_nexus",
    "POSTGRES_USER": "postgres",
    "POSTGRES_PASSWORD": "your-postgres-password-here",
    "REQUEST_TIMEOUT": "60000"
  },
  "healthCheck": {
    "path": "/health",
    "interval": 30,
    "timeout": 10,
    "retries": 3
  }
}
EOF
    
    print_success "Coolify configuration created"
}

# Function to display deployment instructions
show_deployment_instructions() {
    print_status "Deployment Instructions for Coolify:"
    echo ""
    echo "1. Log into your Coolify dashboard"
    echo "2. Navigate to 'Applications'"
    echo "3. Click 'Create Application'"
    echo "4. Fill in the following details:"
    echo "   - Project: Select your existing 'mcp-hub' project"
    echo "   - Server: Select your target server"
    echo "   - Environment: production"
    echo "   - Repository: Your Git repository URL"
    echo "   - Branch: main"
    echo "   - Build Pack: Dockerfile"
    echo "   - Ports: 3000"
    echo ""
    echo "5. Configure Environment Variables:"
    echo "   Add all the variables from .env.production"
    echo ""
    echo "6. Configure Domains (Optional):"
    echo "   - Domain: mcp-nexus.yourdomain.com"
    echo "   - SSL: Enable automatic SSL"
    echo ""
    echo "7. Click 'Deploy' to start the build process"
    echo ""
    echo "8. Monitor the build logs for any issues"
    echo ""
    echo "9. Once deployed, your application will be available at:"
    echo "   https://your-domain.com"
    echo ""
    echo "10. Initial setup:"
    echo "    - Access the dashboard"
    echo "    - Log in with default credentials: admin / admin123"
    echo "    - Change the default password immediately"
    echo "    - Configure your MCP servers"
    echo ""
    print_success "Deployment script completed successfully!"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up temporary files..."
    
    # Remove backup files
    if [ -f "package.json.backup" ]; then
        rm package.json.backup
    fi
    
    if [ -f "package.json.bak" ]; then
        rm package.json.bak
    fi
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    print_status "Starting MCP-Nexus Coolify deployment setup..."
    
    check_prerequisites
    update_package_json
    create_env_file
    create_coolify_config
    show_deployment_instructions
    cleanup
    
    print_success "Setup completed! Please follow the deployment instructions above."
}

# Run main function
main "$@"
