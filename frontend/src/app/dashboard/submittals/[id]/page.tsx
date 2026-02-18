"use client"

import { useEffect, useState, use } from "react"
import { motion } from "framer-motion"
import {
    FileText,
    Calendar,
    User,
    CheckCircle2,
    AlertCircle,
    Clock,
    Send,
    Check,
    X,
    Undo2,
    Building2,
    ExternalLink,
    Loader2,
    Plus
} from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import api, { STATIC_URL } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { ExtractedDataDisplay } from "@/components/ExtractedDataDisplay"
import { AuditTimeline } from "@/components/AuditTimeline"

interface Document {
    id: number
    filename: string
    file_path: string
    requirement_id?: number
}

interface Submittal {
    id: number
    title: string
    submittal_number: string
    status: string
    category: string
    ai_processing_status: string
    created_at: string
    material_data: any
    documents: Document[]
    project: {
        id: number
        name: string
    }
}

export default function SubmittalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const { user } = useAuth()
    const router = useRouter()
    const [submittal, setSubmittal] = useState<Submittal | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const [comments, setComments] = useState("")
    const [selectedRequirements, setSelectedRequirements] = useState<number[]>([])

    useEffect(() => {
        fetchSubmittal()
    }, [resolvedParams.id])

    const fetchSubmittal = async (showLoading = true) => {
        if (showLoading) setIsLoading(true)
        try {
            const response = await api.get(`submittals/${resolvedParams.id}`)
            setSubmittal(response.data)
        } catch (error) {
            console.error("Failed to fetch submittal", error)
        } finally {
            if (showLoading) setIsLoading(false)
        }
    }

    // Polling for AI Status
    useEffect(() => {
        if (submittal?.ai_processing_status === "PROCESSING") {
            const interval = setInterval(() => {
                fetchSubmittal(false)
            }, 3000)
            return () => clearInterval(interval)
        }
    }, [submittal?.ai_processing_status])

    const handleAction = async (action: string) => {
        setIsUpdating(true)
        try {
            let endpoint = ""
            if (action === "submit-to-contractor") endpoint = `submittals/${resolvedParams.id}/submit-to-contractor`
            if (action === "forward-to-engineer") endpoint = `submittals/${resolvedParams.id}/forward-to-engineer`

            if (endpoint) {
                await api.patch(endpoint)
            } else {
                // Review actions (Approve/Reject)
                // Convert selected indices to field names for the backend
                const verification_checklist = submittal?.material_data?.verification_checklist || []
                const requestedFieldNames = selectedRequirements.map((index: number) =>
                    verification_checklist[index]?.field_name
                ).filter(Boolean)

                await api.put(`submittals/${resolvedParams.id}/review`, {
                    status: action,
                    comments,
                    requested_revisions: action === "REVISE_AND_RESUBMIT" ? requestedFieldNames : []
                })
            }
            fetchSubmittal()
            setComments("")
            setSelectedRequirements([])
        } catch (error) {
            console.error(`Failed to perform ${action}`, error)
        } finally {
            setIsUpdating(false)
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

    const statusMap: any = {
        DRAFT: { color: "bg-gray-500", icon: Clock, label: "Draft" },
        SUBMITTED_TO_CONTRACTOR: { color: "bg-blue-500", icon: Send, label: "Submitted to Contractor" },
        FORWARDED_TO_ENGINEER: { color: "bg-orange-500", icon: Send, label: "Forwarded to Engineer" },
        APPROVED: { color: "bg-green-500", icon: CheckCircle2, label: "Approved" },
        REJECTED: { color: "bg-red-500", icon: AlertCircle, label: "Rejected" },
        REVISE_AND_RESUBMIT: { color: "bg-purple-500", icon: Undo2, label: "Revise & Resubmit" }
    }

    const currentStatus = statusMap[submittal.status] || { color: "bg-gray-500", icon: Clock, label: submittal.status }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-bold">{submittal.submittal_number}</Badge>
                        <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">{submittal.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium italic text-black"><Building2 className="h-4 w-4" /> Project {submittal.project?.name || "N/A"}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {format(new Date(submittal.created_at), "MMM d, yyyy")}</span>
                    </div>

                    {submittal.material_data?.review_comments && (
                        <div className="mt-4 p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-1">
                                <AlertCircle className="h-3 w-3" />
                                Reviewer Comments
                            </h4>
                            <p className="text-sm font-medium">{submittal.material_data.review_comments}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {/* Action Buttons based on Role & Status */}
                    {user?.role === "supplier" && submittal.status === "DRAFT" && (
                        <Button onClick={() => handleAction("submit-to-contractor")} disabled={isUpdating}>
                            <Send className="mr-2 h-4 w-4" /> Submit to Contractor
                        </Button>
                    )}

                    {user?.role === "supplier" && submittal.status === "REVISE_AND_RESUBMIT" && (
                        <Button onClick={() => router.push(`/dashboard/submittals/${submittal.id}/edit`)} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Edit & Resubmit
                        </Button>
                    )}

                    {user?.role === "contractor" && submittal.status === "SUBMITTED_TO_CONTRACTOR" && (
                        <Button onClick={() => handleAction("forward-to-engineer")} disabled={isUpdating}>
                            <Send className="mr-2 h-4 w-4" /> Forward to Engineer
                        </Button>
                    )}

                    {(user?.role === "consultant_engineer" || user?.role === "consultant_admin") &&
                        submittal.status === "FORWARDED_TO_ENGINEER" && (
                            <div className="flex gap-2">
                                <RejectDialog
                                    comments={comments}
                                    setComments={setComments}
                                    onConfirm={() => handleAction("REJECTED")}
                                    isUpdating={isUpdating}
                                />

                                <ReviseDialog
                                    comments={comments}
                                    setComments={setComments}
                                    onConfirm={() => handleAction("REVISE_AND_RESUBMIT")}
                                    isUpdating={isUpdating}
                                    requirements={submittal.material_data?.verification_checklist || []}
                                    selectedRequirements={selectedRequirements}
                                    setSelectedRequirements={setSelectedRequirements}
                                />

                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAction("APPROVED")} disabled={isUpdating}>
                                    <Check className="mr-2 h-4 w-4" /> Approve
                                </Button>
                            </div>
                        )}
                </div>
            </div>

            <Separator />

            <div className="space-y-6">
                <Card className="shadow-md overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    {submittal.category || "General"} Requirements Verification
                                </CardTitle>
                                <CardDescription>Technical checklist verified by AI against uploaded documents.</CardDescription>
                            </div>
                            {submittal.ai_processing_status === "PROCESSING" && (
                                <Badge variant="outline" className="animate-pulse flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200">
                                    <Loader2 className="h-3 w-3 animate-spin" /> AI Analyzing...
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {submittal.ai_processing_status === "PROCESSING" ? (
                            <div className="p-16 text-center space-y-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto opacity-50" />
                                <div className="space-y-1">
                                    <h4 className="font-bold text-lg">Verification In Progress</h4>
                                    <p className="text-sm text-muted-foreground italic max-w-md mx-auto">
                                        The AI is cross-referencing your documents with the project's compliance matrix. This usually takes 10-20 seconds.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                {submittal.material_data?.verification_checklist && submittal.material_data.verification_checklist.length > 0 ? (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-slate-50 to-gray-50">
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-20">
                                                    Item No.
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/4">
                                                    Requirement
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/3">
                                                    Description / AI Findings
                                                </th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-32">
                                                    Status
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/5">
                                                    Evidence / Reference
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {submittal.material_data.verification_checklist.map((check: any, i: number) => (
                                                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                    {/* Item Number */}
                                                    <td className="px-6 py-5 text-sm font-semibold text-gray-700">
                                                        {String(i + 1).padStart(2, '0')}
                                                    </td>

                                                    {/* Requirement */}
                                                    <td className="px-6 py-5">
                                                        <div className="font-semibold text-gray-900 text-sm leading-tight">
                                                            {check.field_name}
                                                        </div>
                                                    </td>

                                                    {/* Description */}
                                                    <td className="px-6 py-5">
                                                        <div className="text-sm text-gray-600 leading-relaxed">
                                                            {check.manual_value ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-bold text-blue-700">Supplier provided:</span>
                                                                    <span className="bg-blue-50 p-2 rounded border border-blue-100 italic">{check.manual_value}</span>
                                                                </div>
                                                            ) : (
                                                                check.message || check.description || "No additional information"
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-5 text-center">
                                                        {check.status === "PASSED" ? (
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 border border-green-300">
                                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Verified</span>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 border border-orange-300">
                                                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                                                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Not Found</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Evidence/Documents */}
                                                    <td className="px-6 py-5">
                                                        {(() => {
                                                            // Filter documents for this specific requirement
                                                            const requirementDocs = submittal.documents?.filter(
                                                                doc => doc.requirement_id === check.requirement_id
                                                            ) || [];

                                                            if (requirementDocs.length > 0) {
                                                                return (
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {requirementDocs.map((doc) => (
                                                                            <a
                                                                                key={doc.id}
                                                                                href={`${STATIC_URL}/${doc.filename}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs border border-blue-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                                                                            >
                                                                                <FileText className="h-3 w-3 text-blue-500" />
                                                                                <span className="text-gray-700 max-w-[120px] truncate">
                                                                                    {doc.filename.split('.').slice(0, -1).join('.')}
                                                                                </span>
                                                                                <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-500" />
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            } else if (check.status === "PASSED") {
                                                                return (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                        <CheckCircle2 className="h-4 w-4 text-gray-400" />
                                                                        <span className="italic">Verified in general docs</span>
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                                                        <span className="italic">No specific file</span>
                                                                    </div>
                                                                );
                                                            }
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    submittal.ai_processing_status === "COMPLETED" && (
                                        <div className="p-12 text-center space-y-3">
                                            <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                                            <p className="text-sm text-muted-foreground italic">
                                                No verification results found. This might be because the AI couldn't identify any matching requirements in the provided documents.
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Issues section (if any) */}
                {submittal.material_data?.issues?.length > 0 && (
                    <Card className="border-red-100 bg-red-50/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2 uppercase tracking-tight">
                                <AlertCircle className="h-4 w-4" /> Supporting AI Observations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {submittal.material_data.issues.map((issue: string, i: number) => (
                                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                        {issue}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                {/* Extracted Structured Data Section */}
                <Card className="shad ow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Extracted Technical Data
                        </CardTitle>
                        <CardDescription>AI-extracted material information, manufacturer details, standards, and tables from uploaded documents.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ExtractedDataDisplay
                            materialData={submittal.material_data}
                            aiProcessingStatus={submittal.ai_processing_status}
                        />
                    </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card className="shadow-md overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Activity History
                        </CardTitle>
                        <CardDescription>Complete timeline of all actions and events for this submittal.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <AuditTimeline submittalId={resolvedParams.id as unknown as number} />
                    </CardContent>
                </Card>
            </div>
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
    DialogTrigger
} from "@/components/ui/dialog"

function RejectDialog({
    comments,
    setComments,
    onConfirm,
    isUpdating
}: any) {
    const [open, setOpen] = useState(false)

    const handleConfirm = async () => {
        await onConfirm()
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <X className="mr-2 h-4 w-4" /> Reject
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm Rejection</DialogTitle>
                    <DialogDescription>
                        Please provide a reason or specific feedback for this decision.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="reject-comments" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Instructions</Label>
                        <Textarea
                            id="reject-comments"
                            placeholder="Provide details here..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="h-24 resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="destructive"
                        disabled={!comments || isUpdating}
                        onClick={handleConfirm}
                        className="w-full sm:w-auto"
                    >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirm Action
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ReviseDialog({
    comments,
    setComments,
    onConfirm,
    isUpdating,
    requirements = [],
    selectedRequirements = [],
    setSelectedRequirements
}: any) {
    const [open, setOpen] = useState(false)

    const toggleRequirement = (index: number) => {
        if (selectedRequirements.includes(index)) {
            setSelectedRequirements(selectedRequirements.filter((i: number) => i !== index))
        } else {
            setSelectedRequirements([...selectedRequirements, index])
        }
    }

    const handleConfirm = async () => {
        await onConfirm()
        setOpen(false)
        setSelectedRequirements([])
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                    <Undo2 className="mr-2 h-4 w-4" /> Revise & Resubmit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Request Revision</DialogTitle>
                    <DialogDescription>
                        Select which items need revision and provide instructions.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">Items to Resubmit</Label>
                        <div className="grid gap-2 max-h-[200px] overflow-y-auto p-1">
                            {requirements.map((req: any, index: number) => (
                                <div
                                    key={index}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedRequirements.includes(index)
                                        ? "bg-purple-50 border-purple-200"
                                        : "hover:bg-muted/50"
                                        }`}
                                    onClick={() => toggleRequirement(index)}
                                >
                                    <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${selectedRequirements.includes(index)
                                        ? "bg-purple-600 border-purple-600 text-white"
                                        : "bg-background border-slate-300"
                                        }`}>
                                        {selectedRequirements.includes(index) && <Check className="h-3 w-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium leading-none truncate">{req.field_name}</div>
                                        <div className="text-[10px] text-muted-foreground mt-1 truncate">Currently: {req.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Separator />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="revise-comments" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detailed Instructions</Label>
                        <Textarea
                            id="revise-comments"
                            placeholder="Specify what needs to be changed for each selected item..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="h-24 resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="default"
                        disabled={!comments || selectedRequirements.length === 0 || isUpdating}
                        onClick={handleConfirm}
                        className="w-full sm:w-auto"
                    >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Send Revision Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
