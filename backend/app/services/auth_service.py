from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.core.database import db
from app.core.config import settings
import uuid

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """Enterprise authentication service with JWT and session management"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
    
    def hash_password(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None
    
    async def register_user(self, email: str, password: str, full_name: str) -> Dict[str, Any]:
        """Register a new user"""
        # Check if user exists
        existing_user = await db.get_user_by_email(email)
        if existing_user:
            raise ValueError("User already exists")
        
        # Create user
        user_data = {
            "email": email,
            "hashed_password": self.hash_password(password),
            "full_name": full_name,
            "is_active": True,
            "is_verified": False
        }
        
        user = await db.create_user(user_data)
        if not user:
            raise ValueError("Failed to create user")
        
        # Create access token
        access_token = self.create_access_token({"sub": user["email"], "user_id": user["id"]})
        
        # Session management handled by JWT tokens
        # No need for separate session table in this implementation
        
        return {
            "user": user,
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        user = await db.get_user_by_email(email)
        if not user:
            return None
        
        if not self.verify_password(password, user["hashed_password"]):
            return None
        
        # Create access token
        access_token = self.create_access_token({"sub": user["email"], "user_id": user["id"]})
        
        return {
            "user": user,
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    async def get_current_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Get current user from token"""
        payload = self.verify_token(token)
        if not payload:
            return None
        
        user_id = payload.get("user_id")
        if not user_id:
            return None
        
        user = await db.get_user_by_id(user_id)
        return user

# Global auth service instance
auth_service = AuthService()
