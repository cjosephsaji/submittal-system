"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import api from "@/lib/api"

interface Project {
    id: number
    name: string
    code: string
    status: string
    created_at: string
}

interface ProjectContextType {
    projects: Project[]
    selectedProject: Project | null
    setSelectedProject: (project: Project | null) => void
    isLoading: boolean
    refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchProjects = async () => {
        const token = localStorage.getItem("token")
        if (!token) {
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const response = await api.get("projects")
            setProjects(response.data)

            // Auto-select first project if none selected and projects exist
            if (response.data.length > 0 && !selectedProject) {
                // Try to restore from localStorage
                const savedId = localStorage.getItem("selectedProjectId")
                const found = response.data.find((p: Project) => p.id.toString() === savedId)
                setSelectedProject(found || response.data[0])
            }
        } catch (error) {
            console.error("Failed to fetch projects in context", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchProjects()
    }, [])

    useEffect(() => {
        if (selectedProject) {
            localStorage.setItem("selectedProjectId", selectedProject.id.toString())
        }
    }, [selectedProject])

    return (
        <ProjectContext.Provider
            value={{
                projects,
                selectedProject,
                setSelectedProject,
                isLoading,
                refreshProjects: fetchProjects
            }}
        >
            {children}
        </ProjectContext.Provider>
    )
}

export function useProject() {
    const context = useContext(ProjectContext)
    if (context === undefined) {
        throw new Error("useProject must be used within a ProjectProvider")
    }
    return context
}
