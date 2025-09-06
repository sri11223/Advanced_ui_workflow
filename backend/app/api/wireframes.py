from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.wireframe_service import wireframe_service
from app.services.cache_service import cache_service
from app.core.websocket_manager import websocket_manager
from app.api.auth import get_current_user

router = APIRouter(prefix="/wireframes", tags=["wireframes"])

class WireframeCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    wireframe_data: Dict[str, Any]
    conversation_id: Optional[str] = None

class WireframeUpdate(BaseModel):
    wireframe_data: Dict[str, Any]
    changes_summary: Optional[str] = None

class WireframeResponse(BaseModel):
    id: str
    project_id: str
    conversation_id: Optional[str]
    name: str
    description: Optional[str]
    wireframe_data: Dict[str, Any]
    version: int
    is_current: bool
    created_at: str
    updated_at: str

class WireframeExport(BaseModel):
    export_type: str  # html, react, figma

@router.post("/", response_model=WireframeResponse)
async def create_wireframe(
    wireframe_data: WireframeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new wireframe"""
    try:
        wireframe = await wireframe_service.create_wireframe(
            project_id=wireframe_data.project_id,
            name=wireframe_data.name,
            wireframe_data=wireframe_data.wireframe_data,
            conversation_id=wireframe_data.conversation_id,
            description=wireframe_data.description
        )
        
        # Cache wireframe data
        await cache_service.cache_wireframe_data(wireframe["id"], wireframe)
        
        # Broadcast to project collaborators
        await websocket_manager.broadcast_wireframe_update(
            wireframe_data.project_id,
            wireframe["wireframe_data"],
            current_user["id"]
        )
        
        return WireframeResponse(**wireframe)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/project/{project_id}", response_model=List[WireframeResponse])
async def get_project_wireframes(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all wireframes for a project"""
    wireframes = await wireframe_service.get_project_wireframes(project_id)
    
    # Cache each wireframe
    for wireframe in wireframes:
        await cache_service.cache_wireframe_data(wireframe["id"], wireframe)
    
    return [WireframeResponse(**wireframe) for wireframe in wireframes]

@router.get("/{wireframe_id}", response_model=WireframeResponse)
async def get_wireframe(
    wireframe_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific wireframe"""
    # Check cache first
    cached_wireframe = await cache_service.get_wireframe_data(wireframe_id)
    if cached_wireframe:
        return WireframeResponse(**cached_wireframe)
    
    wireframe = await wireframe_service.get_wireframe_by_id(wireframe_id)
    if not wireframe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wireframe not found"
        )
    
    # Cache wireframe data
    await cache_service.cache_wireframe_data(wireframe_id, wireframe)
    
    return WireframeResponse(**wireframe)

@router.put("/{wireframe_id}", response_model=WireframeResponse)
async def update_wireframe(
    wireframe_id: str,
    update_data: WireframeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a wireframe"""
    wireframe = await wireframe_service.update_wireframe(
        wireframe_id=wireframe_id,
        wireframe_data=update_data.wireframe_data,
        changes_summary=update_data.changes_summary
    )
    
    if not wireframe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wireframe not found"
        )
    
    # Update cache
    await cache_service.cache_wireframe_data(wireframe_id, wireframe)
    
    # Broadcast to project collaborators
    await websocket_manager.broadcast_wireframe_update(
        wireframe["project_id"],
        wireframe["wireframe_data"],
        current_user["id"]
    )
    
    return WireframeResponse(**wireframe)

@router.get("/{wireframe_id}/versions")
async def get_wireframe_versions(
    wireframe_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get version history for a wireframe"""
    versions = await wireframe_service.get_wireframe_versions(wireframe_id)
    return {"versions": versions}

@router.post("/{wireframe_id}/export")
async def export_wireframe(
    wireframe_id: str,
    export_data: WireframeExport,
    current_user: dict = Depends(get_current_user)
):
    """Export wireframe to different formats"""
    try:
        export_result = await wireframe_service.export_wireframe(
            wireframe_id=wireframe_id,
            export_type=export_data.export_type
        )
        
        return {"export": export_result}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
