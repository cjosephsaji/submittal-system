"use client"

import * as React from "react"
import {
    BookOpen,
    Bot,
    Command,
    Frame,
    LifeBuoy,
    Map,
    PieChart,
    Send,
    Settings2,
    SquareTerminal,
    LayoutGrid,
    Zap
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useAuth } from "@/context/auth-context"
import { LogOut, User } from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { user, logout } = useAuth()

    // Roles that can see the Compliance Engine (Review Tools)
    const canReview = ["consultant_engineer", "consultant_admin", "super_admin"].includes(user?.role || "")
    const canAdmin = ["consultant_admin", "super_admin"].includes(user?.role || "")

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Submittal System</span>
                                    <span className="truncate text-xs">Enterprise</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="mt-4">
                    {/* Main Nav */}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Dashboard">
                            <a href="/dashboard">
                                <PieChart />
                                <span>Dashboard</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Submittals">
                            <a href="/dashboard/submittals">
                                <BookOpen />
                                <span>Submittals</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Projects">
                            <a href="/dashboard/projects">
                                <LayoutGrid />
                                <span>Projects</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {canAdmin && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Project Requirements">
                                <a href="/dashboard/admin/requirements">
                                    <Settings2 />
                                    <span>Requirements</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}

                    {canAdmin && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="System Settings">
                                <a href="/dashboard/admin/settings">
                                    <Zap />
                                    <span>System Settings</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}

                    {user?.role === 'super_admin' && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="User Management">
                                <a href="/dashboard/admin/users">
                                    <User />
                                    <span>Users</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}

                    {canReview && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Compliance Review">
                                <a href="/dashboard/compliance">
                                    <Bot />
                                    <span>Compliance Engine</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {user && (
                        <SidebarMenuItem>
                            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                                <User className="size-4" />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-foreground">{user.full_name}</span>
                                    <span className="text-xs">{user.role.replace("_", " ")}</span>
                                </div>
                            </div>
                        </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout} tooltip="Logout">
                            <LogOut />
                            <span>Log out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
