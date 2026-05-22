import { createId } from "@paralleldrive/cuid2";
import {
  type Edge as RFEdge,
  type Node as RFNode,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { ObservableMap, makeAutoObservable, observable } from "mobx";

export interface WorkspaceNodeData {
  id: string;
  workspaceId: string;
  parentId: string | null;
  nodeType: "ROOT" | "FOLDER" | "WORKFLOW_LINK" | "SEPARATOR" | "NOTE";
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  linkedWorkflowId: string | null;
  linkedVersion: number | null;
  sortOrder: number;
  path: string;
  depth: number;
  isExpanded: boolean;
  canvasX: number | null;
  canvasY: number | null;
  metadata: Record<string, unknown>;
  noteContent?: string | null;
  linkedWorkflow?: {
    id: string;
    name: string;
    status: string;
    category: string | null;
  } | null;
  _isNew?: boolean;
  _isDeleted?: boolean;
  _isDirty?: boolean;
}

// Pure helper — accepts a read-only map so it works with both ObservableMap
// and plain Map without casts.
function computePath(
  nodeId: string,
  nodeMap: ReadonlyMap<string, WorkspaceNodeData>,
): string {
  const parts: string[] = [];
  let current = nodeMap.get(nodeId);
  while (current) {
    parts.unshift(current.id);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  return "/" + parts.join("/");
}

function computeDepth(
  nodeId: string,
  nodeMap: ReadonlyMap<string, WorkspaceNodeData>,
): number {
  let depth = 0;
  let current = nodeMap.get(nodeId);
  while (current?.parentId) {
    depth++;
    current = nodeMap.get(current.parentId);
  }
  return depth;
}

class WorkspaceCanvasStore {
  workspaceId: string | null = null;

  nodeMap = new ObservableMap<string, WorkspaceNodeData>();

  rootId: string | null = null;
  rfNodes: RFNode[] = [];
  rfEdges: RFEdge[] = [];
  isDirty = false;
  // Simple counter — incremented/decremented by callers so _markDirty never
  // needs to scan the entire nodeMap.
  pendingChanges = 0;
  lastSavedAt: Date | null = null;
  isSaving = false;

  treeSearchQuery = "";
  editingNodeId: string | null = null;
  editingNodeValue = "";
  // Single source of truth for selection. rfNodes selection state is derived
  // from this on every rebuild so the two can never drift out of sync.
  selectedNodeId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  get dbNodes(): WorkspaceNodeData[] {
    return Array.from(this.nodeMap.values());
  }

  get childIdMap(): Map<string | null, string[]> {
    const map = new Map<string | null, string[]>();
    for (const node of this.nodeMap.values()) {
      if (node._isDeleted) continue;
      if (!map.has(node.parentId)) map.set(node.parentId, []);
      map.get(node.parentId)!.push(node.id);
    }
    // Sort a fresh copy — never mutate inside a computed getter.
    for (const [key, ids] of map) {
      map.set(
        key,
        [...ids].sort(
          (a, b) =>
            (this.nodeMap.get(a)?.sortOrder ?? 0) -
            (this.nodeMap.get(b)?.sortOrder ?? 0),
        ),
      );
    }
    return map;
  }

  get searchMatches(): Set<string> | null {
    const q = this.treeSearchQuery.toLowerCase().trim();
    if (!q) return null;

    const matches = new Set<string>();
    const childIdMap = this.childIdMap;

    const checkNode = (id: string): boolean => {
      const node = this.nodeMap.get(id);
      if (!node) return false;
      let matched = node.name.toLowerCase().includes(q);
      for (const childId of childIdMap.get(id) ?? []) {
        if (checkNode(childId)) matched = true;
      }
      if (matched) matches.add(id);
      return matched;
    };

    for (const childId of childIdMap.get(this.rootId) ?? []) {
      checkNode(childId);
    }
    return matches;
  }

  // ---------------------------------------------------------------------------
  // UI state helpers
  // ---------------------------------------------------------------------------

  setTreeSearchQuery(query: string) {
    this.treeSearchQuery = query;
  }

  startRenameUI(id: string, name: string) {
    this.editingNodeId = id;
    this.editingNodeValue = name;
  }

  setEditValueUI(val: string) {
    this.editingNodeValue = val;
  }

  commitRenameUI() {
    if (this.editingNodeId && this.editingNodeValue.trim()) {
      this.renameNode(this.editingNodeId, this.editingNodeValue.trim());
    }
    this.editingNodeId = null;
    this.editingNodeValue = "";
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  initialize(workspaceId: string, nodes: WorkspaceNodeData[]) {
    // Single-pass setup: populate nodeMap, then derive path/depth directly from
    // it — no throwaway tempMap needed.
    this.nodeMap.clear();
    for (const n of nodes) {
      this.nodeMap.set(n.id, observable({ ...n }));
    }
    for (const n of this.nodeMap.values()) {
      n.path = computePath(n.id, this.nodeMap);
      n.depth = computeDepth(n.id, this.nodeMap);
    }

    this.workspaceId = workspaceId;
    this.rootId = nodes.find((n) => n.nodeType === "ROOT")?.id ?? null;
    this.selectedNodeId = null;
    this.isDirty = false;
    this.pendingChanges = 0;

    this._rebuildReactFlow();

    const nonRootNodes = this.dbNodes.filter(
      (n) => n.nodeType !== "ROOT" && !n._isDeleted,
    );

    if (nonRootNodes.length > 0) {
      const hasNullCoords = nonRootNodes.some(
        (n) => n.canvasX === null || n.canvasY === null,
      );
      const allAtZero = nonRootNodes.every(
        (n) => n.canvasX === 0 && n.canvasY === 0,
      );

      const coordSet = new Set<string>();
      let hasDuplicates = false;
      for (const n of nonRootNodes) {
        if (n.canvasX !== null && n.canvasY !== null) {
          const key = `${n.canvasX.toFixed(1)},${n.canvasY.toFixed(1)}`;
          if (coordSet.has(key)) { hasDuplicates = true; break; }
          coordSet.add(key);
        }
      }

      if (hasNullCoords || allAtZero || hasDuplicates) {
        this.layoutCanvasTree();
        this.isDirty = true;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // React Flow event handlers
  // ---------------------------------------------------------------------------

  onNodesChange(changes: any) {
    this.rfNodes = applyNodeChanges(changes, this.rfNodes);

    let positionChanged = false;
    for (const c of changes) {
      // Selection is NOT managed here — selectNode() is the single write path.
      if (c.type === "position" && c.position) {
        positionChanged = true;
        const node = this.nodeMap.get(c.id);
        if (node) {
          node.canvasX = c.position.x;
          node.canvasY = c.position.y;
          if (!node._isDirty) {
            node._isDirty = true;
            this.pendingChanges++;
          }
        }
      }
    }

    if (positionChanged) this.isDirty = true;
  }

  onEdgesChange(changes: any) {
    this.rfEdges = applyEdgeChanges(changes, this.rfEdges);
  }

  onConnect(connection: any) {
    if (!connection.source || !connection.target) return;
    const targetNode = this.nodeMap.get(connection.target);
    if (targetNode?.parentId === connection.source) return;
    this.moveNode(connection.target, connection.source);
  }

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  selectNode(nodeId: string) {
    this.selectedNodeId = nodeId;
    this.rfNodes = this.rfNodes.map((rn) => ({
      ...rn,
      selected: rn.id === nodeId,
    }));
  }

  // ---------------------------------------------------------------------------
  // Node factories
  // ---------------------------------------------------------------------------

  createFolder(
    parentId: string,
    name: string,
    icon?: string,
    position?: { x: number; y: number },
  ): string {
    const parent = this._requireNode(parentId);
    const id = createId();

    this.nodeMap.set(
      id,
      observable({
        id,
        workspaceId: this.workspaceId!,
        parentId,
        nodeType: "FOLDER" as const,
        name,
        description: null,
        icon: icon ?? null,
        color: null,
        linkedWorkflowId: null,
        linkedVersion: null,
        sortOrder: (this.childIdMap.get(parentId) ?? []).length,
        path: `${parent.path}/${id}`,
        depth: parent.depth + 1,
        isExpanded: true,
        canvasX: position?.x ?? (parent.canvasX ?? 0) + 50,
        canvasY: position?.y ?? (parent.canvasY ?? 0) + 120,
        metadata: {},
        _isNew: true,
        _isDirty: true,
      }),
    );

    parent.isExpanded = true;
    this._rebuildReactFlow();
    this._markDirty(1);
    return id;
  }

  createWorkflowLink(
    parentId: string,
    name: string,
    workflowId: string,
    position?: { x: number; y: number },
  ): string {
    const parent = this._requireNode(parentId);
    const id = createId();

    this.nodeMap.set(
      id,
      observable({
        id,
        workspaceId: this.workspaceId!,
        parentId,
        nodeType: "WORKFLOW_LINK" as const,
        name,
        description: null,
        icon: "ƒ",
        color: null,
        linkedWorkflowId: workflowId,
        linkedVersion: null,
        sortOrder: (this.childIdMap.get(parentId) ?? []).length,
        path: `${parent.path}/${id}`,
        depth: parent.depth + 1,
        isExpanded: true,
        canvasX: position?.x ?? (parent.canvasX ?? 0) + 50,
        canvasY: position?.y ?? (parent.canvasY ?? 0) + 80,
        metadata: { status: "active" },
        _isNew: true,
        _isDirty: true,
      }),
    );

    parent.isExpanded = true;
    this._rebuildReactFlow();
    this._markDirty(1);
    return id;
  }

  createNote(
    parentId: string,
    noteContent: string,
    position?: { x: number; y: number },
  ): string {
    const parent = this._requireNode(parentId);
    const id = createId();

    this.nodeMap.set(
      id,
      observable({
        id,
        workspaceId: this.workspaceId!,
        parentId,
        nodeType: "NOTE" as const,
        name: "Note",
        description: null,
        icon: null,
        color: null,
        linkedWorkflowId: null,
        linkedVersion: null,
        sortOrder: (this.childIdMap.get(parentId) ?? []).length,
        path: `${parent.path}/${id}`,
        depth: parent.depth + 1,
        isExpanded: false,
        canvasX: position?.x ?? (parent.canvasX ?? 0) + 50,
        canvasY: position?.y ?? (parent.canvasY ?? 0) + 80,
        metadata: {},
        noteContent,
        _isNew: true,
        _isDirty: true,
      }),
    );

    this._rebuildReactFlow();
    this._markDirty(1);
    return id;
  }

  createSeparator(
    parentId: string,
    position?: { x: number; y: number },
  ): string {
    const parent = this._requireNode(parentId);
    const id = createId();

    this.nodeMap.set(
      id,
      observable({
        id,
        workspaceId: this.workspaceId!,
        parentId,
        nodeType: "SEPARATOR" as const,
        name: "---",
        description: null,
        icon: null,
        color: null,
        linkedWorkflowId: null,
        linkedVersion: null,
        sortOrder: (this.childIdMap.get(parentId) ?? []).length,
        path: `${parent.path}/${id}`,
        depth: parent.depth + 1,
        isExpanded: false,
        canvasX: position?.x ?? (parent.canvasX ?? 0) + 50,
        canvasY: position?.y ?? (parent.canvasY ?? 0) + 80,
        metadata: {},
        _isNew: true,
        _isDirty: true,
      }),
    );

    this._rebuildReactFlow();
    this._markDirty(1);
    return id;
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  renameNode(nodeId: string, name: string) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    node.name = name;
    this._touchNode(node);
  }

  updateMetadata(nodeId: string, metadata: Record<string, unknown>) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    node.metadata = { ...node.metadata, ...metadata };
    this._touchNode(node);
  }

  attachWorkflow(nodeId: string, workflowId: string, version: number | null = null) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    node.linkedWorkflowId = workflowId;
    node.linkedVersion = version;
    this._touchNode(node);
  }

  deleteNode(nodeId: string) {
    if (!this.nodeMap.get(nodeId)) return;

    const toDelete = new Set<string>();
    const collect = (id: string) => {
      toDelete.add(id);
      for (const cid of this.childIdMap.get(id) ?? []) collect(cid);
    };
    collect(nodeId);

    let delta = 0;
    for (const id of toDelete) {
      const n = this.nodeMap.get(id);
      if (n) {
        if (!n._isDirty) delta++;
        n._isDeleted = true;
        n._isDirty = true;
      }
    }

    this._rebuildReactFlow();
    this._markDirty(delta);
  }

  moveNode(nodeId: string, newParentId: string) {
    const node = this.nodeMap.get(nodeId);
    const newParent = this.nodeMap.get(newParentId);

    if (!node) { console.warn("[store] moveNode: node not found", nodeId); return; }
    if (!newParent) { console.warn("[store] moveNode: parent not found", newParentId); return; }
    if (!node.path || !newParent.path) return;

    if (newParent.path.startsWith(node.path + "/")) {
      console.warn("[store] moveNode: cycle prevented");
      return;
    }

    const oldPath = node.path;
    const newPath = `${newParent.path}/${nodeId}`;
    const depthDiff = (newParent.depth + 1) - node.depth;
    const siblingCount = (this.childIdMap.get(newParentId) ?? []).filter(
      (id) => id !== nodeId,
    ).length;

    let delta = 0;
    const touch = (n: WorkspaceNodeData) => {
      if (!n._isDirty) delta++;
      n._isDirty = true;
    };

    node.parentId = newParentId;
    node.path = newPath;
    node.depth = newParent.depth + 1;
    node.sortOrder = siblingCount;
    touch(node);

    newParent.isExpanded = true;

    for (const n of this.nodeMap.values()) {
      if (n.id !== nodeId && n.path?.startsWith(oldPath + "/")) {
        n.path = newPath + n.path.slice(oldPath.length);
        n.depth += depthDiff;
        touch(n);
      }
    }

    // No auto-layout here — manual canvas positions are preserved.
    // Call layoutCanvasTree() explicitly when a full re-layout is desired.
    this._rebuildReactFlow();
    this._markDirty(delta);
  }

  layoutCanvasTree() {
    if (!this.rootId) return;

    const nodeWidth = 180;
    const hSpacing = 40;
    const vGap = 150;
    const subtreeWidths = new Map<string, number>();

    const computeWidth = (id: string): number => {
      const children = (this.childIdMap.get(id) ?? []).filter(
        (cid) => !this.nodeMap.get(cid)?._isDeleted,
      );
      if (children.length === 0) {
        subtreeWidths.set(id, nodeWidth);
        return nodeWidth;
      }
      const total =
        children.reduce((sum, cid) => sum + computeWidth(cid), 0) +
        (children.length - 1) * hSpacing;
      const width = Math.max(nodeWidth, total);
      subtreeWidths.set(id, width);
      return width;
    };

    const rootChildren = (this.childIdMap.get(this.rootId) ?? []).filter(
      (cid) => !this.nodeMap.get(cid)?._isDeleted,
    );
    for (const cid of rootChildren) computeWidth(cid);

    let delta = 0;
    const assignPositions = (id: string, startX: number, startY: number) => {
      const node = this.nodeMap.get(id);
      if (!node) return;

      const children = (this.childIdMap.get(id) ?? []).filter(
        (cid) => !this.nodeMap.get(cid)?._isDeleted,
      );
      const totalWidth = subtreeWidths.get(id) ?? nodeWidth;
      node.canvasX = startX + (totalWidth - nodeWidth) / 2;
      node.canvasY = startY;
      if (!node._isDirty) delta++;
      node._isDirty = true;

      let currentX = startX;
      for (const cid of children) {
        assignPositions(cid, currentX, startY + vGap);
        currentX += (subtreeWidths.get(cid) ?? nodeWidth) + hSpacing;
      }
    };

    let currentX = 100;
    for (const cid of rootChildren) {
      assignPositions(cid, currentX, 100);
      currentX += (subtreeWidths.get(cid) ?? nodeWidth) + hSpacing + 80;
    }

    this._rebuildReactFlow();
    this._markDirty(delta);
  }

  reconnectEdge(nodeId: string, _oldParentId: string, newParentId: string) {
    this.moveNode(nodeId, newParentId);
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  flush() {
    // Collect deletions first — never mutate a map while iterating it.
    const toDelete: string[] = [];
    for (const n of this.nodeMap.values()) {
      if (n._isDeleted) {
        toDelete.push(n.id);
      } else {
        n._isNew = false;
        n._isDirty = false;
      }
    }
    for (const id of toDelete) this.nodeMap.delete(id);

    this.isDirty = false;
    this.pendingChanges = 0;
    this.isSaving = false;
    this.lastSavedAt = new Date();
  }

  setIsSaving(isSaving: boolean) {
    this.isSaving = isSaving;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Rebuild the full rfNodes/rfEdges arrays from nodeMap. */
  _rebuildReactFlow() {
    const rfNodes: RFNode[] = [];
    const rfEdges: RFEdge[] = [];

    // Build child counts for display badges
    const childCounts = new Map<string, { folders: number; workflows: number }>();
    for (const node of this.nodeMap.values()) {
      if (!node.parentId || node._isDeleted) continue;
      if (!childCounts.has(node.parentId))
        childCounts.set(node.parentId, { folders: 0, workflows: 0 });
      const c = childCounts.get(node.parentId)!;
      if (node.nodeType === "FOLDER") c.folders++;
      if (node.nodeType === "WORKFLOW_LINK") c.workflows++;
    }

    for (const node of this.nodeMap.values()) {
      if (node.nodeType === "ROOT" || node._isDeleted) continue;

      rfNodes.push({
        id: node.id,
        type:
          node.nodeType === "FOLDER"
            ? "workspaceFolder"
            : node.nodeType === "WORKFLOW_LINK"
              ? "workflowLink"
              : node.nodeType === "NOTE"
                ? "workspaceNote"
                : "workspaceSeparator",
        position: { x: node.canvasX ?? 0, y: node.canvasY ?? 0 },
        selected: node.id === this.selectedNodeId,
        data: {
          dbNode: node,
          childCount: childCounts.get(node.id)?.folders ?? 0,
          workflowCount: childCounts.get(node.id)?.workflows ?? 0,
          isExpanded: node.isExpanded,
          linkedWorkflow: node.linkedWorkflow,
          status: (node.metadata as Record<string, string>)?.status ?? "active",
          // Closed over this.deleteNode — no callback threading needed.
          onDelete: () => this.deleteNode(node.id),
        },
      });

      if (node.parentId && node.parentId !== this.rootId) {
        rfEdges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: "workspaceEdge",
          animated: node.nodeType === "WORKFLOW_LINK",
          style: { stroke: "#cbd5e1" },
        });
      }
    }

    this.rfNodes = rfNodes;
    this.rfEdges = rfEdges;
  }

  /** Sync a single rfNode's data without rebuilding the whole array. */
  _updateSingleRfNode(nodeId: string) {
    const dbNode = this.nodeMap.get(nodeId);
    if (!dbNode) return;
    this.rfNodes = this.rfNodes.map((rn) =>
      rn.id === nodeId
        ? { ...rn, data: { ...rn.data, dbNode: { ...dbNode } } }
        : rn,
    );
  }

  /** Mark a node dirty and increment the pending counter if it wasn't already. */
  private _touchNode(node: WorkspaceNodeData) {
    if (!node._isDirty) {
      node._isDirty = true;
      this._markDirty(1);
    } else {
      this.isDirty = true;
    }
  }

  /** Increment pending-changes counter and set the dirty flag. */
  private _markDirty(delta = 0) {
    this.isDirty = true;
    this.pendingChanges += delta;
  }

  /** Throw a descriptive error when a required node is missing. */
  private _requireNode(id: string): WorkspaceNodeData {
    const node = this.nodeMap.get(id);
    if (!node) throw new Error(`WorkspaceCanvasStore: node "${id}" not found`);
    return node;
  }
}

export const workspaceCanvasStore = new WorkspaceCanvasStore();
export const useWorkspaceCanvas = () => workspaceCanvasStore;