'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bot,
  Check,
  X,
  Zap,
  Users,
  BarChart3,
  Shield,
  Clock,
  ArrowRight,
  Star
} from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small construction sites',
    price: 99,
    period: 'month',
    features: [
      'Up to 5 robots',
      'Basic simulation',
      'Task scheduling',
      'Real-time monitoring',
      'Email support',
      '30-day data retention'
    ],
    notIncluded: [
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Priority support',
      'White-label solution'
    ],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    name: 'Professional',
    description: 'For growing construction companies',
    price: 299,
    period: 'month',
    features: [
      'Up to 25 robots',
      'Advanced simulation',
      'AI-powered optimization',
      'Advanced analytics',
      'API access',
      'Priority email support',
      '90-day data retention',
      'Custom reports'
    ],
    notIncluded: [
      'Custom integrations',
      'White-label solution',
      'Dedicated account manager',
      'On-site training'
    ],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    name: 'Enterprise',
    description: 'For large-scale operations',
    price: 799,
    period: 'month',
    features: [
      'Unlimited robots',
      'Digital twin integration',
      'Full AI suite',
      'Custom integrations',
      'White-label solution',
      '24/7 phone support',
      'Unlimited data retention',
      'Dedicated account manager',
      'On-site training',
      'Custom SLA',
      'On-premise Option'
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/30"
              >
                <Image src="/arc-spatial-cyan.png" alt="ARC SPATIAL Logo" width={40} height={40} className="w-full h-full object-contain" />
              </motion.div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-red-600 bg-clip-text text-transparent">
                  ARC SPATIAL
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">Autonomous Robotics Control</p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-cyan-500/20 text-red-400 border-cyan-500/30">
              Simple, Transparent Pricing
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Choose the Right Plan
              <span className="block bg-gradient-to-r from-cyan-300 to-blue-600 bg-clip-text text-transparent">
                For Your Business
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              Start with a 14-day free trial. No credit card required. Upgrade or downgrade anytime.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="font-semibold">Trusted by 500+ construction companies</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative ${
                  plan.popular
                    ? 'bg-gradient-to-b from-cyan-900/50 to-slate-900/50 border-cyan-500/50 shadow-xl shadow-cyan-500/20'
                    : 'bg-slate-800/50 backdrop-blur border-slate-700 hover:border-slate-600'
                } h-full`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-2xl text-white mb-2">{plan.name}</CardTitle>
                    <CardDescription className="text-slate-400 mb-6">
                      {plan.description}
                    </CardDescription>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-white">${plan.price}</span>
                      <span className="text-slate-400">/{plan.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <Link href={plan.name === 'Enterprise' ? '#contact' : '/register'}>
                      <Button className={`w-full ${
                        plan.popular
                          ? 'bg-gradient-to-r from-cyan-500 to-red-500 hover:from-red-600 hover:to-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                      } py-6 text-base`}>
                        {plan.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>

                    <div className="space-y-4">
                      <div className="text-center text-sm font-semibold text-slate-300 uppercase tracking-wider">
                        Included
                      </div>
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span className="text-sm text-slate-300">{feature}</span>
                        </div>
                      ))}

                      {plan.notIncluded.length > 0 && (
                        <>
                          <div className="text-center text-sm font-semibold text-slate-300 uppercase tracking-wider pt-2">
                            Not Included
                          </div>
                          {plan.notIncluded.map((feature, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <X className="w-3 h-3 text-slate-500" />
                              </div>
                              <span className="text-sm text-slate-500">{feature}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 sm:py-24 bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 block bg-gradient-to-r from-cyan-300 to-blue-700 bg-clip-text text-transparent">
              Compare All Features
            </h2>
            <p className="text-lg text-slate-400">
              Everything you need to automate your construction operations
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-4 text-slate-300 font-semibold">Feature</th>
                      <th className="text-center p-4 text-cyan-400 font-semibold">Starter</th>
                      <th className="text-center p-4 text-cyan-400 font-semibold">Professional</th>
                      <th className="text-center p-4 text-cyan-400 font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: 'Maximum Robots', starter: '5', pro: '25', enterprise: 'Unlimited' },
                      { feature: 'Simulation Hours/mo', starter: '10', pro: '100', enterprise: 'Unlimited' },
                      { feature: 'Real-time Monitoring', starter: true, pro: true, enterprise: true },
                      { feature: 'Task Scheduling', starter: true, pro: true, enterprise: true },
                      { feature: 'AI Optimization', starter: false, pro: true, enterprise: true },
                      { feature: 'Advanced Analytics', starter: false, pro: true, enterprise: true },
                      { feature: 'API Access', starter: false, pro: true, enterprise: true },
                      { feature: 'Custom Integrations', starter: false, pro: false, enterprise: true },
                      { feature: '24/7 Support', starter: false, pro: false, enterprise: true },
                      { feature: 'Dedicated Manager', starter: false, pro: false, enterprise: true }
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-slate-700/50 last:border-0">
                        <td className="p-4 text-slate-300">{row.feature}</td>
                        <td className="p-4 text-center">
                          {typeof row.starter === 'boolean' ? (
                            row.starter ? <Check className="w-5 h-5 text-red-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />
                          ) : (
                            <span className="text-slate-400">{row.starter}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.pro === 'boolean' ? (
                            row.pro ? <Check className="w-5 h-5 text-red-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />
                          ) : (
                            <span className="text-slate-400">{row.pro}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.enterprise === 'boolean' ? (
                            row.enterprise ? <Check className="w-5 h-5 text-red-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />
                          ) : (
                            <span className="text-slate-400">{row.enterprise}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: 'Can I change my plan later?',
                a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we\'ll prorate your billing.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, PayPal, and bank transfers for Enterprise customers.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! All plans come with a 14-day free trial. No credit card required to start.'
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied, contact us for a full refund.'
              }
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                    <p className="text-slate-400">{faq.a}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 block bg-gradient-to-r from-cyan-400 to-red-500 bg-clip-text text-transparent">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Start your free trial today and transform your construction operations
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-red-500 hover:from-red-600 hover:to-cyan-600 text-white shadow-lg shadow-cyan-500/30 text-lg px-8">
              Start Trial Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
