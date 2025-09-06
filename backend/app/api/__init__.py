from .auth import router as auth_router
from .projects import router as projects_router
from .wireframes import router as wireframes_router
from .conversations import router as conversations_router
from .ui_components import router as ui_components_router
from .websockets import router as websockets_router
from .health import router as health_router

__all__ = [
    "auth_router",
    "projects_router", 
    "wireframes_router",
    "conversations_router",
    "ui_components_router",
    "websockets_router",
    "health_router"
]