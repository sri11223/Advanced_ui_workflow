from typing import Optional, List, Dict, Any, AsyncGenerator
import asyncio
import aiohttp
import json
# from transformers import pipeline  # Removed due to Windows Long Path issues
from datetime import datetime, timedelta
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class CircuitBreaker:
    """Circuit breaker pattern for AI service reliability"""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def can_execute(self) -> bool:
        """Check if request can be executed"""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout):
                self.state = "HALF_OPEN"
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def record_success(self):
        """Record successful execution"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def record_failure(self):
        """Record failed execution"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

class AIRequestQueue:
    """Queue management for AI requests with priority and rate limiting"""
    
    def __init__(self, max_concurrent: int = 3, rate_limit: int = 10):
        self.max_concurrent = max_concurrent
        self.rate_limit = rate_limit  # requests per minute
        self.queue = asyncio.Queue()
        self.active_requests = 0
        self.request_times = []
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    async def add_request(self, request_data: Dict[str, Any], priority: int = 1):
        """Add request to queue with priority"""
        await self.queue.put((priority, datetime.now(), request_data))
    
    async def can_process(self) -> bool:
        """Check if we can process more requests (rate limiting)"""
        now = datetime.now()
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if now - t < timedelta(minutes=1)]
        return len(self.request_times) < self.rate_limit
    
    async def process_request(self) -> Optional[Dict[str, Any]]:
        """Get next request from queue"""
        if not await self.can_process():
            return None
        
        try:
            priority, timestamp, request_data = await asyncio.wait_for(self.queue.get(), timeout=1.0)
            self.request_times.append(datetime.now())
            return request_data
        except asyncio.TimeoutError:
            return None

