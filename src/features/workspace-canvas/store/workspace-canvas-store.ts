import { createId } from "@paralleldrive/cuid2";
import {
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type Edge as RFEdge,
  type Node as RFNode,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { ObservableMap, makeAutoObservable } from "mobx";

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

function deriveReactFlow(
  dbNodes: WorkspaceNodeData[],
  deleteNodeCb: (id: string) => void,
) {
  const rfNodes: RFNode[] = [];
  const rfEdges: RFEdge[] = [];

  const childCounts = new Map<string, { folders: number; workflows: number }>();
  for (const node of dbNodes) {
    if (!node.parentId || node._isDeleted) continue;
    if (!childCounts.has(node.parentId)) {
      childCounts.set(node.parentId, { folders: 0, workflows: 0 });
    }
    const counts = childCounts.get(node.parentId)!;
    if (node.nodeType === "FOLDER") counts.folders++;
    if (node.nodeType === "WORKFLOW_LINK") counts.workflows++;
  }

  const rootId = dbNodes.find((n) => n.nodeType === "ROOT")?.id;

  for (const node of dbNodes) {
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
      position: {
        x: node.canvasX ?? 0,
        y: node.canvasY ?? 0,
      },
      data: {
        dbNode: node,
        childCount: childCounts.get(node.id)?.folders ?? 0,
        workflowCount: childCounts.get(node.id)?.workflows ?? 0,
        isExpanded: node.isExpanded,
        linkedWorkflow: node.linkedWorkflow,
        status: (node.metadata as Record<string, string>)?.status ?? "active",
        onDelete: () => deleteNodeCb(node.id),
      },
    });

    if (node.parentId && node.parentId !== rootId) {
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

  return { rfNodes, rfEdges };
}

function computePath(
  nodeId: string,
  nodeMap: Map<string, WorkspaceNodeData>,
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
  nodeMap: Map<string, WorkspaceNodeData>,
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

  // Native MobX map for true O(1) object reference tracking
  nodeMap = new ObservableMap<string, WorkspaceNodeData>();

  rootId: string | null = null;
  rfNodes: RFNode[] = [];
  rfEdges: RFEdge[] = [];
  isDirty: boolean = false;
  pendingChanges: number = 0;
  lastSavedAt: Date | null = null;
  isSaving: boolean = false;

  treeSearchQuery: string = "";
  editingNodeId: string | null = null;
  editingNodeValue: string = "";

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // Computed getter for array-based operations (like saving or full derives)
  get dbNodes(): WorkspaceNodeData[] {
    return Array.from(this.nodeMap.values());
  }

  get childIdMap() {
    const map = new Map<string | null, string[]>();
    for (const node of this.nodeMap.values()) {
      if (node._isDeleted) continue;
      const parentId = node.parentId;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(node.id);
    }
    // Sort
    for (const [, childIds] of map) {
      childIds.sort((a, b) => {
        const na = this.nodeMap.get(a);
        const nb = this.nodeMap.get(b);
        return (na?.sortOrder ?? 0) - (nb?.sortOrder ?? 0);
      });
    }
    return map;
  }

  get searchMatches() {
    const q = this.treeSearchQuery.toLowerCase().trim();
    if (!q) return null; // null indicates no active search

    const matches = new Set<string>();
    const childIdMap = this.childIdMap;

    const checkNode = (id: string): boolean => {
      const node = this.nodeMap.get(id);
      if (!node) return false;
      let matched = node.name.toLowerCase().includes(q);
      const children = childIdMap.get(id) || [];
      for (const childId of children) {
        if (checkNode(childId)) matched = true;
      }
      if (matched) matches.add(id);
      return matched;
    };

    if (this.rootId) {
      const rootChildren = childIdMap.get(this.rootId) || [];
      for (const childId of rootChildren) {
        checkNode(childId);
      }
    }
    return matches;
  }

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

  initialize(workspaceId: string, nodes: WorkspaceNodeData[]) {
    const rootId = nodes.find((n) => n.nodeType === "ROOT")?.id ?? null;
    const tempMap = new Map(nodes.map((n) => [n.id, n]));

    this.nodeMap.clear();
    for (const n of nodes) {
      this.nodeMap.set(n.id, {
        ...n,
        path: computePath(n.id, tempMap),
        depth: computeDepth(n.id, tempMap),
      });
    }

    const { rfNodes, rfEdges } = deriveReactFlow(this.dbNodes, this.deleteNode);

    this.workspaceId = workspaceId;
    this.rootId = rootId;
    this.rfNodes = rfNodes;
    this.rfEdges = rfEdges;
    this.isDirty = false;
    this.pendingChanges = 0;
  }

  onNodesChange(changes: any) {
    const hasPositionChange = changes.some(
      (c: any) => c.type === "position" && c.position,
    );
    this.rfNodes = applyNodeChanges(changes, this.rfNodes);

    if (hasPositionChange) {
      for (const c of changes) {
        if (c.type === "position" && c.position) {
          const node = this.nodeMap.get(c.id);
          if (node) {
            node.canvasX = c.position.x;
            node.canvasY = c.position.y;
            node._isDirty = true;
          }
        }
      }
      this._markDirty();
    }
  }

  selectNode(nodeId: string) {
    this.rfNodes = this.rfNodes.map((rn) => ({
      ...rn,
      selected: rn.id === nodeId,
    }));
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

  createFolder(
    parentId: string,
    name: string,
    icon?: string,
    position?: { x: number; y: number },
  ) {
    const parent = this.nodeMap.get(parentId);
    if (!parent) throw new Error(`Parent ${parentId} not found`);

    const id = createId();
    const siblingCount = (this.childIdMap.get(parentId) || []).length;

    const newNode: WorkspaceNodeData = {
      id,
      workspaceId: this.workspaceId!,
      parentId,
      nodeType: "FOLDER",
      name,
      description: null,
      icon: icon ?? null,
      color: null,
      linkedWorkflowId: null,
      linkedVersion: null,
      sortOrder: siblingCount,
      path: `${parent.path}/${id}`,
      depth: parent.depth + 1,
      isExpanded: true,
      canvasX: position?.x ?? (parent.canvasX ?? 0) + 50,
      canvasY: position?.y ?? (parent.canvasY ?? 0) + 120,
      metadata: {},
      _isNew: true,
      _isDirty: true,
    };

    this.nodeMap.set(id, newNode);
    this._rebuildReactFlow();
    this._markDirty();
    return id;
  }

  createWorkflowLink(
    parentId: string,
    name: string,
    workflowId: string,
    position?: { x: number; y: number },
  ) {
    const parent = this.nodeMap.get(parentId);
    if (!parent) throw new Error(`Parent ${parentId} not found`);

    const id = createId();
    const siblingCount = (this.childIdMap.get(parentId) || []).length;

    const newNode: WorkspaceNodeData = {
      id,
      workspaceId: this.workspaceId!,
      parentId,
      nodeType: "WORKFLOW_LINK",
      name,
      description: null,
      icon: "ƒ",
      color: null,
      linkedWorkflowId: workflowId,
      linkedVersion: null,
      sortOrder: siblingCount,
      path: `${parent.path}/${id}`,
      depth: parent.depth + 1,
      isExpanded: true,
      canvasX: position?.x ?? (parent.canvasX ?? 0) + 50,
      canvasY: position?.y ?? (parent.canvasY ?? 0) + 80,
      metadata: { status: "active" },
      _isNew: true,
      _isDirty: true,
    };

    this.nodeMap.set(id, newNode);
    this._rebuildReactFlow();
    this._markDirty();
    return id;
  }

  // In-place granular mutation
  renameNode(nodeId: string, name: string) {
    const node = this.nodeMap.get(nodeId);
    if (node) {
      node.name = name;
      node._isDirty = true;
      this._updateSingleRfNode(nodeId);
      this._markDirty();
    }
  }

  // In-place granular mutation
  updateMetadata(nodeId: string, metadata: Record<string, unknown>) {
    const node = this.nodeMap.get(nodeId);
    if (node) {
      node.metadata = { ...(node.metadata || {}), ...metadata };
      node._isDirty = true;
      this._updateSingleRfNode(nodeId);
      this._markDirty();
    }
  }

  // In-place granular mutation
  attachWorkflow(
    nodeId: string,
    workflowId: string,
    version: number | null = null,
  ) {
    const node = this.nodeMap.get(nodeId);
    if (node) {
      node.linkedWorkflowId = workflowId;
      node.linkedVersion = version;
      node._isDirty = true;
      this._updateSingleRfNode(nodeId);
      this._markDirty();
    }
  }

  deleteNode(nodeId: string) {
    const node = this.nodeMap.get(nodeId);
    if (node) {
      node._isDeleted = true;
      node._isDirty = true;
      this._rebuildReactFlow();
      this._markDirty();
    }
  }

  moveNode(nodeId: string, newParentId: string) {
    const node = this.nodeMap.get(nodeId);
    const newParent = this.nodeMap.get(newParentId);
    if (!node || !newParent || !node.path || !newParent.path) return;

    if (
      node.path &&
      newParent.path &&
      newParent.path.startsWith(node.path + "/")
    )
      return;

    const oldPath = node.path;
    const newPath = `${newParent.path}/${nodeId}`;
    const depthDiff = newParent.depth + 1 - node.depth;
    const siblingCount = (this.childIdMap.get(newParentId) || []).filter(
      (id) => id !== nodeId,
    ).length;

    // Mutate the specific node
    node.parentId = newParentId;
    node.path = newPath;
    node.depth = newParent.depth + 1;
    node.sortOrder = siblingCount;
    node._isDirty = true;

    // Mutate all descendants
    for (const n of this.nodeMap.values()) {
      if (n.path && n.path.startsWith(oldPath + "/") && n.id !== nodeId) {
        n.path = newPath + n.path.substring(oldPath.length);
        n.depth = n.depth + depthDiff;
        n._isDirty = true;
      }
    }

    this._rebuildReactFlow();
    this._markDirty();
  }

  reconnectEdge(nodeId: string, _oldParentId: string, newParentId: string) {
    this.moveNode(nodeId, newParentId);
  }

  // Helper to sync ReactFlow specific node when performing in-place tree edits
  _updateSingleRfNode(nodeId: string) {
    const dbNode = this.nodeMap.get(nodeId);
    if (!dbNode) return;

    // React Flow requires a new array and new node object reference for it to trigger the node re-render
    this.rfNodes = this.rfNodes.map((rn) =>
      rn.id === nodeId
        ? { ...rn, data: { ...rn.data, dbNode: { ...dbNode } } }
        : rn,
    );
  }

  _rebuildReactFlow() {
    const { rfNodes, rfEdges } = deriveReactFlow(this.dbNodes, this.deleteNode);
    this.rfNodes = rfNodes;
    this.rfEdges = rfEdges;
  }

  _markDirty() {
    this.isDirty = true;
    let pending = 0;
    for (const n of this.nodeMap.values()) {
      if (n._isDirty) pending++;
    }
    this.pendingChanges = pending;
  }

  flush() {
    for (const n of this.nodeMap.values()) {
      if (n._isDeleted) {
        this.nodeMap.delete(n.id);
      } else {
        n._isNew = false;
        n._isDirty = false;
      }
    }
    this.isDirty = false;
    this.pendingChanges = 0;
    this.isSaving = false;
    this.lastSavedAt = new Date();
  }
}

export const workspaceCanvasStore = new WorkspaceCanvasStore();
export const useWorkspaceCanvas = () => workspaceCanvasStore;
