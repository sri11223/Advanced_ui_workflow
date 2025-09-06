from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    # Project basics
    title = Column(String(255), nullable=False)
    description = Column(Text)
    project_type = Column(String(100))
    target_platform = Column(String(50))
    
    # AI-gathered context
    industry = Column(String(100))
    target_audience = Column(String(255))
    key_features = Column(JSONB)
    user_personas = Column(JSONB)
    project_goals = Column(Text)
    constraints = Column(Text)
    
    # UI state
    thumbnail_url = Column(Text)
    color_theme = Column(JSONB)
    is_favorite = Column(Boolean, default=False)
    status = Column(String(50), default='active')
    
    # Collaboration
    is_public = Column(Boolean, default=False)
    share_token = Column(String(255), unique=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
