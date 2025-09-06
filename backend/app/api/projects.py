from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.project_service import project_service
from app.services.cache_service import cache_service
from app.api.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_type: str = "web"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    project_type: str
    settings: Dict[str, Any]
    is_active: bool
    created_at: str
    updated_at: str

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new project"""
    try:
        project = await project_service.create_project(
            user_id=current_user["id"],
            name=project_data.name,
            description=project_data.description,
            project_type=project_data.project_type
        )
        
        # Cache project data
        await cache_service.cache_project_data(project["id"], project)
        
        return ProjectResponse(**project)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[ProjectResponse])
async def get_user_projects(current_user: dict = Depends(get_current_user)):
    """Get all projects for the current user"""
    projects = await project_service.get_user_projects(current_user["id"])
    
    # Cache each project
    for project in projects:
        await cache_service.cache_project_data(project["id"], project)
    
    return [ProjectResponse(**project) for project in projects]

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific project"""
    # Check cache first
    cached_project = await cache_service.get_project_data(project_id)
    if cached_project and cached_project["user_id"] == current_user["id"]:
        return ProjectResponse(**cached_project)
    
    project = await project_service.get_project_by_id(project_id, current_user["id"])
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Cache project data
    await cache_service.cache_project_data(project_id, project)
    
    return ProjectResponse(**project)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    updates: ProjectUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a project"""
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    project = await project_service.update_project(
        project_id=project_id,
        user_id=current_user["id"],
        updates=update_data
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update cache
    await cache_service.cache_project_data(project_id, project)
    
    return ProjectResponse(**project)

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a project (soft delete)"""
    success = await project_service.delete_project(project_id, current_user["id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Invalidate cache
    await cache_service.invalidate_project_cache(project_id)
    
    return {"message": "Project deleted successfully"}
