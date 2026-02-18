import React from 'react';
import { DataTable } from './DataTable';

interface MaterialInfo {
    name?: string;
    description?: string;
    grade?: string;
    specifications?: string;
}

interface ManufacturerInfo {
    name?: string;
    contact?: string;
    certifications?: string;
}

interface ExtractionMetadata {
    confidence_score?: number;
    processed_files?: number;
    extraction_timestamp?: string;
    has_tables?: boolean;
    error?: string;
}

interface TableData {
    title: string;
    headers: string[];
    rows: any[][];
    page_number?: number;
    source_file?: string;
}

interface MaterialData {
    material_info?: MaterialInfo;
    manufacturer_info?: ManufacturerInfo;
    standards?: string[];
    tables?: TableData[];
    document_data?: any;
    warnings?: string[];
    extraction_metadata?: ExtractionMetadata;
    verification_checklist?: any[];
}

interface ExtractedDataDisplayProps {
    materialData: MaterialData | null;
    aiProcessingStatus: string;
}

export function ExtractedDataDisplay({ materialData, aiProcessingStatus }: ExtractedDataDisplayProps) {
    // Loading state
    if (aiProcessingStatus === 'PROCESSING') {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
                <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div>
                        <h3 className="font-semibold text-gray-900">AI Analysis in Progress</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Extracting technical data, tables, and standards from uploaded documents...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Failed state
    if (aiProcessingStatus === 'FAILED') {
        return (
            <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 className="font-semibold text-red-900">Data Extraction Failed</h3>
                        <p className="text-sm text-red-700 mt-1">
                            {materialData?.extraction_metadata?.error || 'Unable to extract structured data from the uploaded documents.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // No data state
    if (!materialData || aiProcessingStatus === 'IDLE') {
        return (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">No extracted data available</p>
            </div>
        );
    }

    const { material_info, manufacturer_info, standards, tables, extraction_metadata, warnings, document_data } = materialData;
    const confidenceScore = extraction_metadata?.confidence_score || 0;
    const confidencePercentage = Math.round(confidenceScore * 100);

    // Helper function to check if object has any data
    const hasData = (obj: any) => obj && Object.values(obj).some(v => v);

    // Safely render any value, handling objects and arrays recursively
    const renderSafeValue = (value: any, depth = 0): React.ReactNode => {
        if (value === null || value === undefined) return null;

        // Try to parse string as JSON if it looks like one
        if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
            try {
                const parsed = JSON.parse(value);
                return renderSafeValue(parsed, depth);
            } catch (e) {
                // Not valid JSON, continue as string
            }
        }

        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                if (value.length === 0) return <span className="text-gray-400 italic text-sm">None</span>;
                return (
                    <ul className={`list-disc list-inside text-sm ${depth > 0 ? 'ml-4' : ''}`}>
                        {value.map((item, i) => (
                            <li key={i} className="py-0.5">{renderSafeValue(item, depth + 1)}</li>
                        ))}
                    </ul>
                );
            }

            // Handle object
            const entries = Object.entries(value).filter(([_, v]) => v !== null && v !== undefined && v !== '');
            if (entries.length === 0) return <span className="text-gray-400 italic text-sm">N/A</span>;

            return (
                <div className={`space-y-1.5 text-sm ${depth > 0 ? 'bg-black/5 p-3 rounded-md border border-black/5 mt-1' : ''}`}>
                    {entries.map(([k, v]) => (
                        <div key={k} className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                            <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider sm:min-w-[120px] pt-1">
                                {k.replace(/_/g, ' ')}:
                            </span>
                            <div className="flex-1 text-gray-900 leading-relaxed font-medium">
                                {renderSafeValue(v, depth + 1)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return String(value);
    };

    return (
        <div className="space-y-6">
            {/* Warnings Section */}
            {warnings && warnings.length > 0 && (
                <div className="space-y-3">
                    {warnings.map((warning, idx) => (
                        <div key={idx} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-sm font-semibold text-amber-900">{warning}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Extraction Metadata Header */}
            {extraction_metadata && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 rounded-full p-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Data Extraction Complete</h3>
                                <p className="text-sm text-gray-600">
                                    Processed {extraction_metadata.processed_files || 0} file(s)
                                    {extraction_metadata.has_tables && ` • ${tables?.length || 0} table(s) extracted`}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Confidence:</span>
                                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-green-300">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${confidencePercentage >= 80 ? 'bg-green-500' :
                                                confidencePercentage >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                                                }`}
                                            style={{ width: `${confidencePercentage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{confidencePercentage}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Information Card */}
            {hasData(document_data) && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-slate-100 px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Document Identity
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {document_data?.document_type && (
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Document Type</label>
                                    <div className="mt-1 text-gray-900 font-semibold bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                                        {renderSafeValue(document_data.document_type)}
                                    </div>
                                </div>
                            )}
                            {document_data?.document_number && (
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Document Number</label>
                                    <div className="mt-1 text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                                        {renderSafeValue(document_data.document_number)}
                                    </div>
                                </div>
                            )}
                            {document_data?.issue_date && (
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Issue Date</label>
                                    <div className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                                        {renderSafeValue(document_data.issue_date)}
                                    </div>
                                </div>
                            )}
                            {document_data?.expiry_date && (
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Expiry Date</label>
                                    <div className={`mt-1 font-semibold px-3 py-2 rounded-md border ${warnings?.some(w => w?.toString().includes('EXPIRED'))
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : 'bg-green-50 text-green-700 border-green-200'
                                        }`}>
                                        {renderSafeValue(document_data.expiry_date)}
                                    </div>
                                </div>
                            )}
                            {document_data?.entities && (
                                <div className="md:col-span-2">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Entities Mentioned</label>
                                    <div className="mt-1 text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100 italic">
                                        {renderSafeValue(document_data.entities)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {document_data?.general_info && hasData(document_data.general_info) && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2 block">Additional Technical Data</label>
                                <div className="bg-gray-50 rounded-lg p-1 border border-gray-100">
                                    {renderSafeValue(document_data.general_info)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Material Information Card */}
            {hasData(material_info) && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Material Information
                        </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {material_info?.name && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Material Name</label>
                                <div className="mt-1 text-gray-900 font-medium">{renderSafeValue(material_info?.name)}</div>
                            </div>
                        )}
                        {material_info?.grade && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Grade</label>
                                <div className="mt-1 text-gray-900 font-medium">{renderSafeValue(material_info?.grade)}</div>
                            </div>
                        )}
                        {material_info?.description && (
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-gray-500">Description</label>
                                <div className="mt-1 text-gray-900">{renderSafeValue(material_info?.description)}</div>
                            </div>
                        )}
                        {material_info?.specifications && (
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-gray-500">Specifications</label>
                                <div className="mt-1 text-gray-900">{renderSafeValue(material_info?.specifications)}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manufacturer Information Card */}
            {hasData(manufacturer_info) && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Manufacturer Details
                        </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {manufacturer_info?.name && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Manufacturer</label>
                                <div className="mt-1 text-gray-900 font-medium">{renderSafeValue(manufacturer_info?.name)}</div>
                            </div>
                        )}
                        {manufacturer_info?.contact && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Contact</label>
                                <div className="mt-1 text-gray-900">{renderSafeValue(manufacturer_info?.contact)}</div>
                            </div>
                        )}
                        {manufacturer_info?.certifications && (
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-gray-500">Certifications</label>
                                <div className="mt-1 text-gray-900">{renderSafeValue(manufacturer_info?.certifications)}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Standards & Specifications Badges */}
            {standards && standards.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Referenced Standards
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-wrap gap-2">
                            {standards.map((standard, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300"
                                >
                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {standard}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Extracted Tables Section */}
            {tables && tables.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Extracted Tables ({tables.length})
                    </h3>
                    <div className="space-y-4">
                        {tables.map((table, idx) => (
                            <DataTable
                                key={idx}
                                title={table.title}
                                headers={table.headers}
                                rows={table.rows}
                                pageNumber={table.page_number}
                                sourceFile={table.source_file}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* No data extracted message */}
            {!hasData(material_info) && !hasData(manufacturer_info) && (!standards || standards.length === 0) && (!tables || tables.length === 0) && (
                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 className="font-semibold text-yellow-900">Limited Structured Data</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                No structured technical data could be extracted from the uploaded documents. The documents may not contain recognizable tables, material specifications, or manufacturer details.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
