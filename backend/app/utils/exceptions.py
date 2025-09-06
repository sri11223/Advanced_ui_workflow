"""Custom exception classes for better error handling"""
from fastapi import HTTPException
from typing import Any, Dict, Optional

class BaseAPIException(HTTPException):
    """Base exception for API errors"""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = None,
        context: Dict[str, Any] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.context = context or {}

class ValidationError(BaseAPIException):
    """Input validation errors"""
    
    def __init__(self, detail: str, field: str = None):
        super().__init__(
            status_code=422,
            detail=detail,
            error_code="VALIDATION_ERROR",
            context={"field": field} if field else {}
        )

class AuthenticationError(BaseAPIException):
    """Authentication related errors"""
    
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(
            status_code=401,
            detail=detail,
            error_code="AUTHENTICATION_ERROR"
        )

class AuthorizationError(BaseAPIException):
    """Authorization related errors"""
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=403,
            detail=detail,
            error_code="AUTHORIZATION_ERROR"
        )

class ResourceNotFoundError(BaseAPIException):
    """Resource not found errors"""
    
    def __init__(self, resource: str, resource_id: str = None):
        detail = f"{resource} not found"
        if resource_id:
            detail += f" (ID: {resource_id})"
        
        super().__init__(
            status_code=404,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
            context={"resource": resource, "resource_id": resource_id}
        )

class RateLimitError(BaseAPIException):
    """Rate limiting errors"""
    
    def __init__(self, retry_after: int = None):
        super().__init__(
            status_code=429,
            detail="Rate limit exceeded",
            error_code="RATE_LIMIT_EXCEEDED",
            context={"retry_after": retry_after} if retry_after else {}
        )

class DatabaseError(BaseAPIException):
    """Database operation errors"""
    
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code="DATABASE_ERROR"
        )

class ExternalServiceError(BaseAPIException):
    """External service errors"""
    
    def __init__(self, service: str, detail: str = None):
        detail = detail or f"{service} service unavailable"
        super().__init__(
            status_code=503,
            detail=detail,
            error_code="EXTERNAL_SERVICE_ERROR",
            context={"service": service}
        )
