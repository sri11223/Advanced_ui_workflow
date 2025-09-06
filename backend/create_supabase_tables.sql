-- Create database schema for Advanced UI Workflow
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fbkddxynrmbxyiuhcssq/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles for AI personalization
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    ai_context JSONB DEFAULT '{}',
    design_style VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100) DEFAULT 'web',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table for AI interactions
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255),
    messages JSONB DEFAULT '[]',
    context JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Context briefs for AI memory
CREATE TABLE IF NOT EXISTS context_briefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    brief_type VARCHAR(100),
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wireframes table
CREATE TABLE IF NOT EXISTS wireframes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    wireframe_data JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wireframe versions for history
CREATE TABLE IF NOT EXISTS wireframe_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wireframe_id UUID REFERENCES wireframes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    wireframe_data JSONB NOT NULL,
    changes_summary TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UI Components library
CREATE TABLE IF NOT EXISTS ui_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    component_type VARCHAR(100),
    properties JSONB DEFAULT '{}',
    styling JSONB DEFAULT '{}',
    is_custom BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exports table
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wireframe_id UUID REFERENCES wireframes(id) ON DELETE CASCADE,
    export_type VARCHAR(100) NOT NULL,
    export_data JSONB NOT NULL,
    file_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- User sessions for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_wireframes_project_id ON wireframes(project_id);
CREATE INDEX IF NOT EXISTS idx_wireframe_versions_wireframe_id ON wireframe_versions(wireframe_id);
CREATE INDEX IF NOT EXISTS idx_ui_components_category ON ui_components(category);
CREATE INDEX IF NOT EXISTS idx_exports_wireframe_id ON exports(wireframe_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Insert sample UI components
INSERT INTO ui_components (name, category, component_type, properties, styling) VALUES
('Button', 'Form', 'button', '{"text": "Click me", "variant": "primary"}', '{"backgroundColor": "#007bff", "color": "white", "padding": "8px 16px"}'),
('Input Field', 'Form', 'input', '{"placeholder": "Enter text", "type": "text"}', '{"border": "1px solid #ccc", "padding": "8px", "borderRadius": "4px"}'),
('Card', 'Layout', 'container', '{"title": "Card Title", "content": "Card content"}', '{"backgroundColor": "white", "border": "1px solid #e0e0e0", "borderRadius": "8px", "padding": "16px"}'),
('Navigation Bar', 'Navigation', 'navbar', '{"brand": "Logo", "links": ["Home", "About", "Contact"]}', '{"backgroundColor": "#f8f9fa", "padding": "12px 24px"}'),
('Hero Section', 'Content', 'hero', '{"title": "Welcome", "subtitle": "Subtitle", "cta": "Get Started"}', '{"backgroundColor": "#343a40", "color": "white", "padding": "80px 0", "textAlign": "center"}'),
('Footer', 'Layout', 'footer', '{"copyright": "© 2024 Company", "links": ["Privacy", "Terms"]}', '{"backgroundColor": "#f8f9fa", "padding": "24px", "textAlign": "center"}')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wireframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own conversations" ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own wireframes" ON wireframes FOR ALL USING (auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id));

-- UI components are public for reading, but only authenticated users can create custom ones
CREATE POLICY "Anyone can view ui_components" ON ui_components FOR SELECT TO authenticated;
CREATE POLICY "Authenticated users can create custom components" ON ui_components FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
