from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional
from app.core.websocket_manager import websocket_manager
from app.services.auth_service import auth_service
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    project_id: Optional[str] = Query(None)
):
    """WebSocket endpoint for real-time collaboration"""
    
    # Authenticate user
    user = await auth_service.get_current_user(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    user_id = user["id"]
    
    try:
        # Connect user
        await websocket_manager.connect(websocket, user_id, project_id)
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "user_id": user_id,
            "project_id": project_id,
            "message": "Connected to real-time collaboration"
        }))
        
        # Listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                message_type = message.get("type")
                
                if message_type == "cursor_update":
                    await websocket_manager.broadcast_cursor_position(
                        project_id=project_id,
                        user_id=user_id,
                        cursor_data=message.get("cursor_data", {})
                    )
                
                elif message_type == "wireframe_update":
                    await websocket_manager.broadcast_wireframe_update(
                        project_id=project_id,
                        wireframe_data=message.get("wireframe_data", {}),
                        updated_by=user_id
                    )
                
                elif message_type == "join_project":
                    new_project_id = message.get("project_id")
                    if new_project_id:
                        await websocket_manager.join_project_room(user_id, new_project_id)
                
                elif message_type == "leave_project":
                    leave_project_id = message.get("project_id")
                    if leave_project_id:
                        await websocket_manager.leave_project_room(user_id, leave_project_id)
                
                elif message_type == "ping":
                    # Respond to ping to keep connection alive
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": message.get("timestamp")
                    }))
                
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from user {user_id}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            
            except Exception as e:
                logger.error(f"Error processing message from user {user_id}: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Error processing message"
                }))
    
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    
    finally:
        # Clean up connection
        await websocket_manager.disconnect(websocket)

@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    stats = await websocket_manager.get_connection_stats()
    return stats
