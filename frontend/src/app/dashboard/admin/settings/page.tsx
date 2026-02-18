"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Bot,
    Settings,
    Zap,
    CheckCircle2,
    ShieldCheck,
    Loader2
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [provider, setProvider] = useState<string>("openai")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setIsLoading(true)
        try {
            const response = await api.get("admin/settings")
            if (response.data.preferred_ai_provider) {
                setProvider(response.data.preferred_ai_provider)
            }
        } catch (error) {
            console.error("Failed to fetch settings", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await api.put("admin/settings", {
                key: "preferred_ai_provider",
                value: provider
            })
            toast({
                title: "Settings Saved",
                description: `AI Provider successfully switched to ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'}.`,
            })
        } catch (error) {
            console.error("Failed to save settings", error)
            toast({
                title: "Error",
                description: "Failed to save settings. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                    <p className="text-muted-foreground">Manage global configurations and AI preferences.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="font-bold shadow-lg">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6">
                <Card className="border-2 border-primary/10 shadow-md">
                    <CardHeader className="bg-muted/5 border-b">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            <CardTitle>AI Provider Selection</CardTitle>
                        </div>
                        <CardDescription>Choose the primary Artificial Intelligence engine for document analysis and verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <RadioGroup value={provider} onValueChange={setProvider} className="grid md:grid-cols-2 gap-4">
                            <Label
                                htmlFor="openai"
                                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 cursor-pointer hover:bg-muted/5 transition-all ${provider === "openai" ? "border-primary bg-primary/5" : "border-transparent bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="openai" id="openai" />
                                        <span className="font-bold text-lg">OpenAI (GPT-4o)</span>
                                    </div>
                                    {provider === "openai" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                </div>
                                <p className="text-sm text-muted-foreground pl-6">
                                    Industry-leading reasoning and vision capabilities. excellent for complex engineering documents.
                                </p>
                                <div className="pl-6 pt-2">
                                    <Badge variant="outline" className="bg-white">GPT-4o</Badge>
                                </div>
                            </Label>

                            <Label
                                htmlFor="gemini"
                                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 cursor-pointer hover:bg-muted/5 transition-all ${provider === "gemini" ? "border-primary bg-primary/5" : "border-transparent bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="gemini" id="gemini" />
                                        <span className="font-bold text-lg">Google Gemini</span>
                                    </div>
                                    {provider === "gemini" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                </div>
                                <p className="text-sm text-muted-foreground pl-6">
                                    Google's most capable multimodal model. Fast processing and large context window support.
                                </p>
                                <div className="pl-6 pt-2">
                                    <Badge variant="outline" className="bg-white">Gemini 1.5 Pro</Badge>
                                </div>
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Placeholder for future settings */}
                <Card className="opacity-50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            <CardTitle>Security & Compliance</CardTitle>
                        </div>
                        <CardDescription>Configure retention policies and access controls (Coming Soon).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Additional system settings will be available in future updates.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
