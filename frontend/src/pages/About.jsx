import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Target, Zap, Heart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import ColourfulText from '../components/ui/colourful-text';
import { FlipWords } from '../components/ui/flip-words';

export default function About() {
  const team = [
    {
      name: "Srikrishna",
      role: "Full Stack Developer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      bio: "Expert full-stack developer building scalable web applications and robust backend systems"
    },
    {
      name: "Ashish",
      role: "Python Developer", 
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      bio: "Python specialist focused on backend development, APIs, and data processing systems"
    },
    {
      name: "Yashwani",
      role: "AI/ML Engineer",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      bio: "AI/ML engineer specializing in machine learning models and intelligent automation systems"
    },
    {
      name: "Vedasri",
      role: "UI/UX Designer",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      bio: "Creative UI/UX designer crafting beautiful and intuitive user experiences"
    }
  ];

  const values = [
    {
      icon: Users,
      title: "User-Centric",
      description: "Every feature we build starts with understanding our users' needs and pain points"
    },
    {
      icon: Target,
      title: "Quality First",
      description: "We believe in shipping polished, well-tested features that users can rely on"
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We're constantly pushing the boundaries of what's possible in design tooling"
    },
    {
      icon: Heart,
      title: "Passion",
      description: "We're genuinely excited about empowering creators to build amazing experiences"
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"></div>
            <span className="text-xl font-bold text-white">UIFlow</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/features" className="text-white/80 hover:text-white transition-colors">Features</Link>
            <Link to="/about" className="text-purple-400 font-medium">About</Link>
            <Link to="/contact" className="text-white/80 hover:text-white transition-colors">Contact</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-white">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with ColourfulText */}
      <section className="h-screen w-full flex items-center justify-center relative overflow-hidden">
        <motion.img
          src="https://assets.aceternity.com/linear-demo.webp"
          className="h-full w-full object-cover absolute inset-0 opacity-30 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1 }}
        />
        <div className="relative z-10 text-center px-6">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-2xl md:text-5xl lg:text-7xl font-bold text-center text-white relative z-2 font-sans">
            The best <ColourfulText text="components" /> <br /> you will ever find
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto mt-8">
            We're on a mission to democratize design and make it possible for anyone to create beautiful, functional user interfaces.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-8">Our Story</h2>
            <div className="space-y-6 text-lg text-white/80 text-left">
              <p>
                UIFlow was born out of frustration with existing design tools. As designers and developers ourselves, 
                we experienced firsthand the disconnect between design and development, the time wasted on repetitive 
                tasks, and the barriers that prevented great ideas from becoming reality.
              </p>
              <p>
                In 2023, we set out to build something different. A tool that would bridge the gap between design 
                and code, leverage AI to accelerate workflows, and make professional-quality design accessible to 
                everyone - not just those with years of training.
              </p>
              <p>
                Today, UIFlow is used by thousands of designers, developers, and product teams around the world to 
                create better user experiences faster than ever before. But we're just getting started.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Our Values</h2>
            <p className="text-xl text-white/80">The principles that guide everything we do</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="text-center h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
                    <p className="text-white/70">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="text-4xl font-bold text-white mb-4">
              Meet Our <FlipWords words={["talented", "creative", "innovative", "passionate"]} /> Team
            </div>
            <p className="text-xl text-white/80">The passionate people behind UIFlow</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="text-center">
                  <CardContent className="p-6">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                    />
                    <h3 className="text-xl font-semibold text-white mb-1">{member.name}</h3>
                    <p className="text-primary-400 font-medium mb-3">{member.role}</p>
                    <p className="text-white/70 text-sm">{member.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Join Us on This Journey
            </h2>
            <p className="text-xl text-white/80 mb-8">
              We're always looking for talented people who share our vision. Come help us build the future of design.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500">Get in Touch</Button>
              <Button variant="secondary" size="lg" className="border-gray-600 text-white hover:bg-gray-800">Try UIFlow Free</Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 w-full">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 3L4 14h7v7l9-11h-7V3z"/>
                  </svg>
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
}