class AIService:
    """Enterprise AI service with HuggingFace integration, circuit breaker, and queue management"""
    
    def __init__(self):
        self.api_token = settings.HUGGINGFACE_API_TOKEN
        self.base_url = "https://api-inference.huggingface.co/models"
        self.circuit_breaker = CircuitBreaker()
        self.request_queue = AIRequestQueue()
        self.session = None
        
        # Model configurations
        self.models = {
            "text_generation": "microsoft/DialoGPT-medium",
            "code_generation": "microsoft/CodeBERT-base",
            "ui_description": "facebook/blenderbot-400M-distill",
            "wireframe_analysis": "google/flan-t5-base"
        }
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session"""
        if not self.session:
            headers = {"Authorization": f"Bearer {self.api_token}"}
            self.session = aiohttp.ClientSession(headers=headers)
        return self.session
    
    async def _make_request(self, model: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Make request to HuggingFace API with circuit breaker"""
        if not self.circuit_breaker.can_execute():
            logger.warning("Circuit breaker is OPEN, skipping AI request")
            return None
        
        try:
            session = await self._get_session()
            url = f"{self.base_url}/{model}"
            
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    self.circuit_breaker.record_success()
                    return result
                else:
                    logger.error(f"AI API error: {response.status}")
                    self.circuit_breaker.record_failure()
                    return None
                    
        except Exception as e:
            logger.error(f"AI request failed: {e}")
            self.circuit_breaker.record_failure()
            return None
    
    async def generate_wireframe_suggestions(self, description: str, context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Generate wireframe suggestions based on description"""
        prompt = f"""
        Create a wireframe layout for: {description}
        
        Context: {json.dumps(context or {}, indent=2)}
        
        Generate a JSON structure with components, layout, and styling suggestions.
        Focus on modern UI/UX best practices.
        """
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_length": 500,
                "temperature": 0.7,
                "do_sample": True
            }
        }
        
        # Add to queue
        await self.request_queue.add_request({
            "model": self.models["wireframe_analysis"],
            "payload": payload,
            "type": "wireframe_generation"
        }, priority=2)
        
        # Process request
        request_data = await self.request_queue.process_request()
        if not request_data:
            return self._get_fallback_wireframe_suggestions(description)
        
        result = await self._make_request(request_data["model"], request_data["payload"])
        
        if result:
            return self._parse_wireframe_suggestions(result)
        else:
            return self._get_fallback_wireframe_suggestions(description)
    
    async def generate_ui_components(self, component_type: str, requirements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate UI component suggestions"""
        prompt = f"""
        Generate {component_type} component variations with these requirements:
        {json.dumps(requirements, indent=2)}
        
        Provide multiple design options with properties and styling.
        """
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_length": 300,
                "temperature": 0.8
            }
        }
        
        await self.request_queue.add_request({
            "model": self.models["ui_description"],
            "payload": payload,
            "type": "component_generation"
        }, priority=1)
        
        request_data = await self.request_queue.process_request()
        if not request_data:
            return self._get_fallback_components(component_type)
        
        result = await self._make_request(request_data["model"], request_data["payload"])
        
        if result:
            return self._parse_component_suggestions(result, component_type)
        else:
            return self._get_fallback_components(component_type)
    
    async def analyze_user_intent(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analyze user intent from conversation message"""
        prompt = f"""
        Analyze this user message for wireframe/UI intent:
        "{message}"
        
        Context: {json.dumps(context or {}, indent=2)}
        
        Determine:
        1. Intent type (create, modify, export, question)
        2. Component types mentioned
        3. Layout preferences
        4. Styling requirements
        5. Priority level
        """
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_length": 200,
                "temperature": 0.3
            }
        }
        
        await self.request_queue.add_request({
            "model": self.models["text_generation"],
            "payload": payload,
            "type": "intent_analysis"
        }, priority=3)
        
        request_data = await self.request_queue.process_request()
        if not request_data:
            return self._get_fallback_intent_analysis(message)
        
        result = await self._make_request(request_data["model"], request_data["payload"])
        
        if result:
            return self._parse_intent_analysis(result, message)
        else:
            return self._get_fallback_intent_analysis(message)
    
    async def generate_code_export(self, wireframe_data: Dict[str, Any], export_type: str) -> str:
        """Generate code from wireframe data"""
        prompt = f"""
        Convert this wireframe to {export_type} code:
        {json.dumps(wireframe_data, indent=2)}
        
        Generate clean, production-ready code with:
        - Proper component structure
        - Responsive design
        - Modern styling
        - Accessibility features
        """
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_length": 800,
                "temperature": 0.2
            }
        }
        
        await self.request_queue.add_request({
            "model": self.models["code_generation"],
            "payload": payload,
            "type": "code_generation"
        }, priority=1)
        
        request_data = await self.request_queue.process_request()
        if not request_data:
            return self._get_fallback_code(wireframe_data, export_type)
        
        result = await self._make_request(request_data["model"], request_data["payload"])
        
        if result:
            return self._parse_generated_code(result)
        else:
            return self._get_fallback_code(wireframe_data, export_type)
    
    def _get_fallback_wireframe_suggestions(self, description: str) -> List[Dict[str, Any]]:
        """Fallback wireframe suggestions when AI is unavailable"""
        return [
            {
                "layout": "header-main-footer",
                "components": [
                    {"type": "navbar", "position": "top"},
                    {"type": "hero", "content": description},
                    {"type": "content", "sections": 3},
                    {"type": "footer", "position": "bottom"}
                ],
                "styling": {
                    "theme": "modern",
                    "colors": ["#007bff", "#6c757d", "#28a745"],
                    "typography": "sans-serif"
                }
            }
        ]
    
    def _get_fallback_components(self, component_type: str) -> List[Dict[str, Any]]:
        """Fallback component suggestions"""
        return [
            {
                "name": f"Basic {component_type}",
                "properties": {"variant": "default"},
                "styling": {"theme": "modern"}
            }
        ]
    
    def _get_fallback_intent_analysis(self, message: str) -> Dict[str, Any]:
        """Fallback intent analysis"""
        return {
            "intent": "create" if "create" in message.lower() else "question",
            "confidence": 0.5,
            "components": [],
            "priority": 1
        }
    
    def _get_fallback_code(self, wireframe_data: Dict[str, Any], export_type: str) -> str:
        """Fallback code generation"""
        if export_type == "html":
            return "<div>Generated HTML would go here</div>"
        elif export_type == "react":
            return "const Component = () => <div>Generated React would go here</div>;"
        else:
            return "// Generated code would go here"
    
    def _parse_wireframe_suggestions(self, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse AI response for wireframe suggestions"""
        # Simplified parsing - in production, use more sophisticated NLP
        return self._get_fallback_wireframe_suggestions("AI generated")
    
    def _parse_component_suggestions(self, result: Dict[str, Any], component_type: str) -> List[Dict[str, Any]]:
        """Parse AI response for component suggestions"""
        return self._get_fallback_components(component_type)
    
    def _parse_intent_analysis(self, result: Dict[str, Any], message: str) -> Dict[str, Any]:
        """Parse AI response for intent analysis"""
        return self._get_fallback_intent_analysis(message)
    
    def _parse_generated_code(self, result: Dict[str, Any]) -> str:
        """Parse AI response for generated code"""
        if isinstance(result, list) and result:
            return result[0].get("generated_text", "// No code generated")
        return "// No code generated"
    
    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()

# Global AI service instance
ai_service = AIService()
