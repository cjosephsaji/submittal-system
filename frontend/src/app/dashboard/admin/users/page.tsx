"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Plus,
    Trash2,
    Edit,
    Loader2,
    Users as UsersIcon,
    Mail,
    Shield
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"

interface User {
    id: number
    email: string
    full_name: string
    role: string
    tenant_id: number
}

interface Tenant {
    id: number
    name: string
    domain: string | null
}

export default function UsersManagementPage() {
    const { user: currentUser, isLoading: isAuthLoading } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)

    // Form states
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [role, setRole] = useState("")
    const [tenantId, setTenantId] = useState("")

    useEffect(() => {
        // Wait for auth to finish loading
        if (isAuthLoading) return

        // Redirect if not super admin
        if (currentUser?.role !== 'super_admin') {
            window.location.href = '/dashboard'
            return
        }

        fetchData()
    }, [currentUser, isAuthLoading])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [usersRes, tenantsRes] = await Promise.all([
                api.get("users?limit=1000"),
                api.get("tenants")
            ])
            setUsers(usersRes.data)
            setTenants(tenantsRes.data)
        } catch (error) {
            console.error("Failed to fetch data", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = async () => {
        setIsCreating(true)
        try {
            await api.post("users", {
                email,
                password,
                full_name: fullName,
                role,
                tenant_id: parseInt(tenantId)
            })
            await fetchData()
            resetForm()
            setIsOpen(false)
        } catch (error) {
            console.error("Failed to create user", error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleUpdate = async () => {
        if (!editingUser) return
        setIsCreating(true)
        try {
            const updateData: any = {
                email,
                full_name: fullName,
                role
            }
            if (password) {
                updateData.password = password
            }
            await api.put(`users/${editingUser.id}`, updateData)
            await fetchData()
            resetForm()
            setEditingUser(null)
            setIsOpen(false)
        } catch (error) {
            console.error("Failed to update user", error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleDelete = async (userId: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return
        try {
            await api.delete(`users/${userId}`)
            await fetchData()
        } catch (error) {
            console.error("Failed to delete user", error)
        }
    }

    const openEditDialog = (user: User) => {
        setEditingUser(user)
        setEmail(user.email)
        setFullName(user.full_name)
        setRole(user.role)
        setTenantId(user.tenant_id.toString())
        setPassword("")
        setIsOpen(true)
    }

    const resetForm = () => {
        setEmail("")
        setPassword("")
        setFullName("")
        setRole("")
        setTenantId("")
        setEditingUser(null)
    }

    const roleColors: any = {
        super_admin: "bg-purple-500",
        consultant_admin: "bg-blue-500",
        consultant_engineer: "bg-green-500",
        contractor: "bg-orange-500",
        supplier: "bg-gray-500"
    }

    const roleLabels: any = {
        super_admin: "Super Admin",
        consultant_admin: "Consultant Admin",
        consultant_engineer: "Consultant Engineer",
        contractor: "Contractor",
        supplier: "Supplier"
    }

    if (currentUser?.role !== 'super_admin') {
        return null
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                    <p className="text-muted-foreground">Manage all users and their roles across tenants.</p>
                </div>

                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button className="shadow-md">
                            <Plus className="mr-2 h-4 w-4" /> Create User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                            <DialogDescription>
                                {editingUser ? "Update user details and permissions." : "Add a new user to the system."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">{editingUser ? "New Password (leave blank to keep current)" : "Password"}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                        <SelectItem value="consultant_admin">Consultant Admin</SelectItem>
                                        <SelectItem value="consultant_engineer">Consultant Engineer</SelectItem>
                                        <SelectItem value="contractor">Contractor</SelectItem>
                                        <SelectItem value="supplier">Supplier</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {!editingUser && (
                                <div className="grid gap-2">
                                    <Label htmlFor="tenant">Tenant</Label>
                                    <Select value={tenantId} onValueChange={setTenantId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select tenant" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenants.map((tenant) => (
                                                <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                                    {tenant.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={editingUser ? handleUpdate : handleCreate}
                                disabled={!email || (!editingUser && !password) || !fullName || !role || (!editingUser && !tenantId) || isCreating}
                            >
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {editingUser ? "Update User" : "Create User"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5" />
                        All Users
                    </CardTitle>
                    <CardDescription>Manage users across all tenants and organizations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Tenant</TableHead>
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
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="group hover:bg-muted/50 transition-colors">
                                        <TableCell className="pl-6 font-medium">{user.full_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {user.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={roleColors[user.role] || "bg-gray-500"}>
                                                {roleLabels[user.role] || user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {tenants.find(t => t.id === user.tenant_id)?.name || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => openEditDialog(user)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {user.id !== currentUser?.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                        onClick={() => handleDelete(user.id)}
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
        </div>
    )
}
