import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Mail, Github, Linkedin, Twitter, MapPin, 
  Calendar, Award, Star, Users, Code, Palette, Brain,
  Zap, Heart, Coffee, Rocket, Sparkles, Plus, Search
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { BackgroundLines } from '../components/ui/background-lines';
import { HoverEffect } from '../components/ui/card-hover-effect';
import { FlipWords } from '../components/ui/flip-words';
import { ColourfulText } from '../components/ui/colourful-text';

const Team = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Animated words for the header
  const descriptiveWords = ["innovative", "creative", "passionate", "dedicated", "talented"];

  // Team members data
  const teamMembers = [
    {
      id: 1,
      name: "Srikrishna",
      role: "Full Stack Developer",
      department: "Engineering",
      avatar: "👨‍💻",
      bio: "Passionate full-stack developer with expertise in React, Node.js, and cloud technologies. Loves building scalable applications and mentoring junior developers.",
      location: "San Francisco, CA",
      joinDate: "2023-01-15",
      email: "srikrishna@uiflow.com",
      skills: ["React", "Node.js", "TypeScript", "AWS", "Docker", "GraphQL"],
      achievements: ["Tech Lead of the Year", "Innovation Award 2023"],
      socialLinks: {
        github: "https://github.com/srikrishna",
        linkedin: "https://linkedin.com/in/srikrishna",
        twitter: "https://twitter.com/srikrishna"
      },
      stats: {
        projects: 24,
        commits: 1250,
        reviews: 89
      },
      gradient: "from-blue-500 to-cyan-500",
      specialty: "Frontend Architecture"
    },
    {
      id: 2,
      name: "Ashish",
      role: "Python Developer",
      department: "Backend",
      avatar: "🐍",
      bio: "Backend specialist focused on Python, Django, and machine learning integrations. Expert in API design and database optimization.",
      location: "Austin, TX",
      joinDate: "2023-03-20",
      email: "ashish@uiflow.com",
      skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Redis", "ML"],
      achievements: ["Backend Excellence Award", "Performance Optimization Champion"],
      socialLinks: {
        github: "https://github.com/ashish",
        linkedin: "https://linkedin.com/in/ashish"
      },
      stats: {
        projects: 18,
        commits: 890,
        reviews: 67
      },
      gradient: "from-green-500 to-emerald-500",
      specialty: "API Architecture"
    },
    {
      id: 3,
      name: "Yashwani",
      role: "AI/ML Engineer",
      department: "AI Research",
      avatar: "🤖",
      bio: "AI/ML engineer specializing in deep learning, computer vision, and natural language processing. Passionate about ethical AI development.",
      location: "Seattle, WA",
      joinDate: "2023-02-10",
      email: "yashwani@uiflow.com",
      skills: ["Python", "TensorFlow", "PyTorch", "OpenCV", "NLP", "MLOps"],
      achievements: ["AI Innovation Award", "Research Paper Published"],
      socialLinks: {
        github: "https://github.com/yashwani",
        linkedin: "https://linkedin.com/in/yashwani",
        twitter: "https://twitter.com/yashwani"
      },
      stats: {
        projects: 15,
        commits: 670,
        reviews: 45
      },
      gradient: "from-purple-500 to-pink-500",
      specialty: "Machine Learning"
    },
    {
      id: 4,
      name: "Vedasri",
      role: "UI/UX Designer",
      department: "Design",
      avatar: "🎨",
      bio: "Creative UI/UX designer with a passion for user-centered design and accessibility. Expert in design systems and user research.",
      location: "New York, NY",
      joinDate: "2023-04-05",
      email: "vedasri@uiflow.com",
      skills: ["Figma", "Adobe XD", "Sketch", "Prototyping", "User Research", "Design Systems"],
      achievements: ["Design Excellence Award", "UX Innovation Prize"],
      socialLinks: {
        linkedin: "https://linkedin.com/in/vedasri",
        twitter: "https://twitter.com/vedasri"
      },
      stats: {
        projects: 32,
        designs: 156,
        prototypes: 78
      },
      gradient: "from-orange-500 to-red-500",
      specialty: "User Experience"
    }
  ];

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = filterRole === 'all' || member.department.toLowerCase().includes(filterRole.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const roles = ['all', 'engineering', 'backend', 'ai research', 'design'];

  const TeamMemberCard = ({ member }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -10, scale: 1.02 }}
      onClick={() => setSelectedMember(member)}
      className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${member.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
      
      {/* Avatar Section */}
      <div className="relative z-10 flex flex-col items-center mb-6">
        <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${member.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
          {member.avatar}
        </div>
        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
          {member.name}
        </h3>
        <p className="text-blue-400 font-medium">{member.role}</p>
        <p className="text-white/60 text-sm">{member.department}</p>
      </div>

      {/* Skills Preview */}
      <div className="relative z-10 mb-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {member.skills.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-white/5 text-white/70 text-xs rounded-full border border-white/10"
            >
              {skill}
            </span>
          ))}
          {member.skills.length > 3 && (
            <span className="px-2 py-1 bg-white/5 text-white/70 text-xs rounded-full border border-white/10">
              +{member.skills.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-white">{member.stats.projects || member.stats.designs || 0}</div>
          <div className="text-xs text-white/60">{member.stats.designs ? 'Designs' : 'Projects'}</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">{member.stats.commits || member.stats.prototypes || 0}</div>
          <div className="text-xs text-white/60">{member.stats.prototypes ? 'Prototypes' : 'Commits'}</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">{member.stats.reviews || 0}</div>
          <div className="text-xs text-white/60">Reviews</div>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${member.gradient} flex items-center justify-center`}>
          <span className="text-white text-xs">→</span>
        </div>
      </div>
    </motion.div>
  );

  const MemberModal = ({ member, onClose }) => (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${member.gradient} flex items-center justify-center text-2xl`}>
                {member.avatar}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{member.name}</h2>
                <p className="text-blue-400 font-medium">{member.role}</p>
                <p className="text-white/60">{member.specialty}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">About</h3>
            <p className="text-white/70 leading-relaxed">{member.bio}</p>
          </div>

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
              <div className="space-y-2">
                <div className="flex items-center text-white/70">
                  <MapPin className="w-4 h-4 mr-2" />
                  {member.location}
                </div>
                <div className="flex items-center text-white/70">
                  <Calendar className="w-4 h-4 mr-2" />
                  Joined {new Date(member.joinDate).toLocaleDateString()}
                </div>
                <div className="flex items-center text-white/70">
                  <Mail className="w-4 h-4 mr-2" />
                  {member.email}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Achievements</h3>
              <div className="space-y-2">
                {member.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center text-white/70">
                    <Award className="w-4 h-4 mr-2 text-yellow-400" />
                    {achievement}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Skills & Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {member.skills.map((skill, index) => (
                <motion.span
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className={`px-3 py-1 bg-gradient-to-r ${member.gradient} text-white text-sm rounded-full font-medium`}
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-4">
            {member.socialLinks.github && (
              <a
                href={member.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <Github className="w-5 h-5" />
              </a>
            )}
            {member.socialLinks.linkedin && (
              <a
                href={member.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
            {member.socialLinks.twitter && (
              <a
                href={member.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <Twitter className="w-5 h-5" />
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <BackgroundLines className="min-h-screen bg-black">
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <div className="flex items-center space-x-4 mb-2">
                    <Users className="w-8 h-8 text-blue-400" />
                    <ColourfulText text="Meet Our Team" className="text-4xl font-bold" />
                  </div>
                  <div className="flex items-center space-x-2 text-white/60">
                    <span>We are a</span>
                    <FlipWords words={descriptiveWords} className="text-blue-400 font-semibold" />
                    <span>team building the future of design</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Team Members", value: teamMembers.length, icon: Users, color: "from-blue-500 to-cyan-500" },
              { label: "Total Projects", value: "89", icon: Rocket, color: "from-green-500 to-emerald-500" },
              { label: "Code Commits", value: "2.8k", icon: Code, color: "from-purple-500 to-pink-500" },
              { label: "Coffee Consumed", value: "∞", icon: Coffee, color: "from-orange-500 to-red-500" }
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/60 text-sm">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filterRole === role
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMembers.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>

          {/* Empty State */}
          {filteredMembers.length === 0 && (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No team members found</h3>
              <p className="text-white/60">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {/* Member Modal */}
        {selectedMember && (
          <MemberModal
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </div>
    </BackgroundLines>
  );
};

export default Team;
