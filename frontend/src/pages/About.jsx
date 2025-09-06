import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Target, Zap, Heart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

export default function About() {
  const team = [
    {
      name: "Alex Chen",
      role: "CEO & Co-founder",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      bio: "Former design lead at Google, passionate about democratizing design tools"
    },
    {
      name: "Sarah Kim",
      role: "CTO & Co-founder", 
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      bio: "Ex-Facebook engineer, expert in AI and machine learning applications"
    },
    {
      name: "Marcus Johnson",
      role: "Head of Design",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      bio: "Award-winning designer with 10+ years at top design agencies"
    },
    {
      name: "Emily Rodriguez",
      role: "VP of Engineering",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      bio: "Full-stack engineer passionate about developer experience and tooling"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg"></div>
            <span className="text-xl font-bold text-white">UIFlow</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/features" className="text-white/80 hover:text-white transition-colors">Features</Link>
            <Link to="/pricing" className="text-white/80 hover:text-white transition-colors">Pricing</Link>
            <Link to="/about" className="text-primary-400 font-medium">About</Link>
            <Link to="/contact" className="text-white/80 hover:text-white transition-colors">Contact</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Building the Future of{' '}
              <span className="gradient-text">Design Tools</span>
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              We're on a mission to democratize design and make it possible for anyone to create beautiful, functional user interfaces.
            </p>
          </motion.div>
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
            <h2 className="text-4xl font-bold text-white mb-4">Meet Our Team</h2>
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
              <Link to="/contact">
                <Button size="lg">Get in Touch</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="lg">Try UIFlow Free</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
