import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Users, Star, Menu, X, CheckCircle, Sparkles, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { SparklesHero } from '../components/SparklesHero';
import { MeteorsCard } from '../components/MeteorsCard';
import { AnimatedTestimonialsDemo } from '../components/AnimatedTestimonialsDemo';
import { TextGenerateEffectDemo } from '../components/TextGenerateEffectDemo';

const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Build wireframes and prototypes in minutes, not hours. Our AI-powered tools accelerate your entire design process."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with end-to-end encryption. Your designs and data are always protected."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Real-time collaboration tools that keep your entire team in sync across all projects."
    },
    {
      icon: Sparkles,
      title: "AI-Powered Design",
      description: "Smart suggestions and automated layouts that help you create better designs faster."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Lead Designer at TechCorp",
      content: "UIFlow transformed our design process. We're shipping features 3x faster now.",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "Product Manager",
      content: "The collaboration features are incredible. Our whole team stays aligned effortlessly.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "UX Manager",
      content: "Perfect for rapid prototyping. Our clients love the interactive demos we create.",
      rating: 5
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Users" },
    { number: "1M+", label: "Projects Created" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">UIFlow</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link to="/features" className="text-white/80 hover:text-white font-medium transition-colors">
                Features
              </Link>
              <Link to="/about" className="text-white/80 hover:text-white font-medium transition-colors">
                About
              </Link>
              <Link to="/contact" className="text-white/80 hover:text-white font-medium transition-colors">
                Contact
              </Link>
            </div>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link to="/login">
                <Button variant="secondary">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button className="btn-primary">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden py-4 border-t border-white/20"
            >
              <div className="flex flex-col space-y-4">
                <Link to="/features" className="text-white/80 hover:text-white font-medium">
                  Features
                </Link>
                <Link to="/about" className="text-white/80 hover:text-white font-medium">
                  About
                </Link>
                <Link to="/contact" className="text-white/80 hover:text-white font-medium">
                  Contact
                </Link>
                <div className="flex flex-col space-y-2 pt-4">
                  <Link to="/login">
                    <Button variant="secondary" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="btn-primary w-full">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Sparkles Hero Section */}
      <SparklesHero />

      {/* Features Section */}
      <section className="py-20 w-full relative bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              Why Choose UIFlow?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-white/80 max-w-2xl mx-auto"
            >
              Powerful features designed to accelerate your design workflow and bring your ideas to life faster than ever.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <MeteorsCard
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  buttonText="Learn More"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 w-full">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              Loved by Design Teams
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-white/80 max-w-2xl mx-auto"
            >
              See what industry professionals are saying about UIFlow
            </motion.p>
          </div>

          <AnimatedTestimonialsDemo />
        </div>
      </section>

      {/* Text Generate Effect Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 w-full">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <TextGenerateEffectDemo />
          </motion.div>
        </div>
      </section>

      

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 w-full">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">UIFlow</span>
              </div>
              <p className="text-gray-400 max-w-md leading-relaxed">
                Building the future of UI design workflows. Empowering teams to create amazing digital experiences faster than ever before.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-lg">Product</h3>
              <div className="space-y-3">
                <Link to="/features" className="block text-gray-400 hover:text-white transition-colors">Features</Link>
                <Link to="/about" className="block text-gray-400 hover:text-white transition-colors">About</Link>
                <Link to="/contact" className="block text-gray-400 hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-lg">Company</h3>
              <div className="space-y-3">
                <Link to="/about" className="block text-gray-400 hover:text-white transition-colors">About Us</Link>
                <Link to="/contact" className="block text-gray-400 hover:text-white transition-colors">Contact</Link>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 UIFlow. All rights reserved. Built with ❤️ for designers everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
