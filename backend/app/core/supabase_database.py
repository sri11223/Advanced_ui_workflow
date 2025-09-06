from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from .config import settings
import asyncio
from functools import wraps

class SupabaseDatabase:
    """Supabase database service with async wrapper"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY  # Use service role for backend operations
        )
    
    def async_wrapper(func):
        """Decorator to run sync supabase operations in async context"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, func, *args, **kwargs)
        return wrapper
    
    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: self.client.table("users").insert(user_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("users").select("*").eq("email", email).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("users").select("*").eq("id", user_id).execute()
        )
        return result.data[0] if result.data else None
    
    # Project operations
    async def create_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("projects").insert(project_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_user_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all projects for a user"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("projects").select("*").eq("user_id", user_id).eq("is_active", True).execute()
        )
        return result.data or []
    
    async def get_project_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("projects").select("*").eq("id", project_id).execute()
        )
        return result.data[0] if result.data else None
    
    # Conversation operations
    async def create_conversation(self, conversation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new conversation"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("conversations").insert(conversation_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_conversation_by_id(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("conversations").select("*").eq("id", conversation_id).execute()
        )
        return result.data[0] if result.data else None
    
    async def update_conversation_messages(self, conversation_id: str, messages: List[Dict[str, Any]]) -> bool:
        """Update conversation messages"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("conversations").update({"messages": messages}).eq("id", conversation_id).execute()
        )
        return len(result.data) > 0
    
    # Wireframe operations
    async def create_wireframe(self, wireframe_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new wireframe"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframes").insert(wireframe_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_project_wireframes(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all wireframes for a project"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframes").select("*").eq("project_id", project_id).execute()
        )
        return result.data or []
    
    async def get_wireframe_by_id(self, wireframe_id: str) -> Optional[Dict[str, Any]]:
        """Get wireframe by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframes").select("*").eq("id", wireframe_id).execute()
        )
        return result.data[0] if result.data else None
    
    # UI Components operations
    async def get_ui_components(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get UI components, optionally filtered by category"""
        loop = asyncio.get_event_loop()
        if category:
            result = await loop.run_in_executor(
                None,
                lambda: self.client.table("ui_components").select("*").eq("category", category).execute()
            )
        else:
            result = await loop.run_in_executor(
                None,
                lambda: self.client.table("ui_components").select("*").execute()
            )
        return result.data or []
    
    async def create_ui_component(self, component_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a custom UI component"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("ui_components").insert(component_data).execute()
        )
        return result.data[0] if result.data else None
    
    # Session operations
    async def create_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a user session"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("user_sessions").insert(session_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_session_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get session by token"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("user_sessions").select("*").eq("session_token", token).execute()
        )
        return result.data[0] if result.data else None
    
    async def delete_session(self, token: str) -> bool:
        """Delete a session"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("user_sessions").delete().eq("session_token", token).execute()
        )
        return len(result.data) > 0

# Global database instance
db = SupabaseDatabase()
