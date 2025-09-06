from typing import Optional, List, Dict, Any
from app.core.database import db
import uuid
import asyncio
from datetime import datetime

class ProjectService:
    """Enterprise project management service with CRUD operations"""
    
    async def create_project(self, user_id: str, name: str, description: str = None, project_type: str = "web") -> Dict[str, Any]:
        """Create a new project"""
        project_data = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "project_type": project_type,
            "settings": {
                "theme": "modern",
                "responsive": True,
                "framework": "react"
            },
            "is_active": True
        }
        
        project = await db.create_project(project_data)
        if not project:
            raise ValueError("Failed to create project")
        
        return project
    
    async def get_user_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all projects for a user"""
        return await db.get_user_projects(user_id)
    
    async def get_project_by_id(self, project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get project by ID with user validation"""
        project = await db.get_project_by_id(project_id)
        
        # Validate user owns the project
        if not project or project["user_id"] != user_id:
            return None
        
        return project
    
    async def update_project(self, project_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update project settings"""
        # First verify ownership
        project = await self.get_project_by_id(project_id, user_id)
        if not project:
            return None
        
        # Update project
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("projects").update(updates).eq("id", project_id).execute()
        )
        
        return result.data[0] if result.data else None
    
    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """Soft delete project (mark as inactive)"""
        project = await self.get_project_by_id(project_id, user_id)
        if not project:
            return False
        
        # Soft delete by marking inactive
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("projects").update({"is_active": False}).eq("id", project_id).execute()
        )
        
        return len(result.data) > 0

# Global project service instance
project_service = ProjectService()
