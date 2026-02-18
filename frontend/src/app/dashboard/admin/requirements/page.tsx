"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Plus,
    Brain,
    Trash2,
    Info,
    CheckCircle2,
    Loader2,
    Bot,
    Type,
    Hash,
    Calendar,
    FileText,
    Users,
    Package,
    ChevronDown,
    ChevronUp
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { useProject } from "@/context/project-context"

interface Requirement {
    id: number
    raw_requirement: string
    field_name: string
    description: string
    category: string
    category_id: number | null
    field_type: string
}

interface Category {
    id: number
    name: string
    assigned_vendor_id: number | null
    assigned_vendor: {
        id: number
        full_name: string
        email: string
    } | null
}

export default function RequirementsAdmin() {
    const { selectedProject } = useProject()

    // Data State
    const [categories, setCategories] = useState<Category[]>([])
    const [requirements, setRequirements] = useState<Requirement[]>([])
    const [users, setUsers] = useState<any[]>([])

    // UI State
    const [isLoading, setIsLoading] = useState(false)
    const [activeCategory, setActiveCategory] = useState<string | null>(null) // For requirement creation

    // New Category Form
    const [newCatName, setNewCatName] = useState("")
    const [newCatVendor, setNewCatVendor] = useState("")
    const [isCreatingCat, setIsCreatingCat] = useState(false)
    const [userSearchText, setUserSearchText] = useState("")

    // Requirement Drafts
    const [drafts, setDrafts] = useState<{ id: string, fieldName: string, description: string, fieldType: string, isSuggesting: boolean, suggestedData: any }[]>([])
    const [isAddingReqs, setIsAddingReqs] = useState(false)

    useEffect(() => {
        if (selectedProject?.id) {
            fetchData()
            fetchUsers()
        }
    }, [selectedProject])

    const fetchData = async () => {
        if (!selectedProject?.id) return
        setIsLoading(true)
        try {
            const [reqRes, catRes] = await Promise.all([
                api.get(`requirements/${selectedProject.id}`),
                api.get(`categories/${selectedProject.id}`)
            ])
            setRequirements(reqRes.data)
            setCategories(catRes.data)
        } catch (error) {
            console.error("Fetch error", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchUsers = async () => {
        try {
            const res = await api.get("users?role=supplier")
            setUsers(res.data)
        } catch (error) {
            console.error("User fetch error", error)
        }
    }

    // --- Category Management ---
    const handleCreateCategory = async () => {
        if (!newCatName || !selectedProject) return
        setIsCreatingCat(true)
        try {
            const res = await api.post(`categories/${selectedProject.id}`, {
                name: newCatName,
                assigned_vendor_id: newCatVendor ? parseInt(newCatVendor) : null
            })
            setCategories([...categories, res.data])
            setNewCatName("")
            setNewCatVendor("")
            setUserSearchText("")
        } catch (error) {
            console.error("Cat create error", error)
        } finally {
            setIsCreatingCat(false)
        }
    }

    const handleDeleteCategory = async (id: number) => {
        if (!confirm("Are you sure you want to delete this category? Linked requirements will be unassigned.")) return
        try {
            await api.delete(`categories/${id}`)
            setCategories(categories.filter(c => c.id !== id))
            if (categories.find(c => c.id === id)?.name === activeCategory) {
                setActiveCategory(null)
            }
        } catch (error) {
            console.error("Delete category error", error)
        }
    }

    // Filtered users for vendor search
    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(userSearchText.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(userSearchText.toLowerCase()))
    )

    // --- Requirement Management ---
    const addDraft = () => {
        setDrafts([...drafts, {
            id: crypto.randomUUID(),
            fieldName: "",
            description: "",
            fieldType: "file",
            isSuggesting: false,
            suggestedData: null
        }])
    }

    const removeDraft = (id: string) => {
        setDrafts(drafts.filter(d => d.id !== id))
    }

    const updateDraft = (id: string, updates: any) => {
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    }

    const handleSuggest = async (draftId: string) => {
        const draft = drafts.find(d => d.id === draftId)
        if (!draft?.fieldName || !selectedProject?.id) return

        updateDraft(draftId, { isSuggesting: true })
        try {
            const response = await api.post(`requirements/${selectedProject.id}/suggest`, { sentence: draft.fieldName })
            updateDraft(draftId, { suggestedData: response.data })
        } catch (error) {
            console.error("Suggest error", error)
        } finally {
            updateDraft(draftId, { isSuggesting: false })
        }
    }

    const applySuggestion = (draftId: string) => {
        const draft = drafts.find(d => d.id === draftId)
        if (draft?.suggestedData) {
            updateDraft(draftId, {
                fieldName: draft.suggestedData.field_name,
                description: draft.suggestedData.description,
                suggestedData: null
            })
        }
    }

    const handleBulkSave = async () => {
        if (!activeCategory || drafts.length === 0 || !selectedProject) return

        const categoryObj = categories.find(c => c.name === activeCategory)
        const categoryId = categoryObj ? categoryObj.id : null

        setIsAddingReqs(true)
        try {
            const promises = drafts.map(d =>
                api.post(`requirements/${selectedProject.id}`, {
                    raw_requirement: d.fieldName,
                    field_name: d.fieldName,
                    description: d.description,
                    category: activeCategory, // Legacy string
                    category_id: categoryId,
                    field_type: d.fieldType
                })
            )

            const results = await Promise.all(promises)
            setRequirements([...requirements, ...results.map(r => r.data)])
            setDrafts([])
        } catch (error) {
            console.error("Bulk add error", error)
        } finally {
            setIsAddingReqs(false)
        }
    }

    // Helper to start editing a category
    const startEditingCategory = (catName: string) => {
        setActiveCategory(catName)
        if (drafts.length === 0) addDraft()
    }

    const handleDeleteRequirement = async (id: number) => {
        if (!confirm("Are you sure you want to delete this requirement?")) return
        try {
            await api.delete(`requirements/${id}`)
            setRequirements(requirements.filter(r => r.id !== id))
        } catch (error) {
            console.error("Delete requirement error", error)
        }
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Trade Packages & Requirements</h2>
                    <p className="text-muted-foreground">Manage trade categories, assign vendors, and define compliance checklists.</p>
                </div>
            </div>

            {/* 1. Category Management Section */}
            <Card className="shadow-md border-primary/10">
                <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        1. Define Trade Categories
                    </CardTitle>
                    <CardDescription>Create packages (e.g. "HVAC", "Concrete") and assign a responsible vendor.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 flex-1 w-full">
                            <Label>Category Name</Label>
                            <Input
                                placeholder="e.g. Electrical, Plumbing"
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 flex-1 w-full relative">
                            <Label>Assign Vendor (Optional)</Label>
                            <div className="relative">
                                <Input
                                    placeholder="Search vendor..."
                                    value={userSearchText}
                                    onChange={(e) => {
                                        setUserSearchText(e.target.value)
                                        setNewCatVendor("") // Clear selection on type
                                    }}
                                />
                                {userSearchText && !newCatVendor && filteredUsers.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                        {filteredUsers.map(u => (
                                            <div
                                                key={u.id}
                                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                onClick={() => {
                                                    setNewCatVendor(u.id.toString())
                                                    setUserSearchText(u.full_name || u.email)
                                                }}
                                            >
                                                <div className="font-medium">{u.full_name}</div>
                                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button onClick={handleCreateCategory} disabled={!newCatName || isCreatingCat}>
                            {isCreatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Create Category
                        </Button>
                    </div>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                onClick={() => startEditingCategory(cat.name)}
                                className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${activeCategory === cat.name ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-background hover:bg-muted/50'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="font-bold">{cat.name}</Badge>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteCategory(cat.id)
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    <span className="font-bold uppercase text-[10px]">Vendor:</span> <br />
                                    {cat.assigned_vendor ? (
                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                            <Users className="h-3 w-3" /> {cat.assigned_vendor.full_name || cat.assigned_vendor.email}
                                        </span>
                                    ) : (
                                        <span className="text-orange-400 italic">Unassigned</span>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {requirements.filter(r => r.category === cat.name).length} requirements
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Bulk Requirement Editor */}
            {activeCategory && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="shadow-lg border-t-4 border-t-primary">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    2. Add Requirements for <span className="underline decoration-primary/30">{activeCategory}</span>
                                </CardTitle>
                                <CardDescription>Define the compliance checklist for this trade package.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setActiveCategory(null)}>Cancel</Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Existing Requirements List */}
                            <div className="space-y-2 mb-8">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Existing Requirements</h4>
                                {requirements.filter(r => r.category === activeCategory).length === 0 ? (
                                    <div className="text-sm italic text-muted-foreground p-2">No requirements yet. Add some below.</div>
                                ) : (
                                    <div className="grid gap-2">
                                        {requirements.filter(r => r.category === activeCategory).map(req => (
                                            <div key={req.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                                    <span className="font-medium text-sm">{req.field_name}</span>
                                                    <Badge variant="outline" className="text-[10px]">{req.field_type}</Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                    onClick={() => handleDeleteRequirement(req.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary">New Requirements</h4>
                                    <Button variant="ghost" size="sm" onClick={addDraft} className="h-8 gap-2">
                                        <Plus className="h-3 w-3" /> Add Row
                                    </Button>
                                </div>

                                {drafts.map((draft, idx) => (
                                    <div key={draft.id} className="grid md:grid-cols-12 gap-4 p-4 border rounded-xl bg-card hover:shadow-sm transition-all items-start">
                                        <div className="md:col-span-4 space-y-2">
                                            <div className="flex justify-between">
                                                <Label className="text-[10px] uppercase">Field Name</Label>
                                                <Button
                                                    variant="link"
                                                    className="h-auto p-0 text-[10px] text-primary"
                                                    onClick={() => handleSuggest(draft.id)}
                                                    disabled={draft.isSuggesting || !draft.fieldName}
                                                >
                                                    {draft.isSuggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto-Suggest"}
                                                </Button>
                                            </div>
                                            <Input
                                                value={draft.fieldName}
                                                onChange={(e) => updateDraft(draft.id, { fieldName: e.target.value })}
                                                placeholder="e.g. Concrete Strength Report"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="md:col-span-6 space-y-2">
                                            <Label className="text-[10px] uppercase">Description</Label>
                                            <Input
                                                value={draft.description}
                                                onChange={(e) => updateDraft(draft.id, { description: e.target.value })}
                                                placeholder="What needs to be verified?"
                                                className="h-9"
                                            />
                                            {draft.suggestedData && (
                                                <div className="flex items-center justify-between bg-primary/5 p-2 rounded border border-primary/20">
                                                    <span className="text-[10px] text-primary truncate max-w-[200px]">
                                                        AI: {draft.suggestedData.description.substring(0, 50)}...
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateDraft(draft.id, { suggestedData: null })}><Trash2 className="h-3 w-3" /></Button>
                                                        <Button size="icon" className="h-5 w-5 bg-primary" onClick={() => applySuggestion(draft.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="md:col-span-2 space-y-2 flex flex-col h-full justify-between">
                                            <Label className="text-[10px] uppercase">Type & Action</Label>
                                            <div className="flex gap-2">
                                                <Select value={draft.fieldType} onValueChange={(v) => updateDraft(draft.id, { fieldType: v })}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="file">File</SelectItem>
                                                        <SelectItem value="text">Text</SelectItem>
                                                        <SelectItem value="date">Date</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:bg-red-50" onClick={() => removeDraft(draft.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-4 flex justify-end gap-4">
                                    <Button variant="outline" onClick={() => setDrafts([])}>Clear Drafts</Button>
                                    <Button onClick={handleBulkSave} disabled={drafts.length === 0 || isAddingReqs} className="min-w-[150px]">
                                        {isAddingReqs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                        Save All Requirements
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    )
}
