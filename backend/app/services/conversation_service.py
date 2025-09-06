from typing import Optional, List, Dict, Any
from app.core.database import db
import asyncio
import json
from datetime import datetime

class ConversationService:
    """Enterprise conversation management service for AI interactions"""
    
    async def create_conversation(self, user_id: str, project_id: str, title: str = None) -> Dict[str, Any]:
        """Create a new conversation"""
        conversation_data = {
            "user_id": user_id,
            "project_id": project_id,
            "title": title or "New Conversation",
            "messages": [],
            "context": {
                "project_context": {},
                "user_preferences": {},
                "conversation_history": []
            },
            "status": "active"
        }
        
        conversation = await db.create_conversation(conversation_data)
        if not conversation:
            raise ValueError("Failed to create conversation")
        
        return conversation
    
    async def add_message(self, conversation_id: str, message: Dict[str, Any]) -> bool:
        """Add a message to conversation"""
        conversation = await db.get_conversation_by_id(conversation_id)
        if not conversation:
            return False
        
        # Add timestamp and ID to message
        message["timestamp"] = datetime.utcnow().isoformat()
        message["id"] = len(conversation["messages"]) + 1
        
        # Update messages
        messages = conversation["messages"] + [message]
        return await db.update_conversation_messages(conversation_id, messages)
    
    async def get_conversation_history(self, conversation_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get conversation message history"""
        conversation = await db.get_conversation_by_id(conversation_id)
        if not conversation:
            return None
        
        return conversation["messages"]
    
    async def update_context(self, conversation_id: str, context_updates: Dict[str, Any]) -> bool:
        """Update conversation context"""
        conversation = await db.get_conversation_by_id(conversation_id)
        if not conversation:
            return False
        
        # Merge context
        current_context = conversation.get("context", {})
        updated_context = {**current_context, **context_updates}
        
        # Update in database
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("conversations").update({"context": updated_context}).eq("id", conversation_id).execute()
        )
        
        return len(result.data) > 0
    
    async def create_context_brief(self, conversation_id: str, brief_type: str, content: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create a context brief for AI memory"""
        brief_data = {
            "conversation_id": conversation_id,
            "brief_type": brief_type,
            "content": content,
            "metadata": metadata or {}
        }
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("context_briefs").insert(brief_data).execute()
        )
        
        return result.data[0] if result.data else None
    
    async def get_context_briefs(self, conversation_id: str, brief_type: str = None) -> List[Dict[str, Any]]:
        """Get context briefs for a conversation"""
        loop = asyncio.get_event_loop()
        
        if brief_type:
            result = await loop.run_in_executor(
                None,
                lambda: db.client.table("context_briefs").select("*").eq("conversation_id", conversation_id).eq("brief_type", brief_type).execute()
            )
        else:
            result = await loop.run_in_executor(
                None,
                lambda: db.client.table("context_briefs").select("*").eq("conversation_id", conversation_id).execute()
            )
        
        return result.data or []
    
    async def get_user_conversations(self, user_id: str, project_id: str = None) -> List[Dict[str, Any]]:
        """Get conversations for a user, optionally filtered by project"""
        loop = asyncio.get_event_loop()
        
        if project_id:
            result = await loop.run_in_executor(
                None,
                lambda: db.client.table("conversations").select("*").eq("user_id", user_id).eq("project_id", project_id).eq("status", "active").execute()
            )
        else:
            result = await loop.run_in_executor(
                None,
                lambda: db.client.table("conversations").select("*").eq("user_id", user_id).eq("status", "active").execute()
            )
        
        return result.data or []

# Global conversation service instance
conversation_service = ConversationService()
