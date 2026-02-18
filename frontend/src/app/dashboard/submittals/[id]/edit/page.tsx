"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
    UploadCloud,
    FileText,
    Loader2,
    Check,
    Image as ImageIcon,
    Trash2,
    Send,
    ArrowLeft
} from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"

interface ProjectRequirement {
    id: number
    field_name: string
    description: string
    category: string
    field_type: 'text' | 'number' | 'date' | 'boolean' | 'file'
}

export default function EditSubmittalPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const { user } = useAuth()
    const [submittal, setSubmittal] = useState<any>(null)
    const [requirements, setRequirements] = useState<ProjectRequirement[]>([])
    const [taskStates, setTaskStates] = useState<Record<number, {
        file: File | null,
        manualValue: string,
        isUploading: boolean,
        result: any | null,
        progress: number
    }>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (user && user.role !== "supplier") {
            router.push("/dashboard/submittals")
            return
        }
        fetchData()
    }, [resolvedParams.id, user])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            // 1. Fetch Submittal directly by ID
            const subResp = await api.get(`/submittals/${resolvedParams.id}`)
            const sub = subResp.data
            setSubmittal(sub)

            if (sub?.project_id) {
                // 2. Fetch Requirements for this project
                const reqResp = await api.get(`/requirements/${sub.project_id}`)

                // 3. Get the requested revisions (field names) from material_data
                const requestedRevisions = sub.material_data?.requested_revisions || []
                const targetCategory = (sub.category || "").trim().toLowerCase()

                // 4. Filter requirements based on:
                //    - Category match
                //    - Field name is in the requested revisions list (if any)
                const filteredReqs = reqResp.data.filter((r: any) => {
                    const matchesCategory = (r.category || "").trim().toLowerCase() === targetCategory
                    const isRequested = requestedRevisions.length > 0
                        ? requestedRevisions.includes(r.field_name)
                        : true
                    return matchesCategory && isRequested
                })

                setRequirements(filteredReqs)

                // 5. Initialize task states
                const initialStates: any = {}
                filteredReqs.forEach((req: ProjectRequirement) => {
                    initialStates[req.id] = { file: null, manualValue: "", isUploading: false, result: null, progress: 0 }
                })
                setTaskStates(initialStates)
            }
        } catch (error) {
            console.error("Failed to fetch data", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileChange = (reqId: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const newFile = e.target.files[0]
            setTaskStates(prev => ({
                ...prev,
                [reqId]: { ...prev[reqId], file: newFile, result: null }
            }))
        }
    }

    const isReadyToSubmit = Object.values(taskStates).some(t => t.file !== null)

    const handleFinalConfirm = async () => {
        setIsSubmitting(true)
        try {
            const formData = new FormData()
            const reqIds: number[] = []

            // We collect files and their corresponding requirement IDs
            Object.entries(taskStates).forEach(([reqId, task]) => {
                if (task.file) {
                    formData.append("files", task.file)
                    reqIds.push(parseInt(reqId))
                }
            })

            formData.append("requirement_ids", JSON.stringify(reqIds))

            await api.post(`/submittals/${resolvedParams.id}/resubmit`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })

            router.push(`/dashboard/submittals/${resolvedParams.id}`)
        } catch (error) {
            console.error("Resubmission failed", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!submittal) {
        return <div className="p-8 text-center">Submittal not found.</div>
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-2 text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Submittal
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">Edit & Resubmit</h2>
                    <p className="text-muted-foreground italic">Updating bundle for <b>{submittal.category}</b> requirements.</p>
                </div>
                <Button
                    size="lg"
                    className="shadow-lg px-8 font-bold bg-blue-600 hover:bg-blue-700"
                    disabled={!isReadyToSubmit || isSubmitting}
                    onClick={handleFinalConfirm}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Confirm Resubmission
                </Button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <div className="h-6 w-1 bg-blue-600 rounded-full" />
                    <h3 className="text-xl font-bold tracking-tight text-foreground/80 uppercase text-[12px]">{submittal.category || "General Requirements"}</h3>
                </div>

                <div className="grid gap-4">
                    {requirements.map((req, index) => {
                        const task = taskStates[req.id] || { file: null, manualValue: "", isUploading: false, result: null, progress: 0 }

                        return (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="overflow-hidden border-2 transition-all shadow-sm">
                                    <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-foreground">{req.field_name}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground italic">{req.description}</p>
                                        </div>

                                        <div className="flex items-center gap-4 min-w-[300px] justify-end">
                                            <div className="w-full max-w-[200px]">
                                                {!task.file ? (
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-10 border-dashed border-2 hover:bg-muted/50 flex items-center gap-2 relative overflow-hidden"
                                                        asChild
                                                    >
                                                        <label className="cursor-pointer">
                                                            <UploadCloud className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-xs font-bold uppercase">Upload New PDF/Image</span>
                                                            <Input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => handleFileChange(req.id, e)} />
                                                        </label>
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-center justify-between p-2 pl-3 bg-blue-50 rounded-lg border border-blue-100 w-full group">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            {task.file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 text-blue-600" /> : <FileText className="h-3 w-3 text-blue-600" />}
                                                            <span className="text-[11px] font-bold truncate max-w-[100px]">{task.file.name}</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                                            onClick={() => setTaskStates(prev => ({ ...prev, [req.id]: { ...prev[req.id], file: null, result: null } }))}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
