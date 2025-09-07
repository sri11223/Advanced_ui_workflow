import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Search, Filter, Grid, List, Star, Download, 
  Eye, Zap, Smartphone, Monitor, Tablet, Globe, ShoppingCart,
  Users, BarChart3, FileText, Calendar, MessageSquare, Settings,
  Heart, Bookmark, Play, Sparkles
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { BackgroundLines } from '../components/ui/background-lines';

const Templates = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [hoveredTemplate, setHoveredTemplate] = useState(null);

  // Template categories
  const categories = [
    { id: 'all', name: 'All Templates', icon: Grid },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart },
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'landing', name: 'Landing Page', icon: Globe },
    { id: 'mobile', name: 'Mobile App', icon: Smartphone },
    { id: 'social', name: 'Social Media', icon: Users },
    { id: 'blog', name: 'Blog & News', icon: FileText },
    { id: 'portfolio', name: 'Portfolio', icon: Star }
  ];

  // Pre-designed templates with wireframe data
  const templates = [
    {
      id: 1,
      name: 'E-commerce Store',
      description: 'Complete online store with product catalog, cart, and checkout',
      category: 'ecommerce',
      difficulty: 'Advanced',
      components: 25,
      pages: 6,
      rating: 4.9,
      downloads: 1240,
      preview: '🛒',
      tags: ['Shopping', 'Products', 'Payment'],
      wireframeData: {
        id: 1,
        name: 'E-commerce Store Template',
        pages: [
          {
            id: 1,
            name: 'Homepage',
            components: [
              {
                id: 1,
                type: 'navigation',
                x: 0,
                y: 0,
                width: 800,
                height: 60,
                text: 'Logo | Home | Products | Cart | Account',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'medium',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 2,
                type: 'text',
                x: 50,
                y: 100,
                width: 400,
                height: 60,
                text: 'Welcome to Our Store\nDiscover Amazing Products',
                fill: 'transparent',
                textColor: '#111827',
                fontSize: 32,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 3,
                type: 'container',
                x: 50,
                y: 200,
                width: 700,
                height: 300,
                text: 'Featured Products Grid',
                fill: '#f9fafb',
                textColor: '#6b7280',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 8,
                opacity: 1
              }
            ]
          }
        ]
      }
    },
    {
      id: 2,
      name: 'Analytics Dashboard',
      description: 'Modern dashboard with charts, metrics, and data visualization',
      category: 'dashboard',
      difficulty: 'Intermediate',
      components: 18,
      pages: 4,
      rating: 4.8,
      downloads: 890,
      preview: '📊',
      tags: ['Analytics', 'Charts', 'Metrics'],
      wireframeData: {
        id: 2,
        name: 'Analytics Dashboard Template',
        pages: [
          {
            id: 1,
            name: 'Dashboard',
            components: [
              {
                id: 1,
                type: 'navigation',
                x: 0,
                y: 0,
                width: 800,
                height: 60,
                text: 'Dashboard | Analytics | Reports | Settings',
                fill: '#1f2937',
                textColor: '#ffffff',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'medium',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 2,
                type: 'chart',
                x: 50,
                y: 100,
                width: 350,
                height: 200,
                text: '📈 Revenue Chart',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 8,
                opacity: 1
              },
              {
                id: 3,
                type: 'chart',
                x: 420,
                y: 100,
                width: 330,
                height: 200,
                text: '📊 User Analytics',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 8,
                opacity: 1
              }
            ]
          }
        ]
      }
    },
    {
      id: 3,
      name: 'Landing Page Pro',
      description: 'High-converting landing page with hero section and CTA',
      category: 'landing',
      difficulty: 'Beginner',
      components: 12,
      pages: 1,
      rating: 4.7,
      downloads: 2100,
      preview: '🚀',
      tags: ['Marketing', 'CTA', 'Hero'],
      wireframeData: {
        id: 3,
        name: 'Landing Page Pro Template',
        pages: [
          {
            id: 1,
            name: 'Landing Page',
            components: [
              {
                id: 1,
                type: 'navigation',
                x: 0,
                y: 0,
                width: 800,
                height: 60,
                text: 'Logo | Features | Pricing | Contact',
                fill: 'transparent',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'medium',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 2,
                type: 'text',
                x: 100,
                y: 120,
                width: 600,
                height: 80,
                text: 'Transform Your Business\nwith Our Amazing Product',
                fill: 'transparent',
                textColor: '#111827',
                fontSize: 36,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 3,
                type: 'button',
                x: 350,
                y: 220,
                width: 150,
                height: 50,
                text: 'Get Started Now',
                fill: '#3b82f6',
                textColor: '#ffffff',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                borderWidth: 0,
                borderRadius: 8,
                opacity: 1
              }
            ]
          }
        ]
      }
    },
    {
      id: 4,
      name: 'Mobile App UI',
      description: 'Complete mobile app interface with navigation and screens',
      category: 'mobile',
      difficulty: 'Advanced',
      components: 30,
      pages: 8,
      rating: 4.9,
      downloads: 756,
      preview: '📱',
      tags: ['Mobile', 'iOS', 'Android'],
      wireframeData: {
        id: 4,
        name: 'Mobile App UI Template',
        pages: [
          {
            id: 1,
            name: 'Home Screen',
            components: [
              {
                id: 1,
                type: 'container',
                x: 50,
                y: 50,
                width: 300,
                height: 500,
                text: 'Mobile App Container',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                borderColor: '#d1d5db',
                borderWidth: 2,
                borderRadius: 20,
                opacity: 1
              },
              {
                id: 2,
                type: 'navigation',
                x: 60,
                y: 60,
                width: 280,
                height: 40,
                text: '← Back | Title | Menu',
                fill: '#f9fafb',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'medium',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              }
            ]
          }
        ]
      }
    },
    {
      id: 5,
      name: 'Social Media App',
      description: 'Social networking app with feeds, profiles, and messaging',
      category: 'social',
      difficulty: 'Advanced',
      components: 35,
      pages: 10,
      rating: 4.6,
      downloads: 623,
      preview: '👥',
      tags: ['Social', 'Feed', 'Chat'],
      wireframeData: {
        id: 5,
        name: 'Social Media App Template',
        pages: [
          {
            id: 1,
            name: 'Feed',
            components: [
              {
                id: 1,
                type: 'navigation',
                x: 0,
                y: 0,
                width: 800,
                height: 60,
                text: 'Feed | Discover | Messages | Profile',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'medium',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 2,
                type: 'card',
                x: 100,
                y: 100,
                width: 600,
                height: 200,
                text: 'Social Media Post\n\nUser posted an update...\n\n❤️ 24 likes | 💬 5 comments',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 12,
                opacity: 1
              }
            ]
          }
        ]
      }
    },
    {
      id: 6,
      name: 'Blog & News Site',
      description: 'Modern blog layout with articles, sidebar, and navigation',
      category: 'blog',
      difficulty: 'Intermediate',
      components: 20,
      pages: 5,
      rating: 4.5,
      downloads: 1100,
      preview: '📰',
      tags: ['Blog', 'Articles', 'CMS'],
      wireframeData: {
        id: 6,
        name: 'Blog & News Site Template',
        pages: [
          {
            id: 1,
            name: 'Blog Home',
            components: [
              {
                id: 1,
                type: 'navigation',
                x: 0,
                y: 0,
                width: 800,
                height: 60,
                text: 'Blog | Categories | About | Contact',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'medium',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 2,
                type: 'text',
                x: 50,
                y: 100,
                width: 500,
                height: 60,
                text: 'Latest Articles\nStay updated with our blog',
                fill: 'transparent',
                textColor: '#111827',
                fontSize: 28,
                fontFamily: 'Arial',
                fontWeight: 'bold',
                borderWidth: 0,
                borderRadius: 0,
                opacity: 1
              },
              {
                id: 3,
                type: 'card',
                x: 50,
                y: 200,
                width: 500,
                height: 150,
                text: 'Featured Article\n\nThis is a preview of the latest blog post with engaging content...\n\nRead More →',
                fill: '#ffffff',
                textColor: '#374151',
                fontSize: 14,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 8,
                opacity: 1
              }
            ]
          }
        ]
      }
    }
  ];

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-400 bg-green-400/10';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-400/10';
      case 'Advanced': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const handleUseTemplate = (template) => {
    // Navigate to workspace with template data
    navigate(`/workspace/new-project-${Date.now()}`, {
      state: {
        templateData: template,
        wireframeData: [template.wireframeData],
        quickLoad: true,
        isTemplate: true
      }
    });
  };

  const TemplateCard = ({ template }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setHoveredTemplate(template.id)}
      onHoverEnd={() => setHoveredTemplate(null)}
      className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300"
    >
      {/* Preview Section */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        <div className="text-6xl opacity-80">{template.preview}</div>
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
            {template.difficulty}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center space-x-4 text-white/60 text-xs">
          <span className="flex items-center">
            <Grid className="w-3 h-3 mr-1" />
            {template.components} components
          </span>
          <span className="flex items-center">
            <FileText className="w-3 h-3 mr-1" />
            {template.pages} pages
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
            {template.name}
          </h3>
          <div className="flex items-center text-yellow-400 text-sm">
            <Star className="w-4 h-4 mr-1 fill-current" />
            {template.rating}
          </div>
        </div>

        <p className="text-white/60 text-sm mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-white/5 text-white/60 text-xs rounded-full border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-white/40 mb-4">
          <span className="flex items-center">
            <Download className="w-3 h-3 mr-1" />
            {template.downloads.toLocaleString()} downloads
          </span>
          <span className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            Popular
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleUseTemplate(template)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
          >
            <Zap className="w-4 h-4" />
            <span>Use Template</span>
          </button>
          <button className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors">
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hover Effect */}
      {hoveredTemplate === template.id && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none"
        />
      )}
    </motion.div>
  );

  return (
    <BackgroundLines className="min-h-screen bg-black">
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center">
                    <Sparkles className="w-8 h-8 mr-3 text-blue-400" />
                    Templates
                  </h1>
                  <p className="text-white/60 text-sm">Choose from professionally designed wireframe templates</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4 mb-8 overflow-x-auto pb-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-white/60 text-sm">
                {filteredTemplates.length} templates
              </span>
            </div>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No templates found</h3>
              <p className="text-white/60">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </div>
      </div>
    </BackgroundLines>
  );
};

export default Templates;
