from sqlalchemy import Column, String, Text, DateTime, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .base import Base

class ContextBrief(Base):
    __tablename__ = "context_briefs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    
    # Synthesized requirements
    problem_statement = Column(Text)
    primary_users = Column(JSONB)
    key_user_tasks = Column(JSONB)
    success_metrics = Column(Text)
    edge_cases = Column(Text)
    
    # Technical and business context
    technical_constraints = Column(Text)
    business_constraints = Column(Text)
    compliance_requirements = Column(Text)
    
    # AI confidence and completeness
    completeness_score = Column(DECIMAL(3,2), default=0.0)
    confidence_score = Column(DECIMAL(3,2), default=0.0)
    status = Column(String(50), default='draft')
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
