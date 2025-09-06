// Core type definitions for the application

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  profile_completed: boolean;
  onboarding_step: number;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  project_type?: string;
  target_platform?: string;
  industry?: string;
  target_audience?: string;
  key_features?: Record<string, any>;
  user_personas?: Record<string, any>;
  project_goals?: string;
  constraints?: string;
  ai_context?: Record<string, any>;
  collaboration_enabled: boolean;
  is_template: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Wireframe {
  id: string;
  project_id: string;
  screen_name: string;
  screen_type?: string;
  device_type?: string;
  screen_size?: string;
  content_structure?: Record<string, any>;
  design_system?: Record<string, any>;
  ai_reasoning?: Record<string, any>;
  generation_prompt?: string;
  version_number: number;
  is_active: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  project_id: string;
  user_id: string;
  message_content: Record<string, any>;
  ai_response?: Record<string, any>;
  intent_analysis?: Record<string, any>;
  context_used?: Record<string, any>;
  generated_wireframe_id?: string;
  created_at: Date;
}

export interface UIComponent {
  id: string;
  name: string;
  type: string;
  category?: string;
  platforms: Record<string, any>;
  frameworks?: Record<string, any>;
  default_props: Record<string, any>;
  required_props?: Record<string, any>;
  style_variants?: Record<string, any>;
  responsive_behavior?: Record<string, any>;
  use_cases?: Record<string, any>;
  keywords?: Record<string, any>;
  semantic_tags?: Record<string, any>;
  design_tokens?: Record<string, any>;
  accessibility_properties?: Record<string, any>;
  usage_popularity: number;
  success_rate: number;
  is_system_component: boolean;
  is_deprecated: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  user_id: string;
  role?: string;
  sub_role?: string;
  experience_level?: string;
  preferred_platforms?: Record<string, any>;
  current_tools?: Record<string, any>;
  project_types?: Record<string, any>;
  conversation_style: string;
  complexity_preference: string;
  goals?: Record<string, any>;
  industry_focus?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AIContext {
  id: string;
  user_id: string;
  successful_patterns?: Record<string, any>;
  preferred_questioning_style?: string;
  component_preferences?: Record<string, any>;
  design_patterns?: Record<string, any>;
  interaction_count: number;
  success_rate: number;
  updated_at: Date;
}

export interface ContextBrief {
  id: string;
  project_id: string;
  user_id: string;
  problem_statement?: string;
  primary_users?: Record<string, any>;
  key_user_tasks?: Record<string, any>;
  success_metrics?: string;
  edge_cases?: string;
  technical_constraints?: string;
  business_constraints?: string;
  compliance_requirements?: string;
  completeness_score: number;
  confidence_score: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface WireframeVersion {
  id: string;
  wireframe_id: string;
  version_number: number;
  components_snapshot: Record<string, any>;
  layout_snapshot: Record<string, any>;
  change_description?: string;
  change_type?: string;
  changed_by_user_id?: string;
  created_at: Date;
}

export interface Export {
  id: string;
  project_id: string;
  user_id: string;
  export_type: string;
  export_name: string;
  wireframe_ids?: Record<string, any>;
  export_data: Record<string, any>;
  file_size_bytes?: number;
  download_url?: string;
  share_url?: string;
  expiry_date?: Date;
  download_count: number;
  share_count: number;
  generation_status: string;
  error_message?: string;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Request types
export interface CreateProjectRequest {
  title: string;
  description?: string;
  project_type?: string;
  target_platform?: string;
  industry?: string;
  target_audience?: string;
}

export interface CreateWireframeRequest {
  project_id: string;
  screen_name: string;
  screen_type?: string;
  device_type?: string;
  generation_prompt?: string;
}

export interface ConversationRequest {
  project_id: string;
  message_content: Record<string, any>;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data: any;
  userId?: string;
  projectId?: string;
  timestamp: Date;
}

export interface WebSocketResponse {
  type: string;
  data: any;
  success: boolean;
  error?: string;
}

// Cache types
export interface CacheOptions {
  ttl?: number;
  key?: string;
}

// Circuit breaker types
export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: Date;
}

// Health check types
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: string;
    responseTime: number;
    message: string;
    details?: Record<string, any>;
  }>;
  timestamp: Date;
}
