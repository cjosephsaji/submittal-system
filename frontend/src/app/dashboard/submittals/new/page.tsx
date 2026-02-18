"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    UploadCloud,
    FileText,
    CheckCircle,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Search,
    Check,
    Image as ImageIcon,
    Bot,
    Trash2,
    Type,
    Hash,
    Calendar,
    Send
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import api from "@/lib/api"
import { useProject } from "@/context/project-context"
import { useAuth } from "@/context/auth-context"

interface ProjectRequirement {
    id: number
    field_name: string
    description: string
    category: string
    field_type: 'text' | 'number' | 'date' | 'boolean' | 'file'
}

interface VerificationResult {
    field_name: string
    status: "PASSED" | "WARNING"
    message: string
}

export default function NewSubmittalPage() {
    const router = useRouter()
    const { selectedProject } = useProject()
    const { user } = useAuth()
    const [requirements, setRequirements] = useState<ProjectRequirement[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [availableCategories, setAvailableCategories] = useState<string[]>([])
    const [taskStates, setTaskStates] = useState<Record<number, {
        files: File[],  // Changed from single file to array of files
        manualValue: string,
        isUploading: boolean,
        result: VerificationResult | null,
        progress: number
    }>>({})
    const [submittalId, setSubmittalId] = useState<number | null>(null)
    const [isSubmittingAll, setIsSubmittingAll] = useState(false)
    const [showMissingRequirementsWarning, setShowMissingRequirementsWarning] = useState(false)

    useEffect(() => {
        if (user && user.role !== "supplier") {
            router.push("/dashboard/submittals")
            return
        }
        if (selectedProject?.id) {
            fetchRequirements()
        }
    }, [selectedProject, user])

    const fetchRequirements = async () => {
        if (!selectedProject?.id) return
        try {
            // Fetch requirements and categories in parallel
            const [reqRes, catRes] = await Promise.all([
                api.get(`requirements/${selectedProject.id}`),
                api.get(`categories/${selectedProject.id}`)
            ])

            setRequirements(reqRes.data)

            // Use categories from API as source of truth
            const categories = catRes.data.map((c: any) => c.name)

            // Add "General Requirements" if there are requirements with no category
            const hasUncategorized = reqRes.data.some((r: any) => !r.category && !r.category_id)
            if (hasUncategorized && !categories.includes("General Requirements")) {
                categories.push("General Requirements")
            }

            setAvailableCategories(categories)

            // Initialize task states
            const initialStates: any = {}
            reqRes.data.forEach((req: ProjectRequirement) => {
                initialStates[req.id] = { files: [], manualValue: "", isUploading: false, result: null, progress: 0 }
            })
            setTaskStates(initialStates)
        } catch (error) {
            console.error("Failed to fetch requirements", error)
        }
    }

    const handleFileChange = (reqId: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            setTaskStates(prev => ({
                ...prev,
                [reqId]: { ...prev[reqId], files: [...prev[reqId].files, ...newFiles], result: null }
            }))
        }
    }

    const handleRemoveFile = (reqId: number, fileIndex: number) => {
        setTaskStates(prev => ({
            ...prev,
            [reqId]: {
                ...prev[reqId],
                files: prev[reqId].files.filter((_, index) => index !== fileIndex)
            }
        }))
    }

    const handleUploadForTask = async (reqId: number) => {
        const task = taskStates[reqId]
        if (!task.files || task.files.length === 0 || !selectedProject) return

        setTaskStates(prev => ({
            ...prev,
            [reqId]: { ...prev[reqId], isUploading: true, progress: 20 }
        }))

        try {
            const formData = new FormData()
            task.files.forEach(file => {
                formData.append("file", file)
            })
            formData.append("project_id", selectedProject.id.toString())

            const response = await api.post("submittals/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })

            // Find the specific result for this requirement in the AI's verification checklist
            // Note: The AI returns results for ALL requirements. We filter for this one.
            const results = response.data.material_data?.verification_checklist || []
            const thisReq = requirements.find(r => r.id === reqId)
            const specificResult = results.find((r: any) => r.field_name === thisReq?.field_name)

            setTaskStates(prev => ({
                ...prev,
                [reqId]: {
                    ...prev[reqId],
                    isUploading: false,
                    progress: 100,
                    result: specificResult || { field_name: thisReq?.field_name || "Unknown", status: "WARNING", message: "AI could not verify this requirement specifically." }
                }
            }))
        } catch (error) {
            console.error("Upload failed", error)
            setTaskStates(prev => ({
                ...prev,
                [reqId]: { ...prev[reqId], isUploading: false, progress: 0 }
            }))
        }
    }

    // Simplified submission check: Ready if at least one file is selected/uploaded OR manual value entered
    const isReadyToSubmit = Object.values(taskStates).some(t => t.files.length > 0 || t.manualValue !== "")

    const handleFinalConfirm = async (skipWarning = false) => {
        if (!selectedProject) return

        // 1. Check for missing requirements in this category
        const missingReqs = filteredRequirements.filter(req => {
            const task = taskStates[req.id]
            return (!task || (task.files.length === 0 && !task.manualValue))
        })

        if (missingReqs.length > 0 && !skipWarning) {
            setShowMissingRequirementsWarning(true)
            return
        }

        setIsSubmittingAll(true)
        setShowMissingRequirementsWarning(false)
        try {
            // Create submittal with files linked to requirements
            const formData = new FormData()
            formData.append("project_id", selectedProject.id.toString())
            formData.append("category", selectedCategory!)

            // Add files and their corresponding requirement IDs
            const fileMetadata: Array<{ requirementId: number, fileName: string }> = []
            requirements.forEach(req => {
                const task = taskStates[req.id]
                if (task && task.files.length > 0) {
                    task.files.forEach(file => {
                        formData.append("files", file)
                        fileMetadata.push({
                            requirementId: req.id,
                            fileName: file.name
                        })
                    })
                }
            })

            // Send file metadata as JSON so backend knows which file belongs to which requirement
            formData.append("file_metadata", JSON.stringify(fileMetadata))

            // Collect text inputs
            const textInputs: Array<{ requirementId: number, value: string }> = []
            requirements.forEach(req => {
                const task = taskStates[req.id]
                if (task && task.manualValue) {
                    textInputs.push({
                        requirementId: req.id,
                        value: task.manualValue
                    })
                }
            })
            formData.append("text_inputs", JSON.stringify(textInputs))

            await api.post("submittals/bundle", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })

            router.push("/dashboard/submittals")
        } catch (error) {
            console.error("Submission failed", error)
        } finally {
            setIsSubmittingAll(false)
        }
    }

    // Filter requirements by selected category
    const filteredRequirements = selectedCategory
        ? requirements.filter(r => (r.category || "General Requirements") === selectedCategory)
        : []

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Category Selection Step */}
            {!selectedCategory ? (
                <div className="max-w-4xl mx-auto">
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-3xl font-bold tracking-tight">Create New Submittal</h2>
                        <p className="text-muted-foreground">Select the category for your submittal to begin.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableCategories.map((category, index) => {
                            const categoryReqs = requirements.filter(r => (r.category || "General Requirements") === category)
                            return (
                                <motion.div
                                    key={category}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card
                                        className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
                                        onClick={() => setSelectedCategory(category)}
                                    >
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                <span className="text-lg">{category}</span>
                                                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </CardTitle>
                                            <CardDescription>
                                                {categoryReqs.length} requirement{categoryReqs.length !== 1 ? 's' : ''} to fulfill
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-1">
                                                {categoryReqs.slice(0, 3).map((req, i) => (
                                                    <Badge key={i} variant="outline" className="text-[10px]">
                                                        {req.field_name}
                                                    </Badge>
                                                ))}
                                                {categoryReqs.length > 3 && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        +{categoryReqs.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>

                    {availableCategories.length === 0 && (
                        <Card className="max-w-md mx-auto">
                            <CardContent className="p-12 text-center">
                                <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="font-bold mb-2">No Categories Available</h3>
                                <p className="text-sm text-muted-foreground">
                                    No project requirements found. Please contact the project administrator to add requirements.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                /* Requirements Upload Step */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCategory(null)}
                                className="mb-2 -ml-2 text-muted-foreground"
                            >
                                <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Change Category
                            </Button>
                            <h2 className="text-3xl font-bold tracking-tight">{selectedCategory}</h2>
                            <p className="text-muted-foreground">Upload specific documents for each required item below.</p>
                        </div>
                        <Button
                            size="lg"
                            className="shadow-lg px-8 font-bold bg-blue-600 hover:bg-blue-700"
                            disabled={!isReadyToSubmit || isSubmittingAll}
                            onClick={() => handleFinalConfirm()}
                        >
                            {isSubmittingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Submit to Contractor
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {filteredRequirements.map((req, index) => {
                            const task = taskStates[req.id] || { file: null, manualValue: "", isUploading: false, result: null, progress: 0 }

                            return (
                                <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className={`overflow-hidden border-2 transition-all shadow-sm hover:shadow-md ${task.result?.status === "PASSED" ? "border-green-500/20 bg-green-50/10" :
                                        task.result?.status === "WARNING" ? "border-orange-500/20 bg-orange-50/10" :
                                            "border-border bg-card"
                                        }`}>
                                        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-foreground">{req.field_name}</span>
                                                    {task.result && (
                                                        <Badge variant={task.result.status === "PASSED" ? "default" : "secondary"} className={
                                                            task.result.status === "PASSED" ? "bg-green-500 text-[10px]" : "bg-orange-500 text-white text-[10px]"
                                                        }>
                                                            {task.result.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground italic">{req.description}</p>
                                            </div>

                                            <div className="flex items-center gap-4 min-w-[300px] justify-end">
                                                {(req.field_type || 'file') === 'file' ? (
                                                    <div className="w-full max-w-[300px]">
                                                        {/* Upload Button - Always visible */}
                                                        <Button
                                                            variant="outline"
                                                            className="w-full h-10 border-dashed border-2 hover:bg-muted/50 flex items-center gap-2 relative overflow-hidden mb-2"
                                                            asChild
                                                        >
                                                            <label className="cursor-pointer">
                                                                <UploadCloud className="h-4 w-4 text-muted-foreground" />
                                                                <span className="text-xs font-bold uppercase">
                                                                    {task.files.length > 0 ? `Add More Files (${task.files.length})` : 'Upload PDF/Image'}
                                                                </span>
                                                                <Input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="application/pdf,image/*"
                                                                    multiple
                                                                    onChange={(e) => handleFileChange(req.id, e)}
                                                                />
                                                            </label>
                                                        </Button>

                                                        {/* Display uploaded files */}
                                                        {task.files.length > 0 && (
                                                            <div className="space-y-1.5 max-h-24 overflow-y-auto">
                                                                {task.files.map((file, fileIndex) => (
                                                                    <div key={fileIndex} className="flex items-center justify-between p-2 pl-3 bg-blue-50 rounded-lg border border-blue-100 w-full group">
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 text-blue-600" /> : <FileText className="h-3 w-3 text-blue-600" />}
                                                                            <span className="text-[11px] font-bold truncate max-w-[140px]">{file.name}</span>
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                                                            onClick={() => handleRemoveFile(req.id, fileIndex)}
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-full max-w-[200px]">
                                                        {req.field_type === 'boolean' ? (
                                                            <Button
                                                                variant={task.manualValue === 'true' ? "default" : "outline"}
                                                                className="w-full h-10 justify-start gap-2"
                                                                onClick={() => setTaskStates(prev => ({ ...prev, [req.id]: { ...prev[req.id], manualValue: task.manualValue === 'true' ? 'false' : 'true' } }))}
                                                            >
                                                                <div className={`h-4 w-4 rounded border flex items-center justify-center ${task.manualValue === 'true' ? 'bg-white text-primary' : ''}`}>
                                                                    {task.manualValue === 'true' && <Check className="h-2 w-2" />}
                                                                </div>
                                                                <span className="text-xs">{task.manualValue === 'true' ? 'Yes' : 'No'}</span>
                                                            </Button>
                                                        ) : (
                                                            <Input
                                                                type={req.field_type === 'number' ? 'number' : req.field_type === 'date' ? 'date' : 'text'}
                                                                placeholder={`Enter value...`}
                                                                className="h-10 text-xs"
                                                                value={task.manualValue}
                                                                onChange={(e) => setTaskStates(prev => ({ ...prev, [req.id]: { ...prev[req.id], manualValue: e.target.value } }))}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            )}
            {/* Missing Requirements Warning Dialog */}
            <Dialog
                open={showMissingRequirementsWarning}
                onOpenChange={setShowMissingRequirementsWarning}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-orange-600 mb-2">
                            <AlertTriangle className="h-6 w-6" />
                            <DialogTitle>Incomplete Requirements</DialogTitle>
                        </div>
                        <DialogDescription className="text-gray-600">
                            You haven't uploaded documents or values for all requirements in this category:
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto px-1">
                                {filteredRequirements.filter(req => {
                                    const task = taskStates[req.id]
                                    return (!task || (task.files.length === 0 && !task.manualValue))
                                }).map(req => (
                                    <div key={req.id} className="text-xs font-bold text-gray-800 flex items-center gap-2 bg-orange-50 p-2 rounded">
                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                        {req.field_name}
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 font-semibold text-gray-900">
                                Are you sure you want to submit this incomplete bundle to the contractor?
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMissingRequirementsWarning(false)}>Go Back</Button>
                        <Button
                            onClick={() => handleFinalConfirm(true)}
                            className="bg-orange-600 hover:bg-orange-700 font-bold"
                        >
                            Yes, Submit Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
