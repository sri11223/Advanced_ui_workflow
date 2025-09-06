from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    message = Column(Text, nullable=False)
    sender = Column(String(20), nullable=False)
    message_type = Column(String(50), default="text")
    intent = Column(String(50))
    care_stage = Column(String(50))
    generated_insights = Column(JSONB)
    attachments = Column(JSONB)
    voice_transcript = Column(Text)
    sketch_analysis = Column(JSONB)
    triggered_wireframe_generation = Column(Boolean, default=False)
    generated_wireframes = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())
