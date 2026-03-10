"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import type { FamilyTreeNode } from "@/lib/types";
import { rawId, personImageUrl } from "@/lib/api";
import { personIcon } from "@/components/PersonCard";
import { useRouter } from "next/navigation";

// ── Custom person node ──────────────────────────────────────────────────────

type NodeData = {
  id: string;
  name: string;
  sex: string;
  isRoot: boolean;
  dob?: string;
  imagePath?: string | null;
};

function PersonNode({ data }: NodeProps) {
  const router = useRouter();
  const d = data as NodeData;
  const [imgError, setImgError] = useState(false);
  const showImage = !!d.imagePath && !imgError;

  return (
    <div
      onClick={() => router.push(`/persons/${rawId(d.id)}`)}
      className={`cursor-pointer rounded-xl border-2 shadow-md px-4 py-3 w-[148px] text-center select-none transition-shadow hover:shadow-lg ${
        d.isRoot
          ? "border-emerald-600 bg-emerald-50"
          : "border-stone-300 bg-white hover:border-emerald-400"
      }`}
    >
      <Handle type="source" position={Position.Bottom} className="!bg-stone-400" />
      <Handle type="target" position={Position.Top} className="!bg-stone-400" />

      <div className="flex justify-center mb-2">
        {showImage ? (
          <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-stone-200 bg-stone-100">
            <Image
              src={personImageUrl(d.id)}
              alt=""
              fill
              className="object-cover"
              onError={() => setImgError(true)}
              sizes="56px"
              unoptimized
            />
          </div>
        ) : (
          <span className="text-4xl leading-none">{d.sex === "Female" ? "👩" : "👨"}</span>
        )}
      </div>

      <div className={`font-semibold text-sm leading-tight ${d.isRoot ? "text-emerald-800" : "text-stone-800"}`}>
        {d.name}
      </div>
      {d.dob && <div className="text-xs text-stone-400 mt-1">b. {d.dob}</div>}
    </div>
  );
}

const nodeTypes = { person: PersonNode };

// ── Tree → nodes/edges ──────────────────────────────────────────────────────

const X_GAP = 200;
const Y_GAP = 180;

function buildGraph(
  node: FamilyTreeNode,
  x: number,
  y: number,
  nodes: Node[],
  edges: Edge[],
  visited = new Set<string>(),
  isRoot = false
) {
  if (visited.has(node.id)) return;
  visited.add(node.id);

  nodes.push({
    id: node.id,
    type: "person",
    position: { x, y },
    data: {
      id: node.id,
      name: [node.first_name, node.family_name].join(" "),
      sex: node.sex ?? "Male",
      isRoot,
      dob: undefined,
      imagePath: node.image_path ?? null,
    } satisfies NodeData,
  });

  const parents = [...(node.father ?? []), ...(node.mother ?? [])];
  const total = parents.length;
  const startX = x - ((total - 1) * X_GAP) / 2;

  parents.forEach((parent, i) => {
    const px = startX + i * X_GAP;
    const py = y - Y_GAP;

    buildGraph(parent, px, py, nodes, edges, visited, false);

    edges.push({
      id: `${parent.id}->${node.id}`,
      source: parent.id,
      target: node.id,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#a8a29e" },
      style: { stroke: "#a8a29e", strokeWidth: 1.5 },
    });
  });
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  tree: FamilyTreeNode;
}

export default function FamilyTreeView({ tree }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    buildGraph(tree, 0, 0, nodes, edges, new Set(), true);
    return { nodes, edges };
  }, [tree]);

  const onNodeClick = useCallback(() => {
    // future: open edit panel
  }, []);

  return (
    <div className="w-full h-[560px] rounded-xl border border-stone-200 overflow-hidden shadow-inner bg-stone-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d6d3d1" gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) =>
            (n.data as NodeData).isRoot ? "#059669" : "#d6d3d1"
          }
          maskColor="rgba(240,236,232,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
