"use client";

import { useEffect, useRef } from "react";
import { Folder, Link, Pencil, Trash2 } from "lucide-react";

interface CanvasContextMenuProps {
    x: number;
    y: number;
    nodeId: string;
    nodeType: string;
    onClose: () => void;
    onRename: (id: string) => void;
    onDelete: (id: string) => void;
    onAddFolder?: (parentId: string) => void;
    onAddLink?: (parentId: string) => void;
}

export function CanvasContextMenu({
    x, y, nodeId, nodeType, onClose, onRename, onDelete, onAddFolder, onAddLink
}: CanvasContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-1 min-w-[160px] animate-in fade-in duration-100"
        >
            {nodeType === "workspaceFolder" && onAddFolder && onAddLink && (
                <>
                    <MenuButton icon={<Folder size={14} />} label="Add subfolder" onClick={() => { onAddFolder(nodeId); onClose(); }} />
                    <MenuButton icon={<Link size={14} />} label="Add link" onClick={() => { onAddLink(nodeId); onClose(); }} />
                    <div className="h-px bg-gray-100 my-1 mx-1" />
                </>
            )}

            <MenuButton icon={<Pencil size={14} />} label="Rename" onClick={() => { onRename(nodeId); onClose(); }} />
            <MenuButton icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { onDelete(nodeId); onClose(); }} />
        </div>
    );
}

function MenuButton({ icon, label, onClick, danger }: { icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}