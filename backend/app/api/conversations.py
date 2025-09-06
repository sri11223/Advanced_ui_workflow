from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.conversation_service import conversation_service
from app.services.ai_service import ai_service
from app.core.websocket_manager import websocket_manager
from app.api.auth import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])

class ConversationCreate(BaseModel):
    project_id: str
    title: Optional[str] = None

class MessageCreate(BaseModel):
    content: str
    message_type: str = "user"  # user, ai, system

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    project_id: str
    title: str
    messages: List[Dict[str, Any]]
    context: Dict[str, Any]
    status: str
    created_at: str
    updated_at: str

@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new conversation"""
    try:
        conversation = await conversation_service.create_conversation(
            user_id=current_user["id"],
            project_id=conversation_data.project_id,
            title=conversation_data.title
        )
        
        return ConversationResponse(**conversation)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[ConversationResponse])
async def get_user_conversations(
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get conversations for the current user"""
    conversations = await conversation_service.get_user_conversations(
        user_id=current_user["id"],
        project_id=project_id
    )
    
    return [ConversationResponse(**conv) for conv in conversations]

@router.post("/{conversation_id}/messages")
async def add_message(
    conversation_id: str,
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a message to conversation and get AI response"""
    # Add user message
    user_message = {
        "content": message_data.content,
        "type": message_data.message_type,
        "user_id": current_user["id"]
    }
    
    success = await conversation_service.add_message(conversation_id, user_message)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Generate AI response if user message
    if message_data.message_type == "user":
        # Analyze user intent
        intent_analysis = await ai_service.analyze_user_intent(
            message=message_data.content,
            context={"conversation_id": conversation_id}
        )
        
        # Generate AI response based on intent
        if intent_analysis["intent"] == "create":
            ai_response = await ai_service.generate_wireframe_suggestions(
                description=message_data.content
            )
            response_content = f"I can help you create that! Here are some wireframe suggestions: {ai_response}"
        else:
            response_content = "I understand your request. How can I help you with your wireframe design?"
        
        # Add AI response message
        ai_message = {
            "content": response_content,
            "type": "ai",
            "intent_analysis": intent_analysis
        }
        
        await conversation_service.add_message(conversation_id, ai_message)
        
        # Broadcast AI response via WebSocket
        await websocket_manager.broadcast_ai_response(
            current_user["id"],
            {"message": ai_message, "conversation_id": conversation_id}
        )
    
    return {"message": "Message added successfully"}

@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get conversation message history"""
    messages = await conversation_service.get_conversation_history(conversation_id)
    if messages is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"messages": messages}

@router.put("/{conversation_id}/context")
async def update_conversation_context(
    conversation_id: str,
    context_updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Update conversation context"""
    success = await conversation_service.update_context(conversation_id, context_updates)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"message": "Context updated successfully"}

@router.post("/{conversation_id}/briefs")
async def create_context_brief(
    conversation_id: str,
    brief_type: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Create a context brief for AI memory"""
    brief = await conversation_service.create_context_brief(
        conversation_id=conversation_id,
        brief_type=brief_type,
        content=content,
        metadata=metadata or {}
    )
    
    return {"brief": brief}

@router.get("/{conversation_id}/briefs")
async def get_context_briefs(
    conversation_id: str,
    brief_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get context briefs for a conversation"""
    briefs = await conversation_service.get_context_briefs(
        conversation_id=conversation_id,
        brief_type=brief_type
    )
    
    return {"briefs": briefs}
