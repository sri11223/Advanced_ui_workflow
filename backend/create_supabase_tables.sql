-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================================
-- LAYER 1: USER IDENTITY & AUTHENTICATION
-- =====================================================


-- Core users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    
    -- Profile completion tracking
    profile_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);


-- User session management
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- LAYER 2: AI PERSONALIZATION CORE
-- =====================================================


-- User profiles from onboarding questions
CREATE TABLE user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core profiling data
    role VARCHAR(100),
    sub_role VARCHAR(100),
    experience_level VARCHAR(50),
    
    -- Platform and tool preferences
    preferred_platforms JSONB,
    current_tools JSONB,
    project_types JSONB,
    
    -- AI personalization data
    conversation_style VARCHAR(50) DEFAULT 'balanced',
    complexity_preference VARCHAR(50) DEFAULT 'intermediate',
    
    -- Learning and goals
    goals JSONB,
    industry_focus VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- AI conversation context memory
CREATE TABLE ai_contexts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- AI memory for personalization
    successful_patterns JSONB,
    preferred_questioning_style VARCHAR(50),
    component_preferences JSONB,
    design_patterns JSONB,
    
    -- Adaptive learning
    interaction_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    
    updated_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- LAYER 3: PROJECT WORKSPACE MANAGEMENT
-- =====================================================


-- Main projects
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Project basics
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100),
    target_platform VARCHAR(50),
    
    -- AI-gathered context
    industry VARCHAR(100),
    target_audience VARCHAR(255),
    key_features JSONB,
    user_personas JSONB,
    project_goals TEXT,
    constraints TEXT,
    
    -- UI state
    thumbnail_url TEXT,
    color_theme JSONB,
    is_favorite BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    
    -- Collaboration
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- LAYER 4: CONVERSATIONAL AI ENGINE
-- =====================================================


-- Chat conversations
CREATE TABLE conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message content
    message TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    
    -- AI intelligence metadata
    intent VARCHAR(50),
    care_stage VARCHAR(50),
    generated_insights JSONB,
    
    -- Rich content support
    attachments JSONB,
    voice_transcript TEXT,
    sketch_analysis JSONB,
    
    -- Wireframe generation triggers
    triggered_wireframe_generation BOOLEAN DEFAULT false,
    generated_wireframes JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);


-- AI-synthesized context briefs
CREATE TABLE context_briefs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Synthesized requirements
    problem_statement TEXT,
    primary_users JSONB,
    key_user_tasks JSONB,
    success_metrics TEXT,
    edge_cases TEXT,
    
    -- Technical and business context
    technical_constraints TEXT,
    business_constraints TEXT,
    compliance_requirements TEXT,
    
    -- AI confidence and completeness
    completeness_score DECIMAL(3,2) DEFAULT 0.0,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'draft',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- LAYER 5: WIREFRAME GENERATION CORE
-- =====================================================


-- Generated wireframes
CREATE TABLE wireframes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Screen identity
    screen_name VARCHAR(255) NOT NULL,
    screen_type VARCHAR(100) NOT NULL,
    screen_category VARCHAR(100),
    device_template VARCHAR(100),
    
    -- Wireframe content
    components JSONB NOT NULL,
    layout_config JSONB NOT NULL,
    responsive_breakpoints JSONB,
    
    -- Navigation and interaction
    navigation_links JSONB,
    interaction_states JSONB,
    form_validations JSONB,
    
    -- Visual design
    design_theme JSONB,
    accessibility_features JSONB,
    
    -- AI generation metadata
    generation_prompt TEXT,
    ai_reasoning TEXT,
    component_suggestions JSONB,
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_version_id UUID REFERENCES wireframes(id),
    
    -- Status and sharing
    is_published BOOLEAN DEFAULT false,
    generation_status VARCHAR(50) DEFAULT 'completed',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- Wireframe version history
CREATE TABLE wireframe_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wireframe_id UUID REFERENCES wireframes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Snapshot of wireframe at this version
    components_snapshot JSONB NOT NULL,
    layout_snapshot JSONB NOT NULL,
    
    -- Change tracking
    change_description TEXT,
    change_type VARCHAR(50),
    changed_by_user_id UUID REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- LAYER 6: INTELLIGENT COMPONENT SYSTEM
