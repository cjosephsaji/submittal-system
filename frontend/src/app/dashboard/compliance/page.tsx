"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bot, FileText, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { useProject } from "@/context/project-context"

interface Submittal {
    id: number
    title: string
    submittal_number: string
    status: string
    created_at: string
}

export default function ComplianceDashboard() {
    const [queue, setQueue] = useState<Submittal[]>([])
    const { user } = useAuth()
    const { selectedProject } = useProject()

    useEffect(() => {
        if (selectedProject) {
            fetchQueue()
        }
    }, [selectedProject])

    const fetchQueue = async () => {
        try {
            const response = await api.get("/submittals/", {
                params: { project_id: selectedProject?.id }
            })
            // Filter for items needing review
            const pending = response.data.filter((s: Submittal) => s.status === 'submitted')
            setQueue(pending)
        } catch (error) {
            console.error("Failed to fetch queue", error)
        }
    }

    const containerVariants: any = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants: any = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 space-y-4 p-8 pt-6"
        >
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Compliance Engine</h2>
                    <p className="text-muted-foreground">AI-Assisted Review Queue</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{queue.length}</div>
                            <p className="text-xs text-muted-foreground">Submittals awaiting action</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Review Queue</CardTitle>
                        <CardDescription>Select a submittal to launch the AI Compliance Matrix.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Submittal ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {queue.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No pending reviews. Good job!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    queue.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.submittal_number}</TableCell>
                                            <TableCell>{item.title}</TableCell>
                                            <TableCell>{format(new Date(item.created_at), "MMM d, yyyy")}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Needs Review</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/dashboard/compliance/${item.id}`}>
                                                    <Button size="sm">
                                                        <Bot className="mr-2 h-4 w-4" /> Start AI Review
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}
