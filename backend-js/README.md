# Advanced UI Workflow - Node.js Backend

A robust Node.js/Express backend for the Advanced UI Workflow application, featuring enterprise-grade architecture with TypeScript, real-time collaboration, AI integration, and comprehensive security.

## Features

- **Enterprise Architecture**: TypeScript, Express.js, modular design
- **Database**: Supabase integration with comprehensive schema
- **Caching**: Redis with in-memory fallback
- **Real-time Collaboration**: Socket.io WebSocket implementation
- **AI Integration**: RAG model hooks and external AI service support
- **Security**: JWT authentication, rate limiting, input sanitization
- **Monitoring**: Health checks, metrics, structured logging
- **Code Generation**: Multi-platform export (HTML, React, Vue, Angular, Flutter)

## Quick Start

### Prerequisites

- Node.js 18+ 
- Redis (optional, will fallback to memory cache)
- Supabase account and project

### Installation

1. **Clone and navigate to backend-js directory**
   ```bash
   cd backend-js
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Redis (optional)
   REDIS_URL=redis://localhost:6379
   
   # JWT
   JWT_SECRET=your_super_secure_jwt_secret
   JWT_EXPIRES_IN=24h
   
   # AI Services
   OPENAI_API_KEY=your_openai_key
   HUGGINGFACE_API_KEY=your_huggingface_key
   
   # Server
   PORT=8000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/stats` - Project statistics
- `POST /api/projects/:id/duplicate` - Duplicate project
- `POST /api/projects/:id/collaboration/enable` - Enable collaboration
- `POST /api/projects/:id/collaboration/disable` - Disable collaboration

### Wireframes
- `POST /api/wireframes` - Create wireframe
- `GET /api/wireframes/project/:projectId` - Get project wireframes
- `GET /api/wireframes/:id` - Get wireframe details
- `PUT /api/wireframes/:id` - Update wireframe
- `DELETE /api/wireframes/:id` - Delete wireframe
- `GET /api/wireframes/:id/versions` - Get wireframe versions
- `POST /api/wireframes/:id/export` - Generate code export

### Conversations (AI Chat)
- `POST /api/conversations` - Send message to AI
- `GET /api/conversations/project/:projectId` - Get project conversations
- `GET /api/conversations/:id` - Get conversation details
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/conversations/project/:projectId/context` - Get AI context
- `POST /api/conversations/:id/regenerate` - Regenerate AI response

### UI Components
- `POST /api/components/generate` - Generate AI components
- `POST /api/components` - Create component
- `GET /api/components` - List components
- `GET /api/components/:id` - Get component details
- `PUT /api/components/:id` - Update component
- `DELETE /api/components/:id` - Delete component
- `GET /api/components/meta/categories` - Get categories
- `GET /api/components/meta/popular` - Get popular components
- `POST /api/components/:id/clone` - Clone component

### Exports
- `POST /api/exports` - Create export
- `GET /api/exports` - List user exports
- `GET /api/exports/:id` - Get export details
- `GET /api/exports/:id/download` - Download export
- `POST /api/exports/:id/share` - Share export
- `DELETE /api/exports/:id` - Delete export
- `GET /api/exports/:id/status` - Get export status

### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe
- `GET /ping` - Simple ping

## Real-time Collaboration

WebSocket events for real-time collaboration:

### Client Events (Send to Server)
- `join_project` - Join project room
- `leave_project` - Leave project room
- `wireframe_update` - Update wireframe
- `cursor_position` - Share cursor position
- `selection_change` - Share selection
- `component_drag` - Share drag state
- `chat_message` - Send chat message
- `typing_start/stop` - Typing indicators

### Server Events (Receive from Server)
- `connected` - Connection confirmation
- `project_joined` - Successfully joined project
- `user_joined/left` - User presence updates
- `wireframe_updated` - Wireframe changes
- `cursor_moved` - Cursor position updates
- `selection_changed` - Selection updates
- `component_dragged` - Drag state updates
- `chat_message` - New chat messages
- `user_typing` - Typing indicators

## Architecture

### Directory Structure
```
src/
├── app.ts              # Express app setup
├── server.ts           # Server entry point
├── config/
│   ├── index.ts        # Configuration loader
│   └── database.ts     # Database client
├── middleware/
│   ├── auth.ts         # Authentication middleware
│   └── security.ts     # Security middleware
├── routes/
│   ├── auth.ts         # Authentication routes
│   ├── projects.ts     # Project routes
│   ├── wireframes.ts   # Wireframe routes
│   ├── conversations.ts # AI conversation routes
│   ├── components.ts   # UI component routes
│   ├── exports.ts      # Export routes
│   └── health.ts       # Health check routes
├── services/
│   ├── authService.ts  # Authentication service
│   ├── projectService.ts # Project service
│   ├── aiService.ts    # AI service with RAG integration
│   └── websocketService.ts # WebSocket service
├── utils/
│   ├── logger.ts       # Structured logging
│   ├── cache.ts        # Multi-layer caching
│   └── circuitBreaker.ts # Circuit breaker pattern
└── types/
    └── index.ts        # TypeScript type definitions
```

### Key Components

1. **Database Layer**: Supabase client with generic CRUD operations
2. **Caching Layer**: Redis primary with in-memory fallback
3. **Authentication**: JWT-based with bcrypt password hashing
4. **AI Integration**: RAG model hooks with external API fallbacks
5. **Real-time**: Socket.io for collaborative features
6. **Security**: Comprehensive middleware stack
7. **Monitoring**: Health checks and structured logging

## RAG Model Integration

The AI service is designed to integrate with your JavaScript RAG model:

```typescript
// In aiService.ts - Replace with your RAG model
async function callRAGModel(prompt: string, context: any): Promise<any> {
  // Your RAG model integration here
  return await yourRAGModel.generate(prompt, context);
}
```

## Development

### Scripts
- `npm run dev` - Development with hot reload
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests (when added)

### Environment Variables
See `.env.example` for all configuration options.

### Database Schema
The backend uses a comprehensive 7-layer Supabase schema:
1. User Identity & Authentication
2. AI Personalization & Learning
3. Project Management
4. Conversational AI
5. Wireframe Generation
6. Component System
7. Export Engine

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=8000
   # ... other production vars
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Process Management** (recommended)
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start dist/server.js --name "ui-workflow-api"
   ```

## Security Features

- JWT authentication with secure token handling
- Rate limiting (1000 requests per 15 minutes)
- Input sanitization and validation
- Security headers (Helmet.js)
- CORS configuration
- Request size limiting
- SQL injection prevention
- XSS protection

## Monitoring & Health Checks

- `/api/health` - Basic health status
- `/api/health/detailed` - Comprehensive system metrics
- `/api/health/ready` - Kubernetes readiness probe
- `/api/health/live` - Kubernetes liveness probe
- Structured logging with request tracing
- Performance metrics collection

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include input validation
4. Write comprehensive tests
5. Update documentation

## License

MIT License - See LICENSE file for details.