-- =====================================================


-- Reusable UI component library
CREATE TABLE ui_components (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Component identity
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    
    -- Platform and framework support
    platforms JSONB NOT NULL,
    frameworks JSONB,
    
    -- Component definition
    default_props JSONB NOT NULL,
    required_props JSONB,
    style_variants JSONB,
    responsive_behavior JSONB,
    
    -- Smart matching data
    use_cases JSONB,
    keywords JSONB,
    semantic_tags JSONB,
    
    -- Design system integration
    design_tokens JSONB,
    accessibility_properties JSONB,
    
    -- Usage analytics
    usage_popularity INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    
    -- System management
    is_system_component BOOLEAN DEFAULT true,
    is_deprecated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- LAYER 7: EXPORT & INTEGRATION ENGINE
-- =====================================================


-- Generated exports
CREATE TABLE exports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Export configuration
    export_type VARCHAR(50) NOT NULL,
    export_name VARCHAR(255) NOT NULL,
    wireframe_ids JSONB,
    
    -- Generated content
    export_data JSONB NOT NULL,
    file_size_bytes BIGINT,
    
    -- Sharing and access
    download_url TEXT,
    share_url TEXT,
    expiry_date TIMESTAMP,
    
    -- Usage tracking
    download_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Generation metadata
    generation_status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- INDEXES FOR PERFORMANCE (FIXED)
-- =====================================================


-- User and session indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);


-- Project and conversation indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at); -- FIXED: was "timestamp"


-- Wireframe indexes
CREATE INDEX idx_wireframes_project_id ON wireframes(project_id);
CREATE INDEX idx_wireframes_screen_type ON wireframes(screen_type);
CREATE INDEX idx_wireframe_versions_wireframe_id ON wireframe_versions(wireframe_id);


-- Component indexes
CREATE INDEX idx_ui_components_type ON ui_components(type);
CREATE INDEX idx_ui_components_category ON ui_components(category);
CREATE INDEX idx_ui_components_platforms ON ui_components USING GIN(platforms);


-- Export indexes
CREATE INDEX idx_exports_project_id ON exports(project_id);
CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_type ON exports(export_type);


-- =====================================================
-- SAMPLE DATA FOR IMMEDIATE USE
-- =====================================================


-- Insert essential UI components
INSERT INTO ui_components (name, type, category, platforms, frameworks, default_props, use_cases, keywords) VALUES
('Material AppBar', 'navigation', 'material_ui', '["web", "android"]', '["react", "vue"]', '{"position": "sticky", "elevation": 1, "color": "primary"}', '["web_app", "saas", "admin_dashboard"]', '["header", "navigation", "app_bar"]'),
('Material Button', 'input', 'material_ui', '["web", "android"]', '["react", "vue"]', '{"variant": "contained", "size": "medium", "color": "primary"}', '["forms", "cta", "actions"]', '["button", "click", "action"]'),
('Material TextField', 'input', 'material_ui', '["web", "android"]', '["react", "vue"]', '{"variant": "outlined", "fullWidth": true}', '["forms", "user_input", "search"]', '["input", "form", "text"]'),
('Material Card', 'display', 'material_ui', '["web", "android"]', '["react", "vue"]', '{"elevation": 2, "padding": 16}', '["content_display", "product_cards", "info_panels"]', '["card", "container", "content"]'),
('iOS Navigation Bar', 'navigation', 'ios_native', '["ios"]', '["react_native", "flutter"]', '{"title": "Screen Title", "backgroundColor": "#FFFFFF"}', '["mobile_app", "ios_design"]', '["navigation", "header", "ios"]'),
('Android Bottom Navigation', 'navigation', 'android_native', '["android"]', '["react_native", "flutter"]', '{"selectedItemColor": "#2196F3", "type": "fixed"}', '["mobile_app", "android_design", "tab_navigation"]', '["navigation", "bottom", "tabs"]');
