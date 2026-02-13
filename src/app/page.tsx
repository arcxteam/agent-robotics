'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bot,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Sparkles,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  Building2,
  Construction,
  Package,
  Target,
  BotMessageSquare,
  Github,
  Twitter,
  Globe,
  LayoutDashboard
} from 'lucide-react'
import { useState } from 'react'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/30"
              >
                <Image src="/arc-spatial-cyan.png" alt="ARC SPATIAL Logo" width={48} height={48} className="w-full h-full object-contain" />
              </motion.div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-red-600 bg-clip-text text-transparent">
                  ARC SPATIAL
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">Autonomous Robotics Control</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                Features
              </Link>
              <Link href="#how-it-works" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                How It Works
              </Link>
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                Pricing
              </Link>
              <Link href="#contact" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                Contact
              </Link>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link href="#features" className="block text-slate-300 hover:text-white transition-colors py-2">
                Features
              </Link>
              <Link href="#how-it-works" className="block text-slate-300 hover:text-white transition-colors py-2">
                How It Works
              </Link>
              <Link href="/pricing" className="block text-slate-300 hover:text-white transition-colors py-2">
                Pricing
              </Link>
              <Link href="#contact" className="block text-slate-300 hover:text-white transition-colors py-2">
                Contact
              </Link>
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <Link href="/login" className="block w-full">
                  <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="block w-full">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur rounded-full border border-slate-700 mb-6"
            >
              <Badge className="bg-cyan-500/20 text-red-400 border-cyan-500/30">
                New
              </Badge>
              <span className="text-sm text-slate-300">AI-Powered Construction Robotics Platform</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight"
            >
              Transform{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Blueprint
              </span>{" "}
              to{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-red-600 bg-clip-text text-transparent">
                Autonomous
              </span>{" "}
              Execution
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto"
            >
              Empower your facility to perform autonomous material transport, optimize workflows, and enhance productivity with our intelligent robot fleet management system. From planning to measurable results.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-blue-700 hover:from-blue-700 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/30 text-lg px-8">
                  Start Trial Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-red-600 hover:from-red-600 hover:to-cyan-600 text-white shadow-lg shadow-cyan-500/30 text-lg px-8">
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-8 border-t border-slate-800"
            >
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">500+</div>
                <div className="text-sm text-slate-400">Active Robots</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">10M+</div>
                <div className="text-sm text-slate-400">Tasks Completed</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">99.9%</div>
                <div className="text-sm text-slate-400">Efficiency Gain</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">Seamless</div>
                <div className="text-sm text-slate-400">On-premises</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <Badge className="mb-4 bg-cyan-500/20 text-red-400 border-cyan-500/30">
              Features
            </Badge>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="block">
                <span className="bg-gradient-to-r from-cyan-400 to-red-500 bg-clip-text text-transparent">
                  Automate
                </span>{" "}
                <span className="text-cyan-400">
                  Construction
                </span>
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Powerful tools designed for modern construction sites and logistics operations
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: 'AI-Powered Control',
                description: 'Intelligent robot fleet management with autonomous decision-making capabilities',
                color: 'from-cyan-300 to-emerald-600'
              },
              {
                icon: Construction,
                title: 'Real-Time Simulation',
                description: 'Test and optimize workflows in digital twin environments before deployment',
                color: 'from-pink-500 to-red-600'
              },
              {
                icon: Target,
                title: 'Smart Task Scheduling',
                description: 'Automatic task assignment based on priority, robot availability, and battery levels',
                color: 'from-cyan-300 to-blue-600'
              },
              {
                icon: Package,
                title: 'Material Transport',
                description: 'Efficient movement of construction materials between zones with real-time tracking',
                color: 'from-purple-300 to-purple-600'
              },
              {
                icon: BarChart3,
                title: 'Advanced Analytics',
                description: 'Comprehensive performance metrics, efficiency reports, and predictive insights',
                color: 'from-gray-200 to-gray-800'
              },
              {
                icon: Shield,
                title: 'Safety & Compliance',
                description: 'Built-in safety protocols and construction industry compliance features',
                color: 'from-amber-300 to-amber-600'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-slate-600 transition-all hover:shadow-xl hover:shadow-cyan-500/10 group h-full">
                  <Card className="p-6 bg-transparent border-0 shadow-none">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-400">{feature.description}</p>
                  </Card>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <Badge className="mb-4 bg-blue-500/20 text-red-400 border-blue-500/30">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Get Started in
              <span className="block">
                <span className="bg-gradient-to-r from-cyan-400 to-red-500 bg-clip-text text-transparent">
                  Three
                </span>{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Simple Steps
                </span>
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              <span className="inline-block px-4 py-2 rounded-full bg-slate-800/30 backdrop-blur-sm border border-slate-700/50">
                <span className="bg-gradient-to-r from-gray-200 to-cyan-400 bg-clip-text text-transparent">
                  From blueprint to automation in minutes
                </span>
              </span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: 'WAN',
                title: 'Upload Your Layout',
                description: 'Import your construction site blueprint or floor plan. Our AI will automatically detect and create work zones.',
                icon: Building2,
                features: ['PDF/Image/CAD support', 'AI zone detection', 'Auto-scale calibration', 'Multi-floor support']
              },
              {
                step: 'TO',
                title: 'Configure Robots',
                description: 'Add robots to your fleet, set their capabilities, and define material types and transport requirements.',
                icon: BotMessageSquare,
                features: ['Multiple robot types', 'Custom capacities', 'Battery optimization', 'AI task assignment']
              },
              {
                step: 'TRI',
                title: 'Deploy & Monitor',
                description: 'Launch simulation or deploy to real robots. Monitor performance in real-time and optimize as needed.',
                icon: TrendingUp,
                features: ['Real-time tracking', 'Performance analytics', 'Alert notifications', 'Predictive insights']
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 h-full hover:border-cyan-500/30 transition-all group">
                  <div className="text-6xl font-bold text-slate-800 absolute -top-4 left-6 -z-10">
                    {item.step}
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 mb-6">{item.description}</p>
                  <ul className="space-y-2">
                    {item.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <Badge className="mb-4 bg-blue-500/20 text-red-400 border-blue-500/30">
              Technology
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Powered by{" "}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Advanced AI
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Built on industry-leading frameworks for reliability, performance, and intelligence
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Sparkles,
                name: 'Google Gemini 2.0',
                desc: 'AI vision analysis & autonomous task planning from floor plans',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Construction,
                name: 'Three.js + Rapier',
                desc: '3D physics simulation with real-time robot visualization',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: Zap,
                name: 'WebSocket',
                desc: 'Real-time bidirectional communication for fleet control',
                color: 'from-yellow-500 to-orange-500'
              },
              {
                icon: Globe,
                name: 'Next.js 16',
                desc: 'Server-side rendering with edge-optimized performance',
                color: 'from-emerald-500 to-teal-500'
              },
            ].map((tech, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-slate-800/30 backdrop-blur border-slate-700/50 hover:border-slate-600 transition-all group h-full text-center p-6">
                  <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${tech.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <tech.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{tech.name}</h3>
                  <p className="text-sm text-slate-400">{tech.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Platform Capabilities */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Pick & Place Operations',
                stats: '4 Robot Types',
                desc: 'Autonomous material handling with mobile manipulators, forklifts, and AMR transport robots',
                items: ['Steel beams & rebar', 'Cement & sand bags', 'Electrical panels', 'Scaffolding parts']
              },
              {
                title: 'AI Task Scheduling',
                stats: '17 Material Types',
                desc: 'Gemini AI plans optimal task sequences, assigns robots based on proximity and battery levels',
                items: ['Natural language commands', 'Priority-based queuing', 'Auto failure retry', 'Multi-robot coordination']
              },
              {
                title: 'Real-time Analytics',
                stats: '99.9% Uptime',
                desc: 'Live dashboards tracking fleet efficiency, task completion rates, and performance metrics',
                items: ['Fleet efficiency tracking', 'Task completion rates', 'Battery optimization', 'Zone utilization maps']
              },
            ].map((cap, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card className="bg-slate-800/30 backdrop-blur border-slate-700/50 hover:border-cyan-500/30 transition-all p-6 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{cap.title}</h3>
                    <Badge className="bg-cyan-500/20 text-red-400 border-cyan-500/30">{cap.stats}</Badge>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{cap.desc}</p>
                  <ul className="space-y-2">
                    {cap.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Transform Your
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Construction Operations?
              </span>
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Join hundreds of construction companies already using ARC SPATIAL to seamlessly integrated robotics fleet platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-red-600 hover:from-red-600 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/30 text-lg px-8">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-blue-700 hover:from-blue-700 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/30 text-lg px-8">
                  View Pricing
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 sm:py-16 bg-slate-950 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg overflow-hidden">
                  <Image src="/arc-spatial-cyan.png" alt="ARC SPATIAL Logo" width={40} height={40} className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold">ARC SPATIAL</span>
              </Link>
              <p className="text-sm text-slate-400">
                AI-powered robotics platform for construction automation and material transport.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-cyan-400">
                <li><Link href="/dashboard" className="hover:text-cyan-300 transition-colors">Dashboard</Link></li>
                <li><Link href="/dashboard/simulation" className="hover:text-cyan-300 transition-colors">Simulation</Link></li>
                <li><Link href="/dashboard/analytics" className="hover:text-cyan-300 transition-colors">Analytics</Link></li>
                <li><Link href="/pricing" className="hover:text-cyan-300 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-cyan-400">
                <li><Link href="#about" className="hover:text-cyan-300 transition-colors">About Us</Link></li>
                <li><Link href="#careers" className="hover:text-cyan-300 transition-colors">Careers</Link></li>
                <li><Link href="#blog" className="hover:text-cyan-300 transition-colors">Blog</Link></li>
                <li><Link href="#contact" className="hover:text-cyan-300 transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-cyan-400">
                <li><Link href="#privacy" className="hover:text-cyan-300 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#terms" className="hover:text-cyan-300 transition-colors">Terms of Service</Link></li>
                <li><Link href="#security" className="hover:text-cyan-300 transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              © 2026 ARC SPATIAL. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://greyscope.xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
              >
                <Globe className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com/gr3yscope" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/arcxteam/arc-spatial" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
