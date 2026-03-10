"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { toJpeg } from "html-to-image";
import type { FamilyTreeNode } from "@/lib/types";
import { rawId, personImageUrl } from "@/lib/api";
import { personIcon } from "@/components/PersonCard";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Orientation = "vertical" | "horizontal";

type NodeData = {
  id: string;
  name: string;
  sex: string;
  isRoot: boolean;
  dob?: string;
  imagePath?: string | null;
  orientation: Orientation;
};

// ── Custom person node ───────────────────────────────────────────────────────

function PersonNode({ data }: NodeProps) {
  const router = useRouter();
  const d = data as NodeData;
  const [imgError, setImgError] = useState(false);
  const showImage = !!d.imagePath && !imgError;

  // Handle positions depend on orientation:
  //   vertical   → source exits Bottom, target enters Top    (ancestors above)
  //   horizontal → source exits Left,   target enters Right  (ancestors to the right)
  const sourcePos = d.orientation === "horizontal" ? Position.Left : Position.Bottom;
  const targetPos = d.orientation === "horizontal" ? Position.Right : Position.Top;

  return (
    <div
      onClick={() => router.push(`/persons/${rawId(d.id)}`)}
      className={`cursor-pointer rounded-xl border-2 shadow-md px-4 py-3 w-[148px] text-center select-none transition-shadow hover:shadow-lg ${
        d.isRoot
          ? "border-emerald-600 bg-emerald-50"
          : "border-stone-300 bg-white hover:border-emerald-400"
      }`}
    >
      <Handle type="source" position={sourcePos} className="!bg-stone-400" />
      <Handle type="target" position={targetPos} className="!bg-stone-400" />

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

// ── Tree → nodes/edges ───────────────────────────────────────────────────────

// Vertical: X_GAP = sibling spread, Y_GAP = generation depth
// Horizontal: Y_GAP = sibling spread, X_GAP = generation depth (reused, swapped)
const X_GAP = 200;
const Y_GAP = 180;

function buildGraph(
  node: FamilyTreeNode,
  x: number,
  y: number,
  nodes: Node[],
  edges: Edge[],
  orientation: Orientation,
  visited = new Set<string>(),
  isRoot = false
) {
  if (visited.has(node.id)) return;
  visited.add(node.id);

  nodes.push({
    id: node.id,
    type: "person",
    position: { x, y },
    width: 148,
    height: 120,
    data: {
      id: node.id,
      name: [node.first_name, node.family_name].join(" "),
      sex: node.sex ?? "Male",
      isRoot,
      dob: undefined,
      imagePath: node.image_path ?? null,
      orientation,
    } satisfies NodeData,
  });

  const parents = [...(node.father ?? []), ...(node.mother ?? [])];
  const total = parents.length;

  parents.forEach((parent, i) => {
    let px: number;
    let py: number;

    if (orientation === "vertical") {
      // Ancestors spread horizontally above the child
      const startX = x - ((total - 1) * X_GAP) / 2;
      px = startX + i * X_GAP;
      py = y - Y_GAP;
    } else {
      // Ancestors spread vertically to the right of the child
      const startY = y - ((total - 1) * Y_GAP) / 2;
      px = x + X_GAP;
      py = startY + i * Y_GAP;
    }

    buildGraph(parent, px, py, nodes, edges, orientation, visited, false);

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

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  tree: FamilyTreeNode;
}

export default function FamilyTreeView({ tree }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [exporting, setExporting] = useState(false);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    buildGraph(tree, 0, 0, nodes, edges, orientation, new Set(), true);
    return { nodes, edges };
  }, [tree, orientation]);

  const onNodeClick = useCallback(() => {
    // future: open edit panel
  }, []);

  const exportJpeg = useCallback(async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toJpeg(containerRef.current, {
        quality: 0.95,
        backgroundColor: "#fafaf9",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `family-tree-${tree.family_name ?? "export"}.jpg`;
      link.click();
    } finally {
      setExporting(false);
    }
  }, [tree.family_name]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {/* Orientation toggle */}
        <div className="inline-flex rounded-lg border border-stone-300 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setOrientation("vertical")}
            title="Ancestors above (top-to-bottom)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              orientation === "vertical"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            {/* vertical arrow icon */}
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L7.707 7.707A1 1 0 016.293 6.293l3-3A1 1 0 0110 3z" clipRule="evenodd" />
            </svg>
            Vertical
          </button>
          <button
            onClick={() => setOrientation("horizontal")}
            title="Ancestors to the left (left-to-right)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-stone-300 ${
              orientation === "horizontal"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            {/* horizontal arrow icon */}
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L12.586 8H4a1 1 0 110-2h8.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Horizontal
          </button>
        </div>

        {/* Export button */}
        <button
          onClick={exportJpeg}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-400 transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Exporting…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export as JPEG
            </>
          )}
        </button>
      </div>

      <div ref={containerRef} className="w-full h-[560px] rounded-xl border border-stone-200 overflow-hidden shadow-inner bg-stone-50">
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
              (n.data as NodeData).isRoot ? "#059669" : "#78716c"
            }
            maskColor="rgba(240,236,232,0.6)"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </div>
  );
}
