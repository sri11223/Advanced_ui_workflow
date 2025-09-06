from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Enterprise WebSocket connection manager for real-time collaboration"""
    
    def __init__(self):
        # Active connections by user
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        
        # Project rooms for collaboration
        self.project_rooms: Dict[str, Set[str]] = {}  # project_id -> set of user_ids
        
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
        # Message queue for offline users
        self.offline_messages: Dict[str, List[Dict[str, Any]]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, project_id: str = None):
        """Accept WebSocket connection and register user"""
        await websocket.accept()
        
        # Add to active connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        # Store connection metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "project_id": project_id,
            "connected_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }
        
        # Join project room if specified
        if project_id:
            await self.join_project_room(user_id, project_id)
        
        # Send offline messages if any
        await self.send_offline_messages(user_id)
        
        logger.info(f"User {user_id} connected to WebSocket")
    
    async def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        if websocket in self.connection_metadata:
            metadata = self.connection_metadata[websocket]
            user_id = metadata["user_id"]
            project_id = metadata.get("project_id")
            
            # Remove from active connections
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Leave project room
            if project_id:
                await self.leave_project_room(user_id, project_id)
            
            # Clean up metadata
            del self.connection_metadata[websocket]
            
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def join_project_room(self, user_id: str, project_id: str):
        """Join a project room for collaboration"""
        if project_id not in self.project_rooms:
            self.project_rooms[project_id] = set()
        
        self.project_rooms[project_id].add(user_id)
        
        # Notify other users in the room
        await self.broadcast_to_project(project_id, {
            "type": "user_joined",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }, exclude_user=user_id)
    
    async def leave_project_room(self, user_id: str, project_id: str):
        """Leave a project room"""
        if project_id in self.project_rooms:
            self.project_rooms[project_id].discard(user_id)
            
            # Clean up empty rooms
            if not self.project_rooms[project_id]:
                del self.project_rooms[project_id]
            else:
                # Notify other users
                await self.broadcast_to_project(project_id, {
                    "type": "user_left",
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                }, exclude_user=user_id)
    
    async def send_personal_message(self, user_id: str, message: Dict[str, Any]):
        """Send message to specific user"""
        if user_id in self.active_connections:
            # Send to all user's connections
            disconnected = set()
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                    
                    # Update last activity
                    if websocket in self.connection_metadata:
                        self.connection_metadata[websocket]["last_activity"] = datetime.utcnow()
                        
                except Exception as e:
                    logger.error(f"Error sending message to {user_id}: {e}")
                    disconnected.add(websocket)
            
            # Clean up disconnected websockets
            for websocket in disconnected:
                await self.disconnect(websocket)
        else:
            # Store message for offline user
            await self.store_offline_message(user_id, message)
    
    async def broadcast_to_project(self, project_id: str, message: Dict[str, Any], exclude_user: str = None):
        """Broadcast message to all users in a project room"""
        if project_id not in self.project_rooms:
            return
        
        for user_id in self.project_rooms[project_id]:
            if exclude_user and user_id == exclude_user:
                continue
            
            await self.send_personal_message(user_id, message)
    
    async def broadcast_wireframe_update(self, project_id: str, wireframe_data: Dict[str, Any], updated_by: str):
        """Broadcast wireframe updates to project collaborators"""
        message = {
            "type": "wireframe_update",
            "project_id": project_id,
            "wireframe_data": wireframe_data,
            "updated_by": updated_by,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_to_project(project_id, message, exclude_user=updated_by)
    
    async def broadcast_cursor_position(self, project_id: str, user_id: str, cursor_data: Dict[str, Any]):
        """Broadcast cursor position for real-time collaboration"""
        message = {
            "type": "cursor_update",
            "project_id": project_id,
            "user_id": user_id,
            "cursor_data": cursor_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_to_project(project_id, message, exclude_user=user_id)
    
    async def broadcast_ai_response(self, user_id: str, ai_response: Dict[str, Any]):
        """Broadcast AI response to user"""
        message = {
            "type": "ai_response",
            "response": ai_response,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.send_personal_message(user_id, message)
    
    async def store_offline_message(self, user_id: str, message: Dict[str, Any]):
        """Store message for offline user"""
        if user_id not in self.offline_messages:
            self.offline_messages[user_id] = []
        
        message["stored_at"] = datetime.utcnow().isoformat()
        self.offline_messages[user_id].append(message)
        
        # Limit offline messages (keep last 50)
        if len(self.offline_messages[user_id]) > 50:
            self.offline_messages[user_id] = self.offline_messages[user_id][-50:]
    
    async def send_offline_messages(self, user_id: str):
        """Send stored offline messages to user"""
        if user_id in self.offline_messages:
            messages = self.offline_messages[user_id]
            
            for message in messages:
                await self.send_personal_message(user_id, {
                    "type": "offline_message",
                    "original_message": message
                })
            
            # Clear offline messages
            del self.offline_messages[user_id]
    
    def get_project_users(self, project_id: str) -> List[str]:
        """Get list of users currently in project room"""
        return list(self.project_rooms.get(project_id, set()))
    
    def get_active_users(self) -> List[str]:
        """Get list of all active users"""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if user is currently online"""
        return user_id in self.active_connections
    
    async def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics"""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        
        return {
            "total_connections": total_connections,
            "active_users": len(self.active_connections),
            "project_rooms": len(self.project_rooms),
            "offline_message_queues": len(self.offline_messages),
            "users_per_project": {
                project_id: len(users) 
                for project_id, users in self.project_rooms.items()
            }
        }
    
    async def cleanup_stale_connections(self):
        """Clean up stale connections (run periodically)"""
        now = datetime.utcnow()
        stale_connections = []
        
        for websocket, metadata in self.connection_metadata.items():
            last_activity = metadata.get("last_activity", metadata["connected_at"])
            if (now - last_activity).total_seconds() > 300:  # 5 minutes
                stale_connections.append(websocket)
        
        for websocket in stale_connections:
            await self.disconnect(websocket)
        
        logger.info(f"Cleaned up {len(stale_connections)} stale connections")

# Global WebSocket manager instance
websocket_manager = ConnectionManager()
