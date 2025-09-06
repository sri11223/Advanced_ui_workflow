from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.ui_component_service import ui_component_service
from app.services.cache_service import cache_service
from app.api.auth import get_current_user

router = APIRouter(prefix="/ui-components", tags=["ui-components"])

class ComponentCreate(BaseModel):
    name: str
    category: str
    component_type: str
    properties: Dict[str, Any]
    styling: Dict[str, Any]

class ComponentResponse(BaseModel):
    id: str
    name: str
    category: str
    component_type: str
    properties: Dict[str, Any]
    styling: Dict[str, Any]
    is_custom: bool
    created_by: Optional[str]
    created_at: str
    updated_at: str

@router.get("/", response_model=List[ComponentResponse])
async def get_all_components():
    """Get all UI components"""
    # Check cache first
    cached_components = await cache_service.get_cached_ui_components("all")
    if cached_components:
        return [ComponentResponse(**comp) for comp in cached_components]
    
    components = await ui_component_service.get_all_components()
    
    # Cache components
    await cache_service.cache_ui_components("all", components)
    
    return [ComponentResponse(**comp) for comp in components]

@router.get("/categories")
async def get_component_categories():
    """Get available component categories"""
    categories = ui_component_service.get_component_categories()
    return {"categories": categories}

@router.get("/category/{category}", response_model=List[ComponentResponse])
async def get_components_by_category(category: str):
    """Get UI components by category"""
    # Check cache first
    cached_components = await cache_service.get_cached_ui_components(category)
    if cached_components:
        return [ComponentResponse(**comp) for comp in cached_components]
    
    components = await ui_component_service.get_components_by_category(category)
    
    # Cache components
    await cache_service.cache_ui_components(category, components)
    
    return [ComponentResponse(**comp) for comp in components]

@router.post("/", response_model=ComponentResponse)
async def create_custom_component(
    component_data: ComponentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a custom UI component"""
    try:
        component = await ui_component_service.create_custom_component(
            user_id=current_user["id"],
            name=component_data.name,
            category=component_data.category,
            component_type=component_data.component_type,
            properties=component_data.properties,
            styling=component_data.styling
        )
        
        # Invalidate category cache
        await cache_service.delete("ui_component", component_data.category)
        await cache_service.delete("ui_component", "all")
        
        return ComponentResponse(**component)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/my-components", response_model=List[ComponentResponse])
async def get_user_custom_components(current_user: dict = Depends(get_current_user)):
    """Get custom components created by the current user"""
    components = await ui_component_service.get_user_custom_components(current_user["id"])
    return [ComponentResponse(**comp) for comp in components]

@router.get("/defaults/{component_type}")
async def get_component_defaults(component_type: str):
    """Get default properties and styling for a component type"""
    properties = ui_component_service.get_default_component_properties(component_type)
    styling = ui_component_service.get_default_component_styling(component_type)
    
    return {
        "component_type": component_type,
        "default_properties": properties,
        "default_styling": styling
    }

@router.put("/{component_id}", response_model=ComponentResponse)
async def update_component(
    component_id: str,
    updates: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Update a custom component (only by creator)"""
    component = await ui_component_service.update_component(
        component_id=component_id,
        user_id=current_user["id"],
        updates=updates
    )
    
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Component not found or not authorized"
        )
    
    # Invalidate cache
    await cache_service.delete("ui_component", component["category"])
    await cache_service.delete("ui_component", "all")
    
    return ComponentResponse(**component)
