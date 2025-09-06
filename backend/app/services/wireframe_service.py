from typing import Optional, List, Dict, Any
from app.core.database import db
import asyncio
import json
from datetime import datetime

class WireframeService:
    """Enterprise wireframe management service with versioning"""
    
    async def create_wireframe(self, project_id: str, name: str, wireframe_data: Dict[str, Any], 
                             conversation_id: str = None, description: str = None) -> Dict[str, Any]:
        """Create a new wireframe"""
        wireframe_payload = {
            "project_id": project_id,
            "conversation_id": conversation_id,
            "name": name,
            "description": description,
            "wireframe_data": wireframe_data,
            "version": 1,
            "is_current": True
        }
        
        wireframe = await db.create_wireframe(wireframe_payload)
        if not wireframe:
            raise ValueError("Failed to create wireframe")
        
        # Create initial version
        await self._create_wireframe_version(wireframe["id"], 1, wireframe_data, "Initial version")
        
        return wireframe
    
    async def get_project_wireframes(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all wireframes for a project"""
        return await db.get_project_wireframes(project_id)
    
    async def get_wireframe_by_id(self, wireframe_id: str) -> Optional[Dict[str, Any]]:
        """Get wireframe by ID"""
        return await db.get_wireframe_by_id(wireframe_id)
    
    async def update_wireframe(self, wireframe_id: str, wireframe_data: Dict[str, Any], 
                             changes_summary: str = None) -> Optional[Dict[str, Any]]:
        """Update wireframe and create new version"""
        # Get current wireframe
        current = await self.get_wireframe_by_id(wireframe_id)
        if not current:
            return None
        
        new_version = current["version"] + 1
        
        # Update wireframe
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("wireframes").update({
                "wireframe_data": wireframe_data,
                "version": new_version,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", wireframe_id).execute()
        )
        
        if result.data:
            # Create version history
            await self._create_wireframe_version(wireframe_id, new_version, wireframe_data, changes_summary)
            return result.data[0]
        
        return None
    
    async def _create_wireframe_version(self, wireframe_id: str, version_number: int, 
                            wireframe_data: Dict[str, Any], changes_summary: str = None) -> None:
        """Create wireframe version history"""
        version_data = {
            "wireframe_id": wireframe_id,
            "version_number": version_number,
            "wireframe_data": wireframe_data,
            "changes_summary": changes_summary
        }
        
        await db.create_wireframe_version(version_data)
    
    async def get_wireframe_versions(self, wireframe_id: str) -> List[Dict[str, Any]]:
        """Get version history for a wireframe"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("wireframe_versions").select("*").eq("wireframe_id", wireframe_id).order("version_number", desc=True).execute()
        )
        return result.data or []
    
    async def export_wireframe(self, wireframe_id: str, export_type: str) -> Dict[str, Any]:
        """Export wireframe to different formats"""
        wireframe = await self.get_wireframe_by_id(wireframe_id)
        if not wireframe:
            raise ValueError("Wireframe not found")
        
        export_data = {
            "wireframe_id": wireframe_id,
            "export_type": export_type,
            "export_data": self._generate_export_data(wireframe["wireframe_data"], export_type),
            "status": "completed"
        }
        
        # Save export record
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("exports").insert(export_data).execute()
        )
        
        return result.data[0] if result.data else None
    
    def _generate_export_data(self, wireframe_data: Dict[str, Any], export_type: str) -> Dict[str, Any]:
        """Generate export data based on type"""
        if export_type == "html":
            return {
                "html": self._generate_html(wireframe_data),
                "css": self._generate_css(wireframe_data)
            }
        elif export_type == "react":
            return {
                "jsx": self._generate_react_jsx(wireframe_data),
                "css": self._generate_css(wireframe_data)
            }
        elif export_type == "figma":
            return {
                "figma_json": wireframe_data  # Simplified for now
            }
        else:
            return wireframe_data
    
    def _generate_html(self, wireframe_data: Dict[str, Any]) -> str:
        """Generate HTML from wireframe data"""
        components = wireframe_data.get("components", [])
        html_parts = ["<!DOCTYPE html>", "<html>", "<head>", "<title>Wireframe</title>", "</head>", "<body>"]
        
        for component in components:
            if component["type"] == "button":
                html_parts.append(f'<button>{component.get("text", "Button")}</button>')
            elif component["type"] == "input":
                html_parts.append(f'<input type="{component.get("inputType", "text")}" placeholder="{component.get("placeholder", "")}">')
            elif component["type"] == "text":
                html_parts.append(f'<p>{component.get("content", "Text")}</p>')
        
        html_parts.extend(["</body>", "</html>"])
        return "\n".join(html_parts)
    
    def _generate_css(self, wireframe_data: Dict[str, Any]) -> str:
        """Generate CSS from wireframe data"""
        return """
        body { font-family: Arial, sans-serif; margin: 20px; }
        button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 4px; }
        input { padding: 8px; margin: 5px; border: 1px solid #ccc; border-radius: 4px; }
        p { margin: 10px 0; }
        """
    
    def _generate_react_jsx(self, wireframe_data: Dict[str, Any]) -> str:
        """Generate React JSX from wireframe data"""
        components = wireframe_data.get("components", [])
        jsx_parts = ["import React from 'react';", "", "const WireframeComponent = () => {", "  return (", "    <div>"]
        
        for component in components:
            if component["type"] == "button":
                jsx_parts.append(f'      <button>{component.get("text", "Button")}</button>')
            elif component["type"] == "input":
                jsx_parts.append(f'      <input type="{component.get("inputType", "text")}" placeholder="{component.get("placeholder", "")}" />')
            elif component["type"] == "text":
                jsx_parts.append(f'      <p>{component.get("content", "Text")}</p>')
        
        jsx_parts.extend(["    </div>", "  );", "};", "", "export default WireframeComponent;"])
        return "\n".join(jsx_parts)

# Global wireframe service instance
wireframe_service = WireframeService()
