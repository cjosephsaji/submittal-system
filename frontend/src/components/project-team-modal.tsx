"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { UserPlus, Loader2, Mail, User } from "lucide-react"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"

interface TeamMember {
    id: number
    email: string
    full_name: string
    role: string
}

export function ProjectTeamModal({
    project,
    open,
    onOpenChange
}: {
    project: any
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { user } = useAuth()
    const [team, setTeam] = useState<TeamMember[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)

    // Form state
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [role, setRole] = useState("")

    // User search state
    const [allUsers, setAllUsers] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        if (open && project) {
            fetchTeam()

            // Only fetch all users if the role is allowed to assign members
            // (Matches backend RoleChecker in users.py)
            const canAssign = ["consultant_admin", "super_admin", "consultant_engineer", "contractor"].includes(user?.role || "")
            if (canAssign) {
                fetchAllUsers()
            }
        }
    }, [open, project, user?.role])

    const fetchTeam = async () => {
        setIsLoading(true)
        try {
            const response = await api.get(`projects/${project.id}/team`)
            setTeam(response.data)
        } catch (error) {
            console.error("Failed to fetch team", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchAllUsers = async () => {
        try {
            const response = await api.get("users/")
            setAllUsers(response.data)
        } catch (error) {
            console.error("Failed to fetch users", error)
        }
    }

    const handleAssign = async () => {
        if (!email || !role) return
        setIsAssigning(true)
        try {
            await api.post(`projects/${project.id}/assign`, {
                email,
                full_name: fullName,
                role
            })
            setEmail("")
            setFullName("")
            setRole("")
            setSearchQuery("")
            fetchTeam()
        } catch (error) {
            console.error("Failed to assign user", error)
        } finally {
            setIsAssigning(false)
        }
    }

    const filteredUsers = allUsers.filter(u =>
        (u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))) &&
        !team.some(t => t.email === u.email)
    )

    const selectUser = (u: any) => {
        setEmail(u.email)
        setFullName(u.full_name || "")
        setRole(u.role)
        setSearchQuery(u.full_name || u.email)
    }

    // Role Hierarchy Visibility
    const availableRoles = []
    if (user?.role === "consultant_admin" || user?.role === "super_admin") {
        availableRoles.push("consultant_engineer", "contractor", "supplier")
    } else if (user?.role === "consultant_engineer") {
        availableRoles.push("contractor", "supplier")
    } else if (user?.role === "contractor") {
        availableRoles.push("supplier")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <User className="h-5 w-5 text-primary" />
                        Project Team: {project?.name}
                    </DialogTitle>
                    <DialogDescription>
                        Manage project assignments and invite team members.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Add Member Form */}
                    {availableRoles.length > 0 && (
                        <div className="grid gap-4 p-5 border rounded-2xl bg-muted/30 shadow-sm">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                                <UserPlus className="h-4 w-4" />
                                Assign New Member
                            </h4>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2 col-span-2 relative">
                                    <Label htmlFor="search">Find Existing User / Vendor</Label>
                                    <div className="relative group">
                                        <Input
                                            id="search"
                                            placeholder="Search by name or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-11 border-primary/20 bg-background focus:ring-2 focus:ring-primary/20"
                                        />
                                        {searchQuery && filteredUsers.length > 0 && searchQuery !== (fullName || email) && (
                                            <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border rounded-xl shadow-2xl max-h-[200px] overflow-y-auto divide-y animate-in fade-in slide-in-from-top-2">
                                                {filteredUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        className="w-full text-left p-3 hover:bg-primary/5 transition-colors flex flex-col gap-0.5"
                                                        onClick={() => selectUser(u)}
                                                    >
                                                        <span className="text-sm font-bold">{u.full_name || "New User"}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{u.email} • {u.role.replace('_', ' ')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label htmlFor="email">Assign Email</Label>
                                    <Input
                                        id="email"
                                        placeholder="user@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label htmlFor="role">Project Role</Label>
                                    <Select value={role} onValueChange={setRole}>
                                        <SelectTrigger id="role" className="h-11">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableRoles.map(r => (
                                                <SelectItem key={r} value={r}>
                                                    {r.replace("_", " ").toUpperCase()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 md:col-span-1 flex items-end">
                                    <Button
                                        className="w-full"
                                        disabled={!email || !role || isAssigning}
                                        onClick={handleAssign}
                                    >
                                        {isAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                                        Assign User
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Team List */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Current Team</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Role</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : team.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                                No team members assigned yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        team.map(member => (
                                            <TableRow key={member.id}>
                                                <TableCell className="py-3">
                                                    <div className="font-medium text-sm">{member.full_name || "New User"}</div>
                                                    <div className="text-xs text-muted-foreground">{member.email}</div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Badge variant="outline" className="text-[10px] uppercase">
                                                        {member.role.replace("_", " ")}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
