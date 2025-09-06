"""Logging and monitoring middleware"""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import json
from typing import Dict, Any

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests with performance metrics"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        logger.info(f"Request: {request.method} {request.url.path}")
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log response with metrics
        log_data = {
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time": round(process_time, 4),
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent", ""),
            "request_id": getattr(request.state, "request_id", "unknown")
        }
        
        if process_time > 1.0:  # Slow request warning
            logger.warning(f"Slow request detected: {json.dumps(log_data)}")
        else:
            logger.info(f"Response: {json.dumps(log_data)}")
        
        # Add performance header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """Enhanced error logging and monitoring"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            # Log detailed error information
            error_data = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host,
                "request_id": getattr(request.state, "request_id", "unknown")
            }
            
            logger.error(f"Unhandled error: {json.dumps(error_data)}")
            
            # Re-raise the exception
            raise e
