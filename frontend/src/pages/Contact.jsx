import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export default function Contact() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data) => {
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Message sent successfully! We\'ll get back to you soon.');
    reset();
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      details: "hello@uiflow.com",
      description: "Send us an email anytime"
    },
    {
      icon: Phone,
      title: "Phone",
      details: "+1 (555) 123-4567",
      description: "Mon-Fri from 8am to 6pm"
    },
    {
      icon: MapPin,
      title: "Office",
      details: "San Francisco, CA",
      description: "Come say hello at our HQ"
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
            <Link to="/about" className="text-white/80 hover:text-white transition-colors">About</Link>
            <Link to="/contact" className="text-purple-400 font-medium">Contact</Link>
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
              Get in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Touch</span>
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Have questions about UIFlow? Want to partner with us? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-6 py-10 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Send us a message</CardTitle>
                  <p className="text-white/70">
                    Fill out the form below and we'll get back to you as soon as possible.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        {...register('name')}
                        label="Name"
                        error={errors.name?.message}
                        placeholder="Your name"
                      />
                      <Input
                        {...register('email')}
                        type="email"
                        label="Email"
                        error={errors.email?.message}
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <Input
                      {...register('subject')}
                      label="Subject"
                      error={errors.subject?.message}
                      placeholder="What's this about?"
                    />
                    
                    <div className="relative">
                      <label className="floating-label">Message</label>
                      <textarea
                        {...register('message')}
                        className="input-field min-h-[120px] resize-none"
                        placeholder="Tell us more..."
                      />
                      {errors.message && (
                        <p className="mt-2 text-sm text-red-400">{errors.message.message}</p>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full group bg-gradient-to-r from-purple-500 to-pink-500">
                      Send Message
                      <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Let's start a conversation
                </h2>
                <p className="text-white/70 text-lg">
                  We're here to help and answer any question you might have. 
                  We look forward to hearing from you.
                </p>
              </div>

              <div className="space-y-4">
                {contactInfo.map((info, index) => (
                  <motion.div
                    key={info.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <info.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-white mb-1">{info.title}</h3>
                            <p className="text-purple-400 font-medium mb-1 text-sm">{info.details}</p>
                            <p className="text-white/60 text-xs">{info.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-base font-semibold text-white mb-3">
                    Frequently Asked Questions
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-white font-medium mb-1 text-sm">How quickly do you respond?</h4>
                      <p className="text-white/60 text-xs">We typically respond within 24 hours during business days.</p>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-1 text-sm">Do you offer custom solutions?</h4>
                      <p className="text-white/60 text-xs">Yes! We work with enterprise clients on custom integrations and features.</p>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-1 text-sm">Can I schedule a demo?</h4>
                      <p className="text-white/60 text-xs">Absolutely. Mention "demo" in your message and we'll set something up.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
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
