from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class WireframeVersion(Base):
    __tablename__ = "wireframe_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    wireframe_id = Column(UUID(as_uuid=True), ForeignKey("wireframes.id", ondelete="CASCADE"))
    version_number = Column(Integer, nullable=False)
    
    # Snapshot of wireframe at this version
    components_snapshot = Column(JSONB, nullable=False)
    layout_snapshot = Column(JSONB, nullable=False)
    
    # Change tracking
    change_description = Column(Text)
    change_type = Column(String(50))
    changed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    created_at = Column(DateTime, server_default=func.now())
