import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Palette, Code, Users, Brain, Layers, Globe, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Design",
      description: "Generate wireframes and prototypes using advanced AI that understands UX principles",
      details: ["Smart component suggestions", "Auto-layout optimization", "Design pattern recognition"]
    },
    {
      icon: Zap,
      title: "Lightning Fast Workflow",
      description: "Build complete interfaces in minutes with our streamlined design process",
      details: ["Drag & drop interface", "Real-time preview", "Instant code generation"]
    },
    {
      icon: Code,
      title: "Export Ready Code",
      description: "Generate production-ready React, Vue, or HTML/CSS code from your designs",
      details: ["Clean, semantic code", "Responsive by default", "Framework agnostic"]
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work together in real-time with advanced collaboration features",
      details: ["Live cursors", "Comment system", "Version control"]
    },
    {
      icon: Palette,
      title: "Design System Integration",
      description: "Build and maintain consistent design systems across your projects",
      details: ["Component library", "Design tokens", "Style guide generation"]
    },
    {
      icon: Layers,
      title: "Advanced Prototyping",
      description: "Create interactive prototypes with animations and micro-interactions",
      details: ["Animation timeline", "Gesture support", "State management"]
    },
    {
      icon: Globe,
      title: "Multi-Platform Export",
      description: "Export to web, mobile, and desktop platforms with optimized code",
      details: ["React Native support", "PWA generation", "Desktop app export"]
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with SOC 2 compliance and data encryption",
      details: ["End-to-end encryption", "SSO integration", "Audit logs"]
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
            <Link to="/features" className="text-primary-400 font-medium">Features</Link>
            <Link to="/pricing" className="text-white/80 hover:text-white transition-colors">Pricing</Link>
            <Link to="/about" className="text-white/80 hover:text-white transition-colors">About</Link>
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
              Powerful Features for{' '}
              <span className="gradient-text">Modern Design</span>
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Everything you need to design, prototype, and ship beautiful user interfaces faster than ever before
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:scale-105 transition-transform duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.details.map((detail, i) => (
                        <li key={i} className="text-sm text-white/60 flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary-400 rounded-full mr-2"></div>
                          {detail}
                        </li>
                      ))}
                    </ul>
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
              Ready to experience the future of design?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of designers and developers who are building faster with UIFlow
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg">Start Free Trial</Button>
              </Link>
              <Link to="/pricing">
                <Button variant="secondary" size="lg">View Pricing</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
