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

    const { material_info, manufacturer_info, standards, tables, extraction_metadata } = materialData;
    const confidenceScore = extraction_metadata?.confidence_score || 0;
    const confidencePercentage = Math.round(confidenceScore * 100);

    // Helper function to check if object has any data
    const hasData = (obj: any) => obj && Object.values(obj).some(v => v);

    // Safely render any value, handling objects and arrays
    const renderSafeValue = (value: any): React.ReactNode => {
        if (!value) return null;

        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return (
                    <ul className="list-disc list-inside text-sm">
                        {value.map((item, i) => (
                            <li key={i}>{renderSafeValue(item)}</li>
                        ))}
                    </ul>
                );
            }

            // Handle object (like address)
            return (
                <div className="space-y-1 text-sm bg-gray-50 p-2 rounded">
                    {Object.entries(value).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                            <span className="font-medium text-gray-500 uppercase text-xs tracking-wider min-w-[80px] pt-0.5">{k.replace(/_/g, ' ')}:</span>
                            <span className="flex-1">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return String(value);
    };

    return (
        <div className="space-y-6">
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
