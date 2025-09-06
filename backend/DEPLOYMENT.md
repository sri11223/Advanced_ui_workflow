# Deployment Guide - Advanced UI Workflow Backend

## 🚀 Production Deployment

### Prerequisites
- Python 3.12+
- Supabase account with database
- Redis instance (optional, has memory fallback)
- HuggingFace API token

### Environment Setup

1. **Clone and Setup**
```bash
git clone <repository>
cd backend
python -m pip install -r requirements.txt
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your production values
```

3. **Database Setup**
```bash
# Run the SQL script in your Supabase dashboard
# File: create_supabase_tables.sql
```

4. **Health Check**
```bash
python health_check.py
```

### Production Server

**Option 1: Uvicorn (Recommended)**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Option 2: Gunicorn + Uvicorn**
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker Deployment

**Dockerfile**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD python health_check.py || exit 1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Docker Compose**
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SECRET_KEY=${SECRET_KEY}
      - REDIS_URL=${REDIS_URL}
      - HUGGINGFACE_API_TOKEN=${HUGGINGFACE_API_TOKEN}
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

### Cloud Deployment

**Heroku**
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set DATABASE_URL=your-supabase-url
heroku config:set SUPABASE_URL=your-supabase-url
# Set other environment variables
git push heroku main
```

**Railway**
```bash
# Install Railway CLI
railway login
railway init
railway add
# Set environment variables in Railway dashboard
railway deploy
```

**Render**
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Environment Variables

**Required**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `SECRET_KEY`: JWT secret key

**Optional**
- `REDIS_URL`: Redis connection string (defaults to memory cache)
- `HUGGINGFACE_API_TOKEN`: For AI features
- `CORS_ORIGINS`: Allowed frontend origins

### Monitoring

**Health Endpoints**
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed system status
- `GET /api/v1/metrics` - Performance metrics

**Logging**
```python
# Configure logging level
LOGGING_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
```

### Security Checklist

- [ ] Change default SECRET_KEY
- [ ] Use HTTPS in production
- [ ] Configure CORS_ORIGINS properly
- [ ] Secure Redis connection
- [ ] Enable Supabase RLS policies
- [ ] Set up API rate limiting
- [ ] Monitor for security vulnerabilities

### Performance Optimization

**Redis Configuration**
```bash
# For high-performance Redis
redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**Database Optimization**
- Enable connection pooling
- Use read replicas for scaling
- Optimize query indexes

**Caching Strategy**
- User data: 30 minutes TTL
- Project data: 1 hour TTL
- AI responses: 24 hours TTL
- Static data: 7 days TTL

### Troubleshooting

**Common Issues**

1. **Database Connection Failed**
```bash
# Check Supabase status
curl -I https://your-project.supabase.co/rest/v1/

# Test connection
python -c "from app.core.database import test_connection; import asyncio; print(asyncio.run(test_connection()))"
```

2. **Redis Connection Issues**
```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
redis-cli monitor
```

3. **High Memory Usage**
```bash
# Monitor memory cache
# Adjust max_memory_items in cache_service.py
```

4. **Slow API Response**
```bash
# Enable Redis for better caching
# Check database query performance
# Monitor AI service response times
```

### Scaling

**Horizontal Scaling**
- Use load balancer (nginx, HAProxy)
- Deploy multiple backend instances
- Share Redis instance across instances
- Use database connection pooling

**Vertical Scaling**
- Increase server resources
- Optimize database queries
- Use Redis for heavy caching
- Enable CDN for static assets

### Backup Strategy

**Database Backup**
- Supabase automatic backups
- Manual exports via dashboard
- Point-in-time recovery

**Configuration Backup**
- Version control .env.example
- Document environment variables
- Backup deployment scripts

### Maintenance

**Regular Tasks**
- Monitor health endpoints
- Check error logs
- Update dependencies
- Review security patches
- Optimize database performance

**Updates**
```bash
# Update dependencies
pip install -r requirements.txt --upgrade

# Run health check
python health_check.py

# Deploy with zero downtime
# Use blue-green deployment strategy
```
