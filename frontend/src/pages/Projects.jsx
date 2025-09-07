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
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('updated');

  // Fetch projects from API
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
        // Fallback to mock data if API fails
        setProjects(mockProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Fallback to mock data
      setProjects(mockProjects);
    } finally {
      setLoading(false);
    }
  };

  // Mock data fallback
  const mockProjects = [
    {
      id: 1,
      name: "E-commerce Mobile App",
      description: "Modern shopping app with AI recommendations",
      project_type: "mobile",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-20T14:45:00Z",
      is_active: true,
      wireframes_count: 12,
      collaborators: 3
    },
    {
      id: 2,
      name: "SaaS Dashboard",
      description: "Analytics dashboard for business intelligence",
      project_type: "web",
      created_at: "2024-01-10T09:15:00Z",
      updated_at: "2024-01-18T16:20:00Z",
      is_active: true,
      wireframes_count: 8,
      collaborators: 2
    },
    {
      id: 3,
      name: "Healthcare Portal",
      description: "Patient management system interface",
      project_type: "web",
      created_at: "2024-01-05T11:00:00Z",
      updated_at: "2024-01-15T13:30:00Z",
      is_active: false,
      wireframes_count: 15,
      collaborators: 5
    }
  ];

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
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/projects/${project.id}/wireframes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let wireframeData = null;
      if (response.ok) {
        wireframeData = await response.json();
      } else {
        // Create mock wireframe data for demo
        wireframeData = [{
          id: 1,
          name: `${project.name} Wireframe`,
          pages: [{
            id: 1,
            name: 'Main Page',
            components: [
              {
                id: Date.now(),
                type: 'navigation',
                x: 50,
                y: 20,
                width: 400,
                height: 60,
                text: 'Home | About | Services | Contact',
                fill: '#1f2937',
                textColor: '#ffffff',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'medium',
                borderColor: '#d1d5db',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: Date.now() + 1,
                type: 'text',
                x: 50,
                y: 120,
                width: 300,
                height: 40,
                text: `Welcome to ${project.name}`,
                fill: 'transparent',
                textColor: '#374151',
                fontSize: 24,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                borderColor: '#d1d5db',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: Date.now() + 2,
                type: 'button',
                x: 50,
                y: 200,
                width: 120,
                height: 40,
                text: 'Get Started',
                fill: '#3b82f6',
                textColor: '#ffffff',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                borderColor: '#d1d5db',
                borderWidth: 0,
                borderRadius: 8,
                opacity: 1
              }
            ]
          }]
        }];
      }

      // Navigate to workspace with project data
      navigate(`/workspace/${project.name.toLowerCase().replace(/\s+/g, '-')}`, {
        state: {
          projectId: project.id,
          projectData: project,
          wireframeData: wireframeData,
          quickLoad: true
        }
      });
    } catch (error) {
      console.error('Error loading project:', error);
      // Navigate with mock data
      navigate(`/workspace/${project.name.toLowerCase().replace(/\s+/g, '-')}`, {
        state: {
          projectId: project.id,
          projectData: project,
          wireframeData: [{
            id: 1,
            name: `${project.name} Wireframe`,
            pages: [{
              id: 1,
              name: 'Main Page',
              components: []
            }]
          }],
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
