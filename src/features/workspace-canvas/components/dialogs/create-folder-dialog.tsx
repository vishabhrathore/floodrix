"use client";

import { useState, useEffect } from "react";
import { X, FolderPlus } from "lucide-react";

interface CreateFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, icon: string) => void;
    defaultName?: string;
}

export function CreateFolderDialog({ isOpen, onClose, onSubmit, defaultName = "" }: CreateFolderDialogProps) {
    const [name, setName] = useState(defaultName);
    const [icon, setIcon] = useState("📁");

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setName(defaultName);
            setIcon("📁");
        }
    }, [isOpen, defaultName]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSubmit(name.trim(), icon);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
                        <FolderPlus size={16} className="text-amber-500" />
                        Create Folder
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="flex gap-3">
                        {/* Simple icon picker (could be replaced with emoji-picker-react) */}
                        <div className="w-12 flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Icon</label>
                            <input
                                type="text"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                maxLength={2}
                                className="w-full text-center py-2 px-1 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-lg"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Folder Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Marketing Workflows"
                                className="w-full py-2 px-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-gray-700"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-4 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                        >
                            Create Folder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}