import React, { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    FileText,
    Upload,
    Loader,
    Database,
    CheckCircle,
    AlertCircle,
    Send,
    ArrowRight,
    CheckCircle2,
    XCircle,
    RotateCcw,
    MessageSquare,
    User as UserIcon
} from 'lucide-react';
import api from '@/lib/api';

interface AuditUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface AuditEvent {
    id: number;
    action: string;
    created_at: string;
    user: AuditUser | null;
    details: Record<string, any>;
}

interface AuditTimelineProps {
    submittalId: number;
}

// Event type configuration with icons and colors
const EVENT_CONFIG: Record<string, { icon: any; color: string; label: string; bgColor: string }> = {
    SUBMITTAL_CREATED: { icon: FileText, color: 'text-blue-600', label: 'Submittal Created', bgColor: 'bg-blue-50' },
    DOCUMENT_UPLOADED: { icon: Upload, color: 'text-blue-600', label: 'Document Uploaded', bgColor: 'bg-blue-50' },
    AI_PROCESSING_STARTED: { icon: Loader, color: 'text-yellow-600', label: 'AI Processing Started', bgColor: 'bg-yellow-50' },
    AI_DATA_EXTRACTED: { icon: Database, color: 'text-green-600', label: 'Data Extracted', bgColor: 'bg-green-50' },
    AI_REQUIREMENTS_VERIFIED: { icon: CheckCircle, color: 'text-green-600', label: 'Requirements Verified', bgColor: 'bg-green-50' },
    AI_PROCESSING_COMPLETED: { icon: CheckCircle, color: 'text-green-600', label: 'Processing Complete', bgColor: 'bg-green-50' },
    AI_PROCESSING_FAILED: { icon: AlertCircle, color: 'text-red-600', label: 'Processing Failed', bgColor: 'bg-red-50' },
    STATUS_SUBMITTED_TO_CONTRACTOR: { icon: Send, color: 'text-blue-600', label: 'Submitted to Contractor', bgColor: 'bg-blue-50' },
    STATUS_FORWARDED_TO_ENGINEER: { icon: ArrowRight, color: 'text-blue-600', label: 'Forwarded to Engineer', bgColor: 'bg-blue-50' },
    STATUS_APPROVED: { icon: CheckCircle2, color: 'text-green-600', label: 'Approved', bgColor: 'bg-green-50' },
    STATUS_REJECTED: { icon: XCircle, color: 'text-red-600', label: 'Rejected', bgColor: 'bg-red-50' },
    STATUS_REVISE_RESUBMIT: { icon: RotateCcw, color: 'text-purple-600', label: 'Revise & Resubmit', bgColor: 'bg-purple-50' },
    REVIEW_SUBMITTED: { icon: MessageSquare, color: 'text-purple-600', label: 'Review Submitted', bgColor: 'bg-purple-50' },
};

// Get user initials for avatar
function getUserInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

//  Role display names
const ROLE_LABELS: Record<string, string> = {
    supplier: 'Vendor',
    contractor: 'Contractor',
    consultant_engineer: 'Engineer',
    consultant_admin: 'Admin',
    super_admin: 'Super Admin'
};

export function AuditTimeline({ submittalId }: AuditTimelineProps) {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchAuditTrail();
    }, [submittalId]);

    const fetchAuditTrail = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`submittals/${submittalId}/audit-trail`);
            setEvents(response.data.events || []);
        } catch (error) {
            console.error('Failed to fetch audit trail', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleEventExpanded = (eventId: number) => {
        setExpandedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center p-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No activity recorded yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Activity Timeline
            </h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Events */}
                <div className="space-y-4">
                    {events.map((event, index) => {
                        const config = EVENT_CONFIG[event.action] || {
                            icon: AlertCircle,
                            color: 'text-gray-600',
                            label: event.action,
                            bgColor: 'bg-gray-50'
                        };
                        const Icon = config.icon;
                        const isExpanded = expandedEvents.has(event.id);
                        const hasDetails = event.details && Object.keys(event.details).length > 0;

                        return (
                            <div key={event.id} className="relative flex gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center border-2 border-white shadow-sm z-10`}>
                                    <Icon className={`h-5 w-5 ${config.color}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${hasDetails ? 'cursor-pointer' : ''}`}
                                        onClick={() => hasDetails && toggleEventExpanded(event.id)}>
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900">{config.label}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* User info */}
                                        {event.user ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {getUserInitials(event.user.name)}
                                                </div>
                                                <span className="text-sm text-gray-700 font-medium">{event.user.name}</span>
                                                <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
                                                    {ROLE_LABELS[event.user.role] || event.user.role}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs">
                                                    <Loader className="h-3 w-3" />
                                                </div>
                                                <span className="text-sm text-gray-500 italic">AI System</span>
                                            </div>
                                        )}

                                        {/* Expandable Details */}
                                        {hasDetails && isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                                {Object.entries(event.details).map(([key, value]) => (
                                                    <div key={key} className="flex gap-2 text-sm">
                                                        <span className="font-medium text-gray-600 min-w-[120px]">
                                                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                                        </span>
                                                        <span className="text-gray-900">
                                                            {Array.isArray(value) ? value.join(', ') : String(value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Expand indicator */}
                                        {hasDetails && (
                                            <div className="mt-2 text-xs text-gray-400">
                                                {isExpanded ? 'Click to collapse' : 'Click to view details'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
