"""Input validation utilities for enterprise security"""
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, validator
from fastapi import HTTPException

class InputSanitizer:
    """Sanitize and validate user inputs"""
    
    # Common injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
        r"(--|#|/\*|\*/)",
        r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>.*?</iframe>",
    ]
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            raise ValueError("Input must be a string")
        
        # Length check
        if len(value) > max_length:
            raise ValueError(f"Input too long (max {max_length} characters)")
        
        # Check for SQL injection
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValueError("Potentially malicious input detected")
        
        # Check for XSS
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValueError("Potentially malicious script detected")
        
        # Basic sanitization
        value = value.strip()
        value = re.sub(r'[<>"\']', '', value)  # Remove dangerous characters
        
        return value
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValueError("Invalid email format")
        return email.lower()
    
    @classmethod
    def validate_uuid(cls, uuid_str: str) -> str:
        """Validate UUID format"""
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if not re.match(pattern, uuid_str, re.IGNORECASE):
            raise ValueError("Invalid UUID format")
        return uuid_str.lower()

class ProjectValidator(BaseModel):
    """Validate project creation/update data"""
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        return InputSanitizer.sanitize_string(v, max_length=255)
    
    @validator('description')
    def validate_description(cls, v):
        if v:
            return InputSanitizer.sanitize_string(v, max_length=2000)
        return v

class WireframeValidator(BaseModel):
    """Validate wireframe data"""
    screen_name: str
    screen_type: Optional[str] = None
    device_type: Optional[str] = None
    
    @validator('screen_name')
    def validate_screen_name(cls, v):
        return InputSanitizer.sanitize_string(v, max_length=255)

def validate_json_payload(payload: Dict[str, Any], max_depth: int = 5) -> Dict[str, Any]:
    """Validate JSON payload depth and content"""
    def check_depth(obj, current_depth=0):
        if current_depth > max_depth:
            raise ValueError("JSON payload too deeply nested")
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                if not isinstance(key, str) or len(key) > 100:
                    raise ValueError("Invalid JSON key")
                check_depth(value, current_depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                check_depth(item, current_depth + 1)
    
    check_depth(payload)
    return payload
