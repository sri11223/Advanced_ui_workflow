from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    # Core profiling data
    role = Column(String(100))
    sub_role = Column(String(100))
    experience_level = Column(String(50))
    
    # Platform and tool preferences
    preferred_platforms = Column(JSONB)
    current_tools = Column(JSONB)
    project_types = Column(JSONB)
    
    # AI personalization data
    conversation_style = Column(String(50), default='balanced')
    complexity_preference = Column(String(50), default='intermediate')
    
    # Learning and goals
    goals = Column(JSONB)
    industry_focus = Column(String(100))
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
