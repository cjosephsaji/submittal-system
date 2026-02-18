"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-hidden selection:bg-primary/10">
      <header className="flex h-16 items-center px-6 lg:px-10 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <Link className="flex items-center justify-center p-2 rounded-lg hover:bg-accent/50 transition-colors" href="/">
          <span className="font-semibold text-lg tracking-tight">Submittal System</span>
        </Link>
        <nav className="ml-auto flex gap-4">
          {/* Navigation removed as requested */}
        </nav>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center">
        <section className="w-full py-20 md:py-32 lg:py-48 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center space-y-8">

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary"
              >
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                v1.0 Enterprise Edition
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
              >
                Intelligent Material <br className="hidden sm:inline" />
                Compliance Review
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.2 }}
                className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl leading-relaxed"
              >
                Streamline your construction submittals with AI-powered analysis.
                Digitize, standardize, and automate compliance checking for large-scale projects.
              </motion.p>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8"
              >
                <motion.div variants={fadeInUp} transition={{ delay: 0.3 }}>
                  <Link href="/login">
                    <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
                <motion.div variants={fadeInUp} transition={{ delay: 0.4 }}>
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base backdrop-blur-sm hover:bg-accent/50 transition-all font-medium">
                    View Demo
                  </Button>
                </motion.div>
              </motion.div>

              {/* Feature Pills */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-muted-foreground font-medium"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/30 border border-border/50">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>AI-Driven Data Extraction</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/30 border border-border/50">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Compliance Validation</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/30 border border-border/50">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Automated Workflow Tracking</span>
                </div>
              </motion.div>

            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 w-full border-t border-border/40 mt-auto">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 Submittal System. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
