from typing import Optional, List, Dict, Any
from app.core.database import db
import asyncio
from datetime import datetime

class UIComponentService:
    """Enterprise UI component library service"""
    
    async def get_all_components(self) -> List[Dict[str, Any]]:
        """Get all UI components"""
        return await db.get_ui_components()
    
    async def get_components_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get UI components by category"""
        return await db.get_ui_components(category)
    
    async def create_custom_component(self, user_id: str, name: str, category: str, 
                                    component_type: str, properties: Dict[str, Any], 
                                    styling: Dict[str, Any]) -> Dict[str, Any]:
        """Create a custom UI component"""
        component_data = {
            "name": name,
            "category": category,
            "component_type": component_type,
            "properties": properties,
            "styling": styling,
            "is_custom": True,
            "created_by": user_id
        }
        
        component = await db.create_ui_component(component_data)
        if not component:
            raise ValueError("Failed to create component")
        
        return component
    
    async def get_user_custom_components(self, user_id: str) -> List[Dict[str, Any]]:
        """Get custom components created by user"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("ui_components").select("*").eq("created_by", user_id).eq("is_custom", True).execute()
        )
        return result.data or []
    
    async def update_component(self, component_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a custom component (only by creator)"""
        # Verify ownership
        loop = asyncio.get_event_loop()
        component = await loop.run_in_executor(
            None,
            lambda: db.client.table("ui_components").select("*").eq("id", component_id).eq("created_by", user_id).execute()
        )
        
        if not component.data:
            return None
        
        # Update component
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("ui_components").update(updates).eq("id", component_id).execute()
        )
        
        return result.data[0] if result.data else None
    
    def get_component_categories(self) -> List[str]:
        """Get available component categories"""
        return [
            "Form",
            "Layout", 
            "Navigation",
            "Content",
            "Media",
            "Data Display",
            "Feedback",
            "Input",
            "Button",
            "Typography"
        ]
    
    def get_default_component_properties(self, component_type: str) -> Dict[str, Any]:
        """Get default properties for component type"""
        defaults = {
            "button": {
                "text": "Click me",
                "variant": "primary",
                "size": "medium",
                "disabled": False
            },
            "input": {
                "placeholder": "Enter text",
                "type": "text",
                "required": False,
                "disabled": False
            },
            "card": {
                "title": "Card Title",
                "content": "Card content",
                "elevation": 1
            },
            "navbar": {
                "brand": "Logo",
                "links": ["Home", "About", "Contact"],
                "position": "top"
            },
            "hero": {
                "title": "Welcome",
                "subtitle": "Subtitle",
                "cta": "Get Started",
                "background": "gradient"
            },
            "footer": {
                "copyright": "© 2024 Company",
                "links": ["Privacy", "Terms"],
                "social": []
            }
        }
        return defaults.get(component_type, {})
    
    def get_default_component_styling(self, component_type: str) -> Dict[str, Any]:
        """Get default styling for component type"""
        defaults = {
            "button": {
                "backgroundColor": "#007bff",
                "color": "white",
                "padding": "8px 16px",
                "borderRadius": "4px",
                "border": "none",
                "cursor": "pointer"
            },
            "input": {
                "border": "1px solid #ccc",
                "padding": "8px",
                "borderRadius": "4px",
                "fontSize": "14px"
            },
            "card": {
                "backgroundColor": "white",
                "border": "1px solid #e0e0e0",
                "borderRadius": "8px",
                "padding": "16px",
                "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"
            },
            "navbar": {
                "backgroundColor": "#f8f9fa",
                "padding": "12px 24px",
                "borderBottom": "1px solid #e0e0e0"
            },
            "hero": {
                "backgroundColor": "#343a40",
                "color": "white",
                "padding": "80px 0",
                "textAlign": "center"
            },
            "footer": {
                "backgroundColor": "#f8f9fa",
                "padding": "24px",
                "textAlign": "center",
                "borderTop": "1px solid #e0e0e0"
            }
        }
        return defaults.get(component_type, {})

# Global UI component service instance
ui_component_service = UIComponentService()
