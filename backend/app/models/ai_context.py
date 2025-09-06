from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class AIContext(Base):
    __tablename__ = "ai_contexts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    # AI memory for personalization
    successful_patterns = Column(JSONB)
    preferred_questioning_style = Column(String(50))
    component_preferences = Column(JSONB)
    design_patterns = Column(JSONB)
    
    # Adaptive learning
    interaction_count = Column(Integer, default=0)
    success_rate = Column(DECIMAL(3,2), default=0.0)
    
    updated_at = Column(DateTime, server_default=func.now())
