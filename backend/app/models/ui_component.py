from sqlalchemy import Column, String, Boolean, Integer, DateTime, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class UIComponent(Base):
    __tablename__ = "ui_components"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)
    category = Column(String(100))
    platforms = Column(JSONB, nullable=False)
    frameworks = Column(JSONB)
    default_props = Column(JSONB, nullable=False)
    required_props = Column(JSONB)
    style_variants = Column(JSONB)
    responsive_behavior = Column(JSONB)
    use_cases = Column(JSONB)
    keywords = Column(JSONB)
    semantic_tags = Column(JSONB)
    design_tokens = Column(JSONB)
    accessibility_properties = Column(JSONB)
    usage_popularity = Column(Integer, default=0)
    success_rate = Column(DECIMAL(3,2), default=0.0)
    is_system_component = Column(Boolean, default=True)
    is_deprecated = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
