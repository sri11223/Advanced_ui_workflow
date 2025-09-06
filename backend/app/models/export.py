from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, BigInteger
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class Export(Base):
    __tablename__ = "exports"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    # Export configuration
    export_type = Column(String(50), nullable=False)
    export_name = Column(String(255), nullable=False)
    wireframe_ids = Column(JSONB)
    
    # Generated content
    export_data = Column(JSONB, nullable=False)
    file_size_bytes = Column(BigInteger)
    
    # Sharing and access
    download_url = Column(Text)
    share_url = Column(Text)
    expiry_date = Column(DateTime)
    
    # Usage tracking
    download_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)
    
    # Generation metadata
    generation_status = Column(String(50), default='completed')
    error_message = Column(Text)
    
    created_at = Column(DateTime, server_default=func.now())
