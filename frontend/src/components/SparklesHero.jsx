import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { SparklesCore } from "./ui/sparkles";
import Button from "./ui/Button";

export function SparklesHero() {

  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden relative">
      {/* Main Hero Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-20 text-center px-6 sm:px-8 lg:px-12"
      >
        <h1 className="md:text-7xl text-4xl lg:text-8xl font-bold text-center text-white relative z-20 mb-6 leading-tight">
          Build Amazing{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            UI Workflows
          </span>
        </h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-white/80 mb-4 max-w-3xl mx-auto leading-relaxed"
        >
          Create stunning wireframes, prototypes, and production-ready code with our AI-powered design platform. 
          From concept to deployment in minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg md:text-xl text-cyan-400 mb-8 max-w-2xl mx-auto font-medium italic"
        >
          "Design is not just what it looks like and feels like. Design is how it works." - Steve Jobs
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <Link to="/register">
            <Button size="lg" className="btn-primary text-lg px-8 py-4">
              Start Building Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link to="/features">
            <Button variant="secondary" size="lg" className="text-lg px-8 py-4">
              View Demo
            </Button>
          </Link>
        </motion.div>

      </motion.div>

      {/* Sparkles Background */}
      <div className="w-full h-full absolute inset-0">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-1/2 bg-gradient-to-r from-transparent via-purple-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-1/2 bg-gradient-to-r from-transparent via-purple-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-1/2 bg-gradient-to-r from-transparent via-pink-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-1/2 bg-gradient-to-r from-transparent via-pink-500 to-transparent h-px w-1/4" />

        {/* Core sparkles component */}
        <SparklesCore
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
          speed={2}
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(600px_400px_at_center,transparent_20%,white)]"></div>
      </div>

      {/* Additional background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-200"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-400"></div>
      </div>
    </div>
  );
}
