"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    ArrowLeft,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
    RefreshCw,
    Bot,
    CheckCircle2
} from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import api, { STATIC_URL } from "@/lib/api"
import { useAuth } from "@/context/auth-context"

interface VerificationResult {
    field_name: string
    status: "PASSED" | "WARNING"
    message: string
}

interface SubmittalDetail {
    id: number
    title: string
    submittal_number: string
    status: string
    material_data: any;
    documents: {
        id: number;
        filename: string;
        file_path: string;
    }[];
}

export default function ReviewPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [submittal, setSubmittal] = useState<SubmittalDetail | null>(null)
    const [comments, setComments] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (params.id) {
            fetchSubmittal(params.id as string)
        }
    }, [params.id])

    const fetchSubmittal = async (id: string) => {
        try {
            const response = await api.get(`submittals`)
            const found = response.data.find((s: any) => s.id === Number(id))
            setSubmittal(found)
        } catch (error) {
            console.error("Failed to fetch submittal", error)
        }
    }

    const handleAction = async (status: string) => {
        if (!submittal) return
        setIsSubmitting(true)
        try {
            await api.put(`submittals/${submittal.id}/review`, null, {
                params: {
                    status: status,
                    comments: comments
                }
            })
            router.push("/dashboard/submittals")
        } catch (error) {
            console.error("Review failed", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!submittal) return <div className="p-8">Loading review interface...</div>

    const fileUrl = `${STATIC_URL}/${submittal.documents?.[0]?.filename || submittal.title}`;

    const analysis = submittal.material_data?.compliance_analysis || {
        status: "UNKNOWN",
        score: 0,
        issues: ["AI Analysis not available"],
        checked_standards: []
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h1 className="font-semibold text-lg">{submittal.title}</h1>
                    <Badge variant="outline">{submittal.submittal_number}</Badge>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAction("rejected")}
                        disabled={isSubmitting}
                    >
                        <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction("revise_and_resubmit")}
                        disabled={isSubmitting}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" /> Revise
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction("approved")}
                        disabled={isSubmitting}
                    >
                        <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                    </Button>
                </div>
            </header>

            {/* Split View */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">

                {/* Left: PDF Viewer */}
                <ResizablePanel defaultSize={60} minSize={30}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="h-full w-full bg-slate-100 p-4"
                    >
                        <iframe
                            src={fileUrl}
                            className="w-full h-full rounded-md border shadow-sm"
                            title="PDF Viewer"
                        />
                    </motion.div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Right: AI Compliance Matrix */}
                <ResizablePanel defaultSize={40} minSize={25}>
                    <ScrollArea className="h-full">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="p-6 space-y-6"
                        >

                            {/* AI Score Card */}
                            <Card className="border-l-4 border-l-primary/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex justify-between items-center">
                                        AI Compliance Score
                                        <span className={`text-2xl font-bold ${analysis.score > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {analysis.score}%
                                        </span>
                                    </CardTitle>
                                    <CardDescription>Automated pre-screening results</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2 mb-4">
                                        {analysis.status === "APPROVED" && <Badge className="bg-green-100 text-green-800">Likely Compliant</Badge>}
                                        {analysis.status === "REJECTED" && <Badge variant="destructive">Non-Compliant Issues</Badge>}
                                    </div>
                                    <div className="text-sm font-medium text-muted-foreground mb-2">Checked Standards:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.checked_standards?.map((std: string) => (
                                            <Badge key={std} variant="secondary">{std}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI-Derived Verification Checklist */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Bot className="h-4 w-4" />
                                    AI Requirement Verification
                                </h3>
                                <div className="space-y-2">
                                    {submittal.material_data?.verification_checklist?.map((res: any, i: number) => (
                                        <div
                                            key={i}
                                            className={`p-3 border rounded-lg flex items-center justify-between shadow-sm ${res.status === "PASSED" ? "border-green-100 bg-green-50/50" : "border-orange-100 bg-orange-50/50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 text-sm">
                                                {res.status === "PASSED" ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                                )}
                                                <span className="font-medium">{res.field_name}</span>
                                            </div>
                                            <Badge variant={res.status === "PASSED" ? "default" : "secondary"} className="text-[10px] h-5">
                                                {res.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {!submittal.material_data?.verification_checklist && (
                                        <div className="text-sm text-muted-foreground italic">No targeted requirements defined for this project.</div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Critical Issues */}
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    General Scan Issues
                                </h3>
                                {analysis.issues?.length === 0 ? (
                                    <div className="p-4 border rounded-md bg-green-50 text-green-800 text-sm flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" /> No critical issues detected.
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {analysis.issues?.map((issue: string, idx: number) => (
                                            <li key={idx} className="p-3 bg-red-50 text-red-900 text-sm rounded-md border border-red-100 flex gap-2">
                                                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                                {issue}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <Separator />

                            {/* Engineer Comments */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Engineer Comments
                                </h3>
                                <Textarea
                                    placeholder="Add specific notes for the contractor..."
                                    className="min-h-[150px]"
                                    value={comments}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                                />
                            </div>

                        </motion.div>
                    </ScrollArea>
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    )
}
