"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, FileText, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import api from "@/lib/api"
import { useProject } from "@/context/project-context"
import { useAuth } from "@/context/auth-context"

interface Submittal {
    id: number
    title: string
    submittal_number: string
    status: string
    created_at: string
}

export default function SubmittalsPage() {
    const [submittals, setSubmittals] = useState<Submittal[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { selectedProject } = useProject()
    const { user } = useAuth()

    useEffect(() => {
        if (selectedProject?.id) {
            fetchSubmittals()
        }
    }, [selectedProject])

    // Refetch when the page gains focus (e.g. coming back from New Submittal)
    useEffect(() => {
        const onFocus = () => {
            if (selectedProject) fetchSubmittals()
        }
        window.addEventListener("focus", onFocus)
        return () => window.removeEventListener("focus", onFocus)
    }, [selectedProject])

    const fetchSubmittals = async () => {
        if (!selectedProject?.id) return
        setIsLoading(true)
        try {
            const response = await api.get("submittals", {
                params: { project_id: selectedProject.id }
            })
            setSubmittals(response.data)
        } catch (error) {
            console.error("Failed to fetch submittals", error)
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "APPROVED": return "bg-green-500 hover:bg-green-600";
            case "REJECTED": return "bg-red-500 hover:bg-red-600";
            case "SUBMITTED_TO_CONTRACTOR": return "bg-blue-500 hover:bg-blue-600";
            case "FORWARDED_TO_ENGINEER": return "bg-orange-500 hover:bg-orange-600";
            case "REVISE_AND_RESUBMIT": return "bg-purple-500 hover:bg-purple-600";
            case "DRAFT": return "bg-gray-400 hover:bg-gray-500";
            default: return "bg-gray-500";
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
                <h2 className="text-3xl font-bold tracking-tight">Submittals</h2>
                <div className="flex items-center space-x-2">
                    {user?.role === "supplier" && (
                        <Link href="/dashboard/submittals/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Submittal
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="flex items-center py-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search submittals..." className="pl-8" />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : submittals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No submittals found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                submittals.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className="border-b transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-slate-50"
                                    >
                                        <TableCell className="font-bold align-middle p-4 text-slate-900">
                                            {item.submittal_number || `SUB-${item.id}`}
                                        </TableCell>
                                        <TableCell className="align-middle p-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                                <span className="font-semibold text-slate-900">{item.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-middle p-4 text-slate-600 font-medium">
                                            {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "N/A"}
                                        </TableCell>
                                        <TableCell className="align-middle p-4">
                                            <Badge className={`${getStatusColor(item.status)} text-white border-none shadow-sm capitalize`}>
                                                {(item.status || "Unknown").toLowerCase().replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right align-middle p-4">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/dashboard/submittals/${item.id}`}>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100">
                                                        View Details
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        if (confirm("Are you sure you want to delete this submittal?")) {
                                                            try {
                                                                await api.delete(`submittals/${item.id}`);
                                                                fetchSubmittals();
                                                            } catch (error) {
                                                                console.error("Failed to delete submittal", error);
                                                                alert("Failed to delete submittal");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </motion.div>
    )
}
