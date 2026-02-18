"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, CheckCircle, Clock, AlertTriangle, FileText, Loader2, User } from "lucide-react"
import { motion } from "framer-motion"
import { useProject } from "@/context/project-context"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface Statistics {
    total: number
    pending: number
    approved: number
    revisions: number
}

interface RecentSubmittal {
    id: number
    title: string
    submittal_number: string
    status: string
    category: string
    created_at: string
}

export default function Page() {
    const { selectedProject } = useProject()
    const [stats, setStats] = useState<Statistics>({ total: 0, pending: 0, approved: 0, revisions: 0 })
    const [recentSubmittals, setRecentSubmittals] = useState<RecentSubmittal[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (selectedProject?.id) {
            fetchDashboardData()
        }
    }, [selectedProject])

    const fetchDashboardData = async () => {
        if (!selectedProject?.id) return

        setIsLoading(true)
        try {
            // Fetch all submittals for the project
            const response = await api.get(`submittals?project_id=${selectedProject.id}`)
            const submittals = response.data

            // Calculate statistics
            const statistics = {
                total: submittals.length,
                pending: submittals.filter((s: any) =>
                    s.status === "SUBMITTED_TO_CONTRACTOR" ||
                    s.status === "FORWARDED_TO_ENGINEER" ||
                    s.status === "UNDER_REVIEW"
                ).length,
                approved: submittals.filter((s: any) =>
                    s.status === "APPROVED" ||
                    s.status === "APPROVED_WITH_COMMENTS"
                ).length,
                revisions: submittals.filter((s: any) =>
                    s.status === "REVISE_AND_RESUBMIT"
                ).length
            }

            setStats(statistics)

            // Get 10 most recent submittals
            setRecentSubmittals(submittals.slice(0, 10))
        } catch (error) {
            console.error("Failed to fetch dashboard data", error)
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            "DRAFT": { label: "Draft", className: "bg-gray-500" },
            "SUBMITTED_TO_CONTRACTOR": { label: "Submitted", className: "bg-blue-500" },
            "FORWARDED_TO_ENGINEER": { label: "Under Review", className: "bg-purple-500" },
            "UNDER_REVIEW": { label: "Under Review", className: "bg-purple-500" },
            "APPROVED": { label: "Approved", className: "bg-green-500" },
            "APPROVED_WITH_COMMENTS": { label: "Approved", className: "bg-green-500" },
            "REVISE_AND_RESUBMIT": { label: "Revise & Resubmit", className: "bg-orange-500" },
            "REJECTED": { label: "Rejected", className: "bg-red-500" }
        }

        const config = statusMap[status] || { label: status, className: "bg-gray-500" }
        return <Badge className={`${config.className} text-white text-[10px]`}>{config.label}</Badge>
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid auto-rows-min gap-4 md:grid-cols-4 mt-4"
            >
                <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-primary/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Submittals</CardTitle>
                            <BookOpen className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{stats.total}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.total === 0 ? "No submittals yet" : `Across all categories`}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-yellow-500/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{stats.pending}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.pending === 0 ? "No pending reviews" : "Awaiting action"}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-500/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{stats.approved}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.approved === 0 ? "No approvals yet" : "Completed successfully"}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-destructive/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Revise & Resubmit</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{stats.revisions}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.revisions === 0 ? "No revisions requested" : "Need attention"}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl bg-card border"
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Recent Activity
                    </h3>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : recentSubmittals.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">
                                {selectedProject ? "No submittals yet for this project" : "Select a project to view recent submittals"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentSubmittals.map((submittal, index) => (
                                <motion.div
                                    key={submittal.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link href={`/dashboard/submittals/${submittal.id}`}>
                                        <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-semibold truncate">{submittal.title}</p>
                                                        <Badge variant="outline" className="text-[10px]">{submittal.submittal_number}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{submittal.category}</span>
                                                        <span>•</span>
                                                        <span>{formatDistanceToNow(new Date(submittal.created_at), { addSuffix: true })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {getStatusBadge(submittal.status)}
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
