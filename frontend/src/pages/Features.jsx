"use client";
import React from "react";
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StickyScroll } from "../components/ui/sticky-scroll-reveal";

const content = [
  {
    title: "AI-Powered Wireframe Generation",
    description:
      "Transform your ideas into professional wireframes instantly using advanced AI. Simply describe your vision, and our intelligent system creates detailed, interactive wireframes with proper component placement, typography, and user flow considerations.",
    content: (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.09-.21 2.09-.64 3-1.22.91.58 1.91 1.01 3 1.22 5.16-1 9-5.45 9-11V7l-10-5z"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold">AI Generation</h3>
        </div>
      </div>
    ),
  },
  {
    title: "Real-Time Collaborative Editing",
    description:
      "Work together seamlessly with your team, clients, and stakeholders. See changes as they happen, leave comments, and make decisions together. Our real-time collaboration ensures everyone stays aligned throughout the design process.",
    content: (
      <div className="flex h-full w-full items-center justify-center text-white rounded-lg overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-cyan-500 w-full h-full flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h2v4h2v2H4c-1.1 0-2-.9-2-2zm0-6V8c0-1.1.9-2 2-2h2v2H6v4H4zm6 8c-1.1 0-2-.9-2-2v-4h2v4h2v2h-2zm8-10h-2V8h-2V6h2c1.1 0 2 .9 2 2v2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold">Live Collaboration</h3>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Interactive Prototyping",
    description:
      "Transform static wireframes into clickable, interactive prototypes. Test user flows, validate design decisions, and gather feedback before development. Export to popular design tools or generate production-ready code.",
    content: (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-pink-500 text-white rounded-lg">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold">Interactive Prototypes</h3>
        </div>
      </div>
    ),
  },
  {
    title: "Smart Component Library",
    description:
      "Access a comprehensive library of pre-built, customizable components. From basic UI elements to complex patterns, our smart library learns from your preferences and suggests relevant components for faster wireframe creation.",
    content: (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-lg">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold">Component Library</h3>
        </div>
      </div>
    ),
  },
];

const Features = () => {
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
            <Link to="/features" className="text-purple-400 font-medium">Features</Link>
            <Link to="/about" className="text-white/80 hover:text-white transition-colors">About</Link>
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

      {/* Header Section */}
      <div className="pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Powerful <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Features</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover the cutting-edge capabilities that make UIFlow the ultimate platform for AI-powered wireframe design and prototyping.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Scroll Section */}
      <div className="w-full">
        <StickyScroll content={content} />
      </div>

      {/* Additional Features Grid */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            More Amazing Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "⚡",
                title: "Lightning Fast",
                description: "Generate wireframes in seconds, not hours. Our optimized AI processes your requirements instantly."
              },
              {
                icon: "🎨",
                title: "Design System Integration",
                description: "Seamlessly integrate with popular design systems and maintain consistency across projects."
              },
              {
                icon: "📱",
                title: "Multi-Platform Support",
                description: "Create wireframes for web, mobile, and desktop applications with platform-specific components."
              },
              {
                icon: "🔄",
                title: "Version Control",
                description: "Track changes, manage versions, and collaborate with built-in version control system."
              },
              {
                icon: "🚀",
                title: "Export & Deploy",
                description: "Export to Figma, Sketch, or generate production-ready React/Vue components."
              },
              {
                icon: "🤖",
                title: "Smart Suggestions",
                description: "Get intelligent design suggestions based on UX best practices and current trends."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to experience the future of design?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of designers and developers who are building faster with UIFlow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500">Start Free Trial</Button>
            <Button variant="secondary" size="lg" className="border-gray-600 text-white hover:bg-gray-800">View Pricing</Button>
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
};

export default Features;
