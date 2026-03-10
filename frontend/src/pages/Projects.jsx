import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, Grid, List, Calendar, Clock, 
  Users, Star, MoreVertical, Edit, Trash2, Copy, 
  FolderOpen, Zap, ArrowLeft, Settings
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { BackgroundLines } from '../components/ui/background-lines';

const Projects = () => {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('updated');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  // Fetch projects from API
  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects:', response.status);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || project.project_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'updated':
      default:
        return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectTypeColor = (type) => {
    switch (type) {
      case 'mobile': return 'from-green-500 to-emerald-500';
      case 'web': return 'from-blue-500 to-cyan-500';
      case 'desktop': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const handleProjectClick = async (project) => {
    try {
      // Fetch wireframes for this project
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/wireframes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let wireframeData = null;
      if (response.ok) {
        wireframeData = await response.json();
      } else {
        wireframeData = [];
      }

      // Navigate to workspace with project data
      navigate(`/workspace/${project.id}`, {
        state: {
          projectId: project.id,
          projectData: project,
          wireframeData: wireframeData,
          quickLoad: true
        }
      });
    } catch (error) {
      console.error('Error loading project:', error);
      navigate(`/workspace/${project.id}`, {
        state: {
          projectId: project.id,
          projectData: project,
          wireframeData: [],
          quickLoad: true
        }
      });
    }
  };

  const ProjectCard = ({ project }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      onClick={() => handleProjectClick(project)}
      className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 cursor-pointer"
    >
      {/* Quick Load Indicator */}
      {project.wireframes_count > 0 && (
        <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getProjectTypeColor(project.project_type)} flex items-center justify-center`}>
          <FolderOpen className="w-6 h-6 text-white" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle menu actions
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
        {project.name}
      </h3>
      <p className="text-white/60 text-sm mb-4 line-clamp-2">
        {project.description}
      </p>

      <div className="flex items-center justify-between text-xs text-white/40 mb-4">
        <span className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {formatDate(project.updated_at)}
        </span>
        <span className="flex items-center">
          <Users className="w-3 h-3 mr-1" />
          {project.collaborators || 1}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getProjectTypeColor(project.project_type)} text-white`}>
            {project.project_type}
          </span>
          <span className="text-white/40 text-xs flex items-center">
            {project.wireframes_count > 0 ? (
              <>
                <Zap className="w-3 h-3 mr-1 text-green-400" />
                {project.wireframes_count} wireframes
              </>
            ) : (
              'New project'
            )}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {project.wireframes_count > 0 && (
            <span className="text-xs text-green-400 font-medium">Quick Load</span>
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white text-xs">→</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <BackgroundLines className="min-h-screen bg-black">
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Projects</h1>
                  <p className="text-white/60 text-sm">Manage your design projects</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link
                  to="/create-project"
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="web">Web</option>
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Date Created</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Projects Grid/List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="text-center py-20">
              <FolderOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No projects found</h3>
              <p className="text-white/60 mb-6">
                {searchQuery ? 'Try adjusting your search criteria' : 'Create your first project to get started'}
              </p>
              <Link
                to="/create-project"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </Link>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {sortedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    </BackgroundLines>
  );
};

export default Projects;
