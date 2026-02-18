"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Plus,
    FolderPlus,
    Building2,
    LayoutGrid,
    MoreVertical,
    Calendar,
    CheckCircle2,
    Loader2,
    Users,
    Trash2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import api from "@/lib/api"
import { format } from "date-fns"
import { useProject } from "@/context/project-context"
import { ProjectTeamModal } from "@/components/project-team-modal"
import { useAuth } from "@/context/auth-context"

interface Project {
    id: number
    name: string
    code: string
    status: string
    created_at: string
}

export default function ProjectsPage() {
    const { user } = useAuth()
    const { projects, refreshProjects, isLoading } = useProject()
    const [isCreating, setIsCreating] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
    const [activeProject, setActiveProject] = useState<Project | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Form states
    const [name, setName] = useState("")

    const handleCreate = async () => {
        setIsCreating(true)
        try {
            await api.post("projects/", { name })
            await refreshProjects()
            setIsOpen(false)
            setName("")
        } catch (error) {
            console.error("Failed to create project", error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleDelete = async (projectId: number) => {
        if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return
        try {
            await api.delete(`projects/${projectId}`)
            await refreshProjects()
        } catch (error) {
            console.error("Failed to delete project", error)
        }
    }

    const containerVariants: any = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants: any = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex-1 space-y-4 p-8 pt-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground">Manage your construction projects and team assignments.</p>
                </div>

                {mounted && (user?.role === 'super_admin' || user?.role === 'consultant_admin') && (
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-md">
                                <Plus className="mr-2 h-4 w-4" /> Create Project
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New Project</DialogTitle>
                                <DialogDescription>
                                    Add a new project to your workspace. The system will auto-assign a unique project code.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Project Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. City Towers Refurbishment"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button disabled={!name || isCreating} onClick={handleCreate}>
                                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                                    Create Project
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div variants={itemVariants}>
                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                            <Building2 className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{projects.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Active within your tenant</p>
                        </CardContent>
                    </Card>
                </motion.div>
                {/* Add more stats card here if needed */}
            </div>

            <motion.div variants={itemVariants}>
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5 text-primary" />
                            Project Directory
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Project Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : projects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No projects found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    projects.map((project) => (
                                        <TableRow key={project.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex items-center gap-3 text-black font-bold">
                                                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>
                                                    {project.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{project.code}</Badge>
                                            </TableCell>
                                            <TableCell className="text-foreground font-semibold text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    {format(new Date(project.created_at), "MMM d, yyyy")}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-500 hover:bg-green-600">
                                                    {project.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-2"
                                                        onClick={() => {
                                                            setActiveProject(project)
                                                            setIsTeamModalOpen(true)
                                                        }}
                                                    >
                                                        <Users className="h-4 w-4" />
                                                        Team
                                                    </Button>
                                                    {(user?.role === 'super_admin' || user?.role === 'consultant_admin') && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                            onClick={() => handleDelete(project.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
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

            {/* Team Management Modal */}
            <ProjectTeamModal
                project={activeProject}
                open={isTeamModalOpen}
                onOpenChange={setIsTeamModalOpen}
            />
        </motion.div>
    )
}
