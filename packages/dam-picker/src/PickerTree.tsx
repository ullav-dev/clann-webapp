"use client";

import { useState } from "react";
import type { Category } from "./api";

interface TreeNode extends Category {
  children: TreeNode[];
}

function buildTree(categories: Category[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortChildren(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((n) => ({ ...n, children: sortChildren(n.children) }));
  }
  return sortChildren(roots);
}

function TreeNodeItem({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: TreeNode;
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  const rowCls = isSelected
    ? "bg-blue-100 text-blue-800 font-medium"
    : "text-slate-700 hover:bg-slate-100";

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 rounded-md text-xs cursor-pointer transition-colors ${rowCls}`}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: "8px" }}
        onClick={() => onSelect(isSelected ? null : node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-slate-400 hover:text-slate-600 w-4 shrink-0 text-xs"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="truncate flex-1">{node.name}</span>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  categories: Category[];
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
}

export default function PickerTree({ categories, selectedId, onSelect }: Props) {
  const tree = buildTree(categories);

  return (
    <div className="space-y-0.5">
      <div
        className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs transition-colors ${
          selectedId === null
            ? "bg-blue-100 text-blue-800 font-medium"
            : "text-slate-700 hover:bg-slate-100"  // undefined = nothing selected — no highlight
        }`}
        onClick={() => onSelect(null)}
      >
        <span className="w-4 shrink-0 text-center text-xs text-slate-400">◉</span>
        <span className="flex-1">All Assets</span>
      </div>

      {tree.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}
