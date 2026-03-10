const mongoose = require('mongoose');

// =====================================================
// MONGOOSE SCHEMAS
// =====================================================

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true, trim: true },
  profile_completed: { type: Boolean, default: false },
  onboarding_step: { type: Number, default: 0 },
  onboarding_data: { type: mongoose.Schema.Types.Mixed, default: null },
  role: { type: String, default: 'user' },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const projectSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, default: 'wireframe' },
  status: { type: String, default: 'draft', enum: ['draft', 'in_progress', 'completed', 'archived'] },
  is_active: { type: Boolean, default: true },
  wireframe_data: { type: mongoose.Schema.Types.Mixed, default: null },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const wireframeSchema = new mongoose.Schema({
  project_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  name: { type: String, default: 'Untitled Wireframe' },
  version: { type: Number, default: 1 },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  components: [{ type: mongoose.Schema.Types.Mixed }],
  pages: [{ type: mongoose.Schema.Types.Mixed }],
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Add text index for searching
projectSchema.index({ name: 'text', description: 'text' });

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Wireframe = mongoose.model('Wireframe', wireframeSchema);

// =====================================================
// DATABASE SERVICE (same API as the old Supabase one)
// =====================================================

class MongoDBService {
  constructor() {
    this.isConnected = false;
  }

  async connect(mongoUri) {
    if (!mongoUri) {
      console.log('⚠️ No MONGODB_URI configured');
      return false;
    }

    try {
      console.log('🔍 Connecting to MongoDB...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      console.log('✅ MongoDB connection successful');

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
        this.isConnected = false;
      });

      return true;
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
      this.isConnected = false;
      return false;
    }
  }

  async testConnection() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  // =====================================================
  // USER OPERATIONS
  // =====================================================

  async createUser(userData) {
    const user = new User(userData);
    const saved = await user.save();
    return this._toPlainObject(saved);
  }

  async getUserByEmail(email) {
    const user = await User.findOne({ email: email.toLowerCase(), is_active: true }).lean();
    return user ? this._addId(user) : null;
  }

  async getUserById(id) {
    let user;
    if (mongoose.isValidObjectId(id)) {
      user = await User.findById(id).lean();
    } else {
      user = await User.findOne({ _id: id }).lean().catch(() => null);
    }
    return user ? this._addId(user) : null;
  }

  async updateUser(id, updates) {
    const user = await User.findByIdAndUpdate(id, { ...updates, updated_at: new Date() }, { new: true }).lean();
    return user ? this._addId(user) : null;
  }

  // =====================================================
  // PROJECT OPERATIONS
  // =====================================================

  async createProject(projectData) {
    const project = new Project(projectData);
    const saved = await project.save();
    return this._toPlainObject(saved);
  }

  async getUserProjects(userId) {
    const projects = await Project.find({ user_id: userId, is_active: true })
      .sort({ created_at: -1 })
      .lean();
    return projects.map(p => this._addId(p));
  }

  async getProjectById(projectId, userId) {
    const filter = { _id: projectId, is_active: true };
    if (userId) filter.user_id = userId;
    const project = await Project.findOne(filter).lean();
    return project ? this._addId(project) : null;
  }

  async updateProject(projectId, userId, updates) {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, user_id: userId },
      { ...updates, updated_at: new Date() },
      { new: true }
    ).lean();
    return project ? this._addId(project) : null;
  }

  async deleteProject(projectId, userId) {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, user_id: userId },
      { is_active: false, updated_at: new Date() },
      { new: true }
    ).lean();
    return project ? this._addId(project) : null;
  }

  // =====================================================
  // WIREFRAME OPERATIONS
  // =====================================================

  async createWireframe(wireframeData) {
    const wireframe = new Wireframe(wireframeData);
    const saved = await wireframe.save();
    return this._toPlainObject(saved);
  }

  async getProjectWireframes(projectId) {
    const wireframes = await Wireframe.find({ project_id: projectId, is_active: true })
      .sort({ created_at: -1 })
      .lean();
    return wireframes.map(w => this._addId(w));
  }

  // =====================================================
  // GENERIC OPERATIONS
  // =====================================================

  async findById(table, id) {
    const Model = this._getModel(table);
    const doc = await Model.findById(id).lean();
    return doc ? this._addId(doc) : null;
  }

  async findMany(table, filters = {}, options = {}) {
    const Model = this._getModel(table);
    let query = Model.find(filters);
    if (options.limit) query = query.limit(options.limit);
    if (options.orderBy) query = query.sort({ [options.orderBy]: options.ascending ? 1 : -1 });
    const docs = await query.lean();
    return docs.map(d => this._addId(d));
  }

  async create(table, data) {
    const Model = this._getModel(table);
    const doc = new Model(data);
    const saved = await doc.save();
    return this._toPlainObject(saved);
  }

  async update(table, id, updates) {
    const Model = this._getModel(table);
    const doc = await Model.findByIdAndUpdate(id, updates, { new: true }).lean();
    return doc ? this._addId(doc) : null;
  }

  async remove(table, id) {
    const Model = this._getModel(table);
    const result = await Model.findByIdAndDelete(id);
    return !!result;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _getModel(table) {
    const models = { users: User, projects: Project, wireframes: Wireframe };
    return models[table] || User;
  }

  _toPlainObject(doc) {
    const obj = doc.toObject();
    obj.id = obj._id.toString();
    return obj;
  }

  _addId(obj) {
    if (obj._id) obj.id = obj._id.toString();
    return obj;
  }

  async close() {
    await mongoose.connection.close();
    this.isConnected = false;
    console.log('MongoDB connection closed');
  }
}

module.exports = { MongoDBService, User, Project, Wireframe };
