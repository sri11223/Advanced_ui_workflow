const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Database service class
class DatabaseService {
  constructor() {
    this.client = supabase;
  }

  // Test connection
  async testConnection() {
    try {
      const { data, error } = await this.client.from('users').select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // User operations
  async createUser(userData) {
    const { data, error } = await this.client
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserByEmail(email) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getUserById(id) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Project operations
  async createProject(projectData) {
    const { data, error } = await this.client
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserProjects(userId) {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getProjectById(projectId, userId) {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateProject(projectId, userId, updates) {
    const { data, error } = await this.client
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteProject(projectId, userId) {
    const { data, error } = await this.client
      .from('projects')
      .update({ is_active: false })
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Wireframe operations
  async createWireframe(wireframeData) {
    const { data, error } = await this.client
      .from('wireframes')
      .insert([wireframeData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getProjectWireframes(projectId) {
    const { data, error } = await this.client
      .from('wireframes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Generic operations
  async findById(table, id) {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findMany(table, filters = {}, options = {}) {
    let query = this.client.from(table).select('*');
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    // Apply options
    if (options.limit) query = query.limit(options.limit);
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async create(table, data) {
    const { data: result, error } = await this.client
      .from(table)
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  async update(table, id, updates) {
    const { data, error } = await this.client
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

const db = new DatabaseService();

module.exports = { db, supabase };
