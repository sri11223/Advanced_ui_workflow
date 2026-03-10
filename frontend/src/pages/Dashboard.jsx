import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Share,
  Copy,
  User,
  Settings,
  LogOut,
  Bell,
  Folder,
  Clock,
  Star,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { BackgroundLines } from "../components/ui/background-lines";
import { HoverEffect } from "../components/ui/card-hover-effect";
import useAuthStore from "../store/authStore";

export default function Dashboard() {
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ totalProjects: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [projectsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`, { headers }),
        fetch(`${API_BASE_URL}/user/stats`, { headers }),
      ]);

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build recent activity from actual projects
  const recentActivity = projects
    .slice(0, 4)
    .map((p) => ({
      action: p.status === 'completed' ? 'Completed' : 'Updated',
      project: p.name,
      time: new Date(p.updated_at || p.created_at).toLocaleDateString(),
    }));

  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-500";
      case "Review":
        return "bg-yellow-500";
      case "Completed":
        return "bg-green-500";
      case "Planning":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <BackgroundLines className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md bg-black/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"></div>
                <span className="text-xl font-bold text-white">UIFlow</span>
              </Link>
              <div className="hidden md:flex items-center space-x-6 ml-8">
                <Link
                  to="/dashboard"
                  className="text-blue-400 font-medium px-3 py-2 rounded-lg bg-blue-500/10"
                >
                  Dashboard
                </Link>
                <Link
                  to="/projects"
                  className="text-white/60 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                >
                  Projects
                </Link>
                <Link
                  to="/templates"
                  className="text-white/60 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                >
                  Templates
                </Link>
                <Link
                  to="/chat"
                  className="text-white/60 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.09 0 2.09-.18 3.04-.52l4.52 1.52c.25.08.52 0 .7-.22.18-.22.18-.52 0-.74L18.48 19.5C20.38 17.69 22 15.24 22 12.5c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8c0 2.03-.76 3.89-2.01 5.31l1.46 2.46-2.46-1.46C16.89 19.24 14.53 20 12 20z"/>
                  </svg>
                  <span>Figma Chat</span>
                </Link>
                <Link
                  to="/team"
                  className="text-white/60 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                >
                  Team
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-white/10"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden md:block text-white font-medium">
                    {user?.full_name || user?.name || "User"}
                  </span>
                </Button>

                {/* Enhanced Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-black/90 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <div className="p-3">
                    <div className="px-3 py-2 border-b border-white/10 mb-2">
                      <p className="text-white font-medium">
                        {user?.full_name || user?.name || "User"}
                      </p>
                      <p className="text-white/60 text-sm">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center space-x-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center space-x-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    <div className="border-t border-white/10 mt-2 pt-2">
                      <button
                        onClick={logout}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-20 pt-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 mb-12"
          >
            <h1 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-900 to-neutral-700 dark:from-neutral-600 dark:to-white text-4xl md:text-6xl lg:text-7xl font-sans py-2 md:py-10 relative z-20 font-bold tracking-tight">
              Welcome back, <br /> {user?.full_name || user?.name || "User"}! 👋
            </h1>
            <p className="max-w-xl mx-auto text-lg md:text-xl text-neutral-700 dark:text-neutral-400 text-center">
              Ready to create something amazing today? Let's build the future of
              UI/UX design together.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          >
            {[
              {
                label: "Total Projects",
                value: stats.totalProjects.toString(),
                icon: Folder,
                color: "from-blue-500 to-cyan-500",
              },
              {
                label: "In Progress",
                value: stats.inProgress.toString(),
                icon: Clock,
                color: "from-yellow-500 to-orange-500",
              },
              {
                label: "Completed",
                value: stats.completed.toString(),
                icon: Star,
                color: "from-green-500 to-emerald-500",
              },
              {
                label: "Wireframes",
                value: projects.length > 0 ? projects.length.toString() : "0",
                icon: User,
                color: "from-purple-500 to-pink-500",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm font-medium">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-bold text-white mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}
                      >
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Projects Section */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Your Projects
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="h-8"
                      >
                        <Grid className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="h-8"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button 
                      onClick={() => navigate('/workspace/new-project')}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/5 border border-white/20"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>

                {/* Projects Grid with Hover Effect */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white/60">Loading projects...</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                      <Folder className="w-16 h-16 text-white/20 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                      <p className="text-white/60 mb-6">Create your first project to get started with AI wireframe generation</p>
                      <Button 
                        onClick={() => navigate('/workspace/new-project')}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Project
                      </Button>
                    </div>
                  ) : (
                    <HoverEffect
                      items={projects.map((project) => ({
                        title: project.name,
                        description: project.description || '',
                        link: `/workspace/${project.id}`,
                        status: project.status || 'draft',
                        lastModified: project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '',
                      }))}
                      className={
                        viewMode === "grid"
                          ? "grid-cols-1 md:grid-cols-2"
                          : "grid-cols-1"
                      }
                    />
                  )}
                </motion.div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.length === 0 ? (
                        <p className="text-white/40 text-sm text-center py-4">No recent activity yet</p>
                      ) : (
                        recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">
                              <span className="font-medium">
                                {activity.action}
                              </span>{" "}
                              in{" "}
                              <span className="text-blue-400">
                                {activity.project}
                              </span>
                            </p>
                            <p className="text-white/60 text-xs">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                      ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        onClick={() => navigate('/workspace/new-project')}
                        className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/20" 
                        variant="ghost"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Project
                      </Button>
                      <Button className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/20" variant="ghost">
                        <Copy className="w-4 h-4 mr-2" />
                        Import Design
                      </Button>
                      <Button
                        className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/20"
                        variant="ghost"
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Invite Team Member
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundLines>
  );
}
