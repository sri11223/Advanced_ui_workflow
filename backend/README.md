# Advanced UI Workflow Backend

Enterprise-grade backend for AI-powered wireframe generation with real-time collaboration.

## 🚀 Quick Start

```bash
# 1. Install dependencies
python -m pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Run health check
python health_check.py

# 4. Start server
python main.py
# OR
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/           # API route handlers
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── projects.py       # Project management
│   │   ├── wireframes.py     # Wireframe operations
│   │   ├── conversations.py  # AI conversations
│   │   ├── ui_components.py  # Component library
│   │   ├── websockets.py     # Real-time WebSocket
│   │   └── health.py         # Health monitoring
│   ├── core/          # Core infrastructure
│   │   ├── config.py         # Configuration management
│   │   ├── database.py       # Database connections
│   │   ├── redis_client.py   # Redis caching client
│   │   └── websocket_manager.py # WebSocket management
│   ├── models/        # Database models
│   │   ├── user.py           # User data models
│   │   ├── project.py        # Project models
│   │   ├── wireframe.py      # Wireframe models
│   │   └── conversation.py   # Conversation models
│   └── services/      # Business logic services
│       ├── auth_service.py      # Authentication logic
│       ├── project_service.py   # Project management
│       ├── wireframe_service.py # Wireframe operations
│       ├── conversation_service.py # AI conversations
│       ├── ui_component_service.py # Component library
│       ├── ai_service.py        # AI integration
│       └── cache_service.py     # Multi-layer caching
├── scripts/
│   └── setup.py       # Setup automation
├── .env               # Environment variables
├── main.py           # FastAPI application
├── health_check.py   # System health validation
├── start_server.py   # Alternative server starter
├── requirements.txt  # Python dependencies
└── create_supabase_tables.sql # Database schema
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External Services
REDIS_URL=redis://localhost:6379
HUGGINGFACE_API_TOKEN=your-huggingface-token

# API Configuration
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
```

## 🏗️ Architecture

### 6-Phase Enterprise Architecture

1. **Foundation Layer**
   - FastAPI with async support
   - Pydantic models for data validation
   - Environment-based configuration

2. **Core Services Layer**
   - Authentication with JWT
   - Project & wireframe management
   - Conversation handling
   - UI component library

3. **AI Integration Layer**
   - HuggingFace API integration
   - Circuit breaker pattern
   - Request queue management
   - Intelligent caching of AI responses

4. **Caching & Performance Layer**
   - Multi-layer caching (Redis + Memory)
   - Connection pooling
   - Async operations throughout

5. **Real-time Collaboration Layer**
   - WebSocket connection management
   - Project-based rooms
   - Real-time wireframe updates
   - Offline message queuing

6. **API Routes Layer**
   - RESTful API design
   - Comprehensive error handling
   - Health monitoring & metrics
   - API documentation with OpenAPI

### Key Design Patterns

- **Repository Pattern**: Clean data access abstraction
- **Service Layer Pattern**: Business logic separation
- **Circuit Breaker**: AI service reliability
- **Observer Pattern**: Real-time event broadcasting
- **Factory Pattern**: Service instantiation

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt
- **CORS Protection**: Configurable origins
- **Input Validation**: Pydantic model validation
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: Built-in request throttling

## 📊 Performance Features

### Multi-Layer Caching
- **Redis Primary**: Distributed caching
- **Memory Fallback**: In-process backup
- **Smart TTL**: Category-based expiration
- **Cache Invalidation**: Automatic cleanup

### Database Optimization
- **Connection Pooling**: Efficient DB connections
- **Async Operations**: Non-blocking I/O
- **Query Optimization**: Indexed operations
- **Batch Processing**: Bulk operations support

## 🤖 AI Integration

### HuggingFace Services
- **Wireframe Generation**: AI-powered layout creation
- **Component Suggestions**: Smart UI recommendations
- **Intent Analysis**: User requirement understanding
- **Code Export**: Automated code generation

### Reliability Features
- **Circuit Breaker**: Prevents cascade failures
- **Request Queue**: Manages API rate limits
- **Fallback Responses**: Graceful degradation
- **Response Caching**: Avoids duplicate API calls

## 🔄 Real-time Features

### WebSocket Capabilities
- **Project Rooms**: Isolated collaboration spaces
- **Live Cursors**: Real-time user positions
- **Instant Updates**: Immediate wireframe sync
- **Offline Support**: Message queuing for disconnected users

### Event Broadcasting
- **Wireframe Changes**: Live design updates
- **User Presence**: Online/offline status
- **Chat Messages**: Team communication
- **System Notifications**: Status updates

## 📈 Monitoring & Health

### Health Endpoints
- `GET /api/v1/health` - System status
- `GET /api/v1/health/detailed` - Component status
- `GET /api/v1/metrics` - Performance metrics

### Logging
- **Structured Logging**: JSON format
- **Log Levels**: DEBUG, INFO, WARNING, ERROR
- **Request Tracing**: Full request lifecycle
- **Error Tracking**: Comprehensive error capture

## 🚀 Deployment

### Development
```bash
python main.py
# Server runs on http://localhost:8000
```

### Production
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Optional)
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Current user info
- `POST /api/v1/auth/logout` - User logout

#### Projects
- `GET /api/v1/projects` - List user projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

#### Wireframes
- `GET /api/v1/wireframes` - List wireframes
- `POST /api/v1/wireframes` - Create wireframe
- `GET /api/v1/wireframes/{id}` - Get wireframe
- `PUT /api/v1/wireframes/{id}` - Update wireframe
- `GET /api/v1/wireframes/{id}/export` - Export wireframe

#### Real-time
- `WS /ws` - WebSocket connection for real-time features

## 🛠️ Development

### Running Tests
```bash
python health_check.py
```

### Code Quality
- **Type Hints**: Full Python typing
- **Async/Await**: Modern async patterns
- **Error Handling**: Comprehensive exception management
- **Documentation**: Inline code documentation

### Adding New Features
1. Create models in `app/models/`
2. Implement services in `app/services/`
3. Add API routes in `app/api/`
4. Update health checks if needed

## 🔧 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check Supabase credentials in .env
# Verify network connectivity
python -c "from app.core.database import test_connection; import asyncio; print(asyncio.run(test_connection()))"
```

**Redis Not Available**
```bash
# System automatically falls back to memory cache
# To enable Redis: install Redis server or use cloud Redis
```

**Import Errors**
```bash
# Install missing dependencies
pip install -r requirements.txt
```

### Performance Optimization
- Enable Redis for better caching
- Use connection pooling for high load
- Monitor memory usage with large datasets
- Configure appropriate TTL values

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📞 Support

For issues and questions:
- Check health endpoint: `/api/v1/health`
- Review logs for error details
- Verify environment configuration
- Test individual components with health_check.py
