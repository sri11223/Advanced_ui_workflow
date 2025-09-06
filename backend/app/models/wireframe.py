from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class Wireframe(Base):
    __tablename__ = "wireframes"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    screen_name = Column(String(255), nullable=False)
    screen_type = Column(String(100), nullable=False)
    screen_category = Column(String(100))
    device_template = Column(String(100))
    components = Column(JSONB, nullable=False)
    layout_config = Column(JSONB, nullable=False)
    responsive_breakpoints = Column(JSONB)
    navigation_links = Column(JSONB)
    interaction_states = Column(JSONB)
    form_validations = Column(JSONB)
    design_theme = Column(JSONB)
    accessibility_features = Column(JSONB)
    generation_prompt = Column(Text)
    ai_reasoning = Column(Text)
    component_suggestions = Column(JSONB)
    version = Column(Integer, default=1)
    parent_version_id = Column(UUID(as_uuid=True), ForeignKey("wireframes.id"))
    is_published = Column(Boolean, default=False)
    generation_status = Column(String(50), default="completed")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
