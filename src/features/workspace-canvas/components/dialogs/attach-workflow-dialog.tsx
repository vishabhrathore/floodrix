"use client";

import { useState } from "react";
import { X, Search, FileText, Check } from "lucide-react";

interface AttachWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAttach: (workflowId: string, name: string) => void;
    // In reality, this would be fetched via tRPC inside the component
    mockWorkflows?: { id: string; name: string; category: string }[];
}

export function AttachWorkflowDialog({ isOpen, onClose, onAttach, mockWorkflows = [] }: AttachWorkflowDialogProps) {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (!isOpen) return null;

    // Filter mocked or fetched workflows
    const filtered = mockWorkflows.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleAttach = () => {
        if (selectedId) {
            const selected = mockWorkflows.find(w => w.id === selectedId);
            if (selected) onAttach(selected.id, selected.name);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-[500px] flex flex-col max-h-[80vh] border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                    <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
                        <FileText size={16} className="text-blue-500" />
                        Attach Workflow
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search workflows by name..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-gray-700"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-400">No workflows found.</div>
                    ) : (
                        <div className="space-y-1">
                            {filtered.map(workflow => (
                                <button
                                    key={workflow.id}
                                    onClick={() => setSelectedId(workflow.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedId === workflow.id ? "bg-blue-50 border-blue-200 border" : "hover:bg-gray-50 border border-transparent"
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${selectedId === workflow.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                                        }`}>
                                        <FileText size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-800 truncate">{workflow.name}</div>
                                        <div className="text-xs text-gray-400 truncate">{workflow.category}</div>
                                    </div>
                                    {selectedId === workflow.id && (
                                        <Check size={16} className="text-blue-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0 bg-gray-50/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAttach}
                        disabled={!selectedId}
                        className="px-4 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                    >
                        Attach Selected
                    </button>
                </div>
            </div>
        </div>
    );
}