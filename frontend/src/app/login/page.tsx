"use client"

import { Metadata } from "next"
import Link from "next/link"
import { motion } from "framer-motion"

import { LoginForm } from "@/components/auth/login-form"

// Metadata cannot be exported from a client component, so we remove it or move it to layout.
// For simplicity in this file, we'll skip the export metadata and focus on the UI.

export default function LoginPage() {
    return (
        <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background text-foreground">

            {/* Left Side - Brand / Visual */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex overflow-hidden">
                <div className="absolute inset-0 bg-primary" />

                {/* Animated Background Pattern */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"
                />

                <div className="relative z-20 flex items-center text-lg font-medium">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-2"
                    >
                        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-6 w-6"
                            >
                                <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                            </svg>
                            <span>Submittal System</span>
                        </Link>
                    </motion.div>
                </div>

                <div className="relative z-20 mt-auto">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Enterprise Compliance</h2>
                        <p className="text-primary-foreground/80 text-lg">
                            Automated material review for modern construction projects.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="lg:p-8 flex items-center justify-center h-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]"
                >
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Sign in to manage your project submittals
                        </p>
                    </div>

                    <LoginForm />

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By continuing, you agree to our{" "}
                        <Link
                            href="/terms"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/privacy"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
