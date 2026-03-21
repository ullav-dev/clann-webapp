"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
import { rawId, personImageUrl, listPersons, getRelationships } from "@/lib/api";
import { useTree } from "@/contexts/TreeContext";
import { useAuth } from "@/contexts/AuthContext";
import { personIcon } from "@/components/PersonCard";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Orientation = "vertical" | "horizontal";
type Role = "root" | "father" | "mother" | "child" | "spouse" | "sibling";

type NodeData = {
  id: string;
  name: string;
  sex: string;
  role: Role;
  dob?: string;
  placeOfBirth?: string | null;
  biography?: string | null;
  imagePath?: string | null;
  orientation: Orientation;
};

// Per-role visual style
const ROLE_STYLES: Record<Role, { border: string; bg: string; text: string; handle: string; minimap: string }> = {
  root:    { border: "border-emerald-600", bg: "bg-emerald-50",  text: "text-emerald-800", handle: "!bg-emerald-500", minimap: "#059669" },
  father:  { border: "border-blue-400",    bg: "bg-blue-50",     text: "text-blue-800",    handle: "!bg-blue-400",    minimap: "#60a5fa" },
  mother:  { border: "border-rose-400",    bg: "bg-rose-50",     text: "text-rose-800",    handle: "!bg-rose-400",    minimap: "#fb7185" },
  child:   { border: "border-amber-400",   bg: "bg-amber-50",    text: "text-amber-800",   handle: "!bg-amber-400",   minimap: "#fbbf24" },
  spouse:  { border: "border-violet-400",  bg: "bg-violet-50",   text: "text-violet-800",  handle: "!bg-violet-400",  minimap: "#a78bfa" },
  sibling: { border: "border-teal-400",    bg: "bg-teal-50",     text: "text-teal-800",    handle: "!bg-teal-400",    minimap: "#2dd4bf" },
};

// ── Custom person node ───────────────────────────────────────────────────────

function PersonNode({ data }: NodeProps) {
  const router = useRouter();
  const d = data as NodeData;
  const [imgError, setImgError] = useState(false);
  const showImage = !!d.imagePath && !imgError;

  const style = ROLE_STYLES[d.role];
  const isH = d.orientation === "horizontal";

  const hasTooltip = !!(d.dob || d.placeOfBirth || d.biography);

  return (
    <div className="group relative">
      <div
        onClick={() => router.push(`/persons/${rawId(d.id)}`)}
        className={`cursor-pointer rounded-xl border-2 shadow-md px-4 py-3 w-[148px] text-center select-none transition-shadow hover:shadow-lg ${style.border} ${style.bg}`}
      >
        {/* Main-axis handles */}
        <Handle id="main-s" type="source" position={isH ? Position.Left   : Position.Bottom} className={style.handle} />
        <Handle id="main-t" type="target" position={isH ? Position.Right  : Position.Top}    className={style.handle} />
        {/* Spouse-axis handles (perpendicular) */}
        <Handle id="sp-s" type="source" position={isH ? Position.Bottom : Position.Right} className={style.handle} />
        <Handle id="sp-t" type="target" position={isH ? Position.Top    : Position.Left}  className={style.handle} />

        <div className="flex justify-center mb-2">
          {showImage ? (
            <div className={`relative w-14 h-14 rounded-full overflow-hidden ring-2 bg-stone-100 ${
              d.role === "father" ? "ring-blue-200" : d.role === "mother" ? "ring-rose-200" : "ring-emerald-200"
            }`}>
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

        <div className={`font-semibold text-sm leading-tight ${style.text}`}>
          {d.name}
        </div>
        {d.dob && <div className="text-xs text-stone-400 mt-1">b. {d.dob}</div>}
      </div>

      {hasTooltip && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block">
          <div className="bg-stone-800 text-white text-xs rounded-lg px-3 py-2 w-52 shadow-xl space-y-1">
            {d.dob && (
              <div><span className="text-stone-400">b.</span> {d.dob}</div>
            )}
            {d.placeOfBirth && (
              <div><span className="text-stone-400">from</span> {d.placeOfBirth}</div>
            )}
            {d.biography && (
              <div className="pt-1 border-t border-stone-600 text-stone-200 leading-snug line-clamp-4">
                {d.biography}
              </div>
            )}
          </div>
          <div className="mx-auto w-2 h-2 bg-stone-800 rotate-45 -mt-1" />
        </div>
      )}
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
  role: Role,
  visited = new Set<string>(),
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
      role,
      dob: node.date_of_birth ?? undefined,
      placeOfBirth: node.place_of_birth ?? null,
      biography: node.biography ?? null,
      imagePath: node.image_path ?? null,
      orientation,
    } satisfies NodeData,
  });

  const fathers = node.father ?? [];
  const mothers = node.mother ?? [];
  const nodeChildren = node.children ?? [];
  const nodeSpouses = node.spouse ?? [];
  const totalParents = fathers.length + mothers.length;

  // Layout ancestors: fathers first, then mothers
  [...fathers.map(p => ({ p, parentRole: "father" as Role })),
   ...mothers.map(p => ({ p, parentRole: "mother" as Role }))
  ].forEach(({ p, parentRole }, i) => {
    let px: number;
    let py: number;

    if (orientation === "vertical") {
      const startX = x - ((totalParents - 1) * X_GAP) / 2;
      px = startX + i * X_GAP;
      py = y - Y_GAP;
    } else {
      const startY = y - ((totalParents - 1) * Y_GAP) / 2;
      px = x + X_GAP;
      py = startY + i * Y_GAP;
    }

    buildGraph(p, px, py, nodes, edges, orientation, parentRole, visited);

    const edgeColor = parentRole === "father" ? "#93c5fd" : "#fda4af"; // blue-300 / rose-300
    edges.push({
      id: `${p.id}->${node.id}`,
      source: p.id,      sourceHandle: "main-s",
      target: node.id,   targetHandle: "main-t",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      style: { stroke: edgeColor, strokeWidth: 1.5 },
    });
  });

  // Layout children below (vertical) or to the left (horizontal) of this node
  nodeChildren.forEach((child, i) => {
    let px: number;
    let py: number;

    if (orientation === "vertical") {
      const startX = x - ((nodeChildren.length - 1) * X_GAP) / 2;
      px = startX + i * X_GAP;
      py = y + Y_GAP;
    } else {
      const startY = y - ((nodeChildren.length - 1) * Y_GAP) / 2;
      px = x - X_GAP;
      py = startY + i * Y_GAP;
    }

    buildGraph(child, px, py, nodes, edges, orientation, "child", visited);

    const edgeColor = "#fcd34d"; // amber-300
    edges.push({
      id: `${node.id}->${child.id}`,
      source: node.id,   sourceHandle: "main-s",
      target: child.id,  targetHandle: "main-t",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      style: { stroke: edgeColor, strokeWidth: 1.5 },
    });
  });

  // Layout spouses perpendicular to the ancestor/child axis:
  //   vertical   → spouses to the right, at the same Y level
  //   horizontal → spouses below, at the same X level
  nodeSpouses.forEach((sp, i) => {
    let px: number;
    let py: number;

    if (orientation === "vertical") {
      px = x + (i + 1) * X_GAP;
      py = y;
    } else {
      px = x;
      py = y + (i + 1) * Y_GAP;
    }

    buildGraph(sp, px, py, nodes, edges, orientation, "spouse", visited);

    const edgeColor = "#c4b5fd"; // violet-300
    edges.push({
      id: `${node.id}~sp~${sp.id}`,
      source: node.id,  sourceHandle: "sp-s",
      target: sp.id,    targetHandle: "sp-t",
      type: "straight",
      style: { stroke: edgeColor, strokeWidth: 2, strokeDasharray: "5 3" },
    });
  });
}

// ── Legend ───────────────────────────────────────────────────────────────────

type TranslateFn = ReturnType<typeof useTranslations>;

function Legend({ t }: { t: TranslateFn }) {
  return (
    <div className="inline-flex items-center gap-4 text-xs text-stone-600">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm border-2 border-emerald-600 bg-emerald-50" />
        {t("legendYou")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm border-2 border-blue-400 bg-blue-50" />
        {t("legendFather")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm border-2 border-rose-400 bg-rose-50" />
        {t("legendMother")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm border-2 border-amber-400 bg-amber-50" />
        {t("legendChild")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm border-2 border-violet-400 bg-violet-50" />
        {t("legendSpouse")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm border-2 border-teal-400 bg-teal-50" />
        {t("legendSibling")}
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  tree: FamilyTreeNode;
}

export default function FamilyTreeView({ tree }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("familyTree");
  const { activeTree } = useTree();
  const { user } = useAuth();
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [showSiblings, setShowSiblings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const visited = new Set<string>();
    buildGraph(tree, 0, 0, nodes, edges, orientation, "root", visited);

    if (showSiblings) {
      (tree.siblings ?? []).forEach((sib, i) => {
        if (visited.has(sib.id)) return;
        visited.add(sib.id);

        // Siblings sit at the same level as root, to the left (vertical) or above (horizontal)
        const px = orientation === "vertical" ? -(i + 1) * X_GAP : 0;
        const py = orientation === "vertical" ? 0 : -(i + 1) * Y_GAP;

        nodes.push({
          id: sib.id,
          type: "person",
          position: { x: px, y: py },
          width: 148,
          height: 120,
          data: {
            id: sib.id,
            name: [sib.first_name, sib.family_name].join(" "),
            sex: sib.sex ?? "Male",
            role: "sibling" as Role,
            dob: sib.date_of_birth ?? undefined,
            placeOfBirth: sib.place_of_birth ?? null,
            biography: sib.biography ?? null,
            imagePath: sib.image_path ?? null,
            orientation,
          } satisfies NodeData,
        });

        const edgeColor = "#5eead4"; // teal-300
        edges.push({
          id: `${tree.id}~sib~${sib.id}`,
          // sibling is to the left/above; connect via perpendicular handles
          source: sib.id,  sourceHandle: "sp-s",
          target: tree.id, targetHandle: "sp-t",
          type: "straight",
          style: { stroke: edgeColor, strokeWidth: 2, strokeDasharray: "4 3" },
        });
      });
    }

    return { nodes, edges };
  }, [tree, orientation, showSiblings]);

  const onNodeClick = useCallback(() => {
    // future: open edit panel
  }, []);

  const exportJson = useCallback(async () => {
    if (!activeTree || !user) return;
    setExportingJson(true);
    try {
      const persons = await listPersons(user.username, activeTree.name);

      const relResults: { id: string; r: Awaited<ReturnType<typeof getRelationships>> }[] = [];
      for (const p of persons) {
        const r = await getRelationships(p.id, user.username);
        relResults.push({ id: p.id, r });
      }

      const relKeys = new Set<string>();
      const relationships: object[] = [];
      function addRel(type: string, personId: string, relatedId: string, siblingType?: string) {
        const key =
          type === "Spouse" || type === "Sibling"
            ? `${type}:${[personId, relatedId].sort().join(":")}`
            : `${type}:${personId}:${relatedId}`;
        if (!relKeys.has(key)) {
          relKeys.add(key);
          const rel: Record<string, string> = { type, person_id: personId, related_id: relatedId };
          if (siblingType) rel.sibling_type = siblingType;
          relationships.push(rel);
        }
      }

      for (const { id, r } of relResults) {
        for (const p of r.father)   addRel("Father",  id, p.id);
        for (const p of r.mother)   addRel("Mother",  id, p.id);
        for (const p of r.siblings) addRel("Sibling", id, p.id, p.sex === "Female" ? "Sister" : "Brother");
        for (const p of r.spouse)   addRel("Spouse",  id, p.id);
      }

      const exportPersons = persons.map(({ id, first_name, family_name, middle_name, sex,
        date_of_birth, date_of_death, place_of_birth, place_of_death,
        nickname, username, email, biography, verified }) => ({
        id, first_name, family_name, middle_name, sex,
        date_of_birth, date_of_death, place_of_birth, place_of_death,
        nickname, username, email, biography, verified,
      }));

      const payload = {
        tree_name: activeTree.name,
        tree_display_name: activeTree.display_name,
        exported_at: new Date().toISOString(),
        persons: exportPersons,
        relationships,
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeTree.name}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingJson(false);
    }
  }, [activeTree, user]);

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
      link.download = `${activeTree?.name ?? "family-tree"}.jpg`;
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
            title={t("orientationVerticalTitle")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              orientation === "vertical"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L7.707 7.707A1 1 0 016.293 6.293l3-3A1 1 0 0110 3z" clipRule="evenodd" />
            </svg>
            {t("orientationVertical")}
          </button>
          <button
            onClick={() => setOrientation("horizontal")}
            title={t("orientationHorizontalTitle")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-stone-300 ${
              orientation === "horizontal"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L12.586 8H4a1 1 0 110-2h8.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {t("orientationHorizontal")}
          </button>
        </div>

        {/* Siblings toggle */}
        <button
          onClick={() => setShowSiblings((v) => !v)}
          title={t("siblingsToggleTitle")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border shadow-sm transition-colors ${
            showSiblings
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
          }`}
        >
          {t("siblingsToggle")}
        </button>

        <Legend t={t} />

        {/* Export buttons */}
        <div className="inline-flex items-center gap-2">
        <button
          onClick={exportJson}
          disabled={exportingJson}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-400 transition-colors disabled:opacity-50"
        >
          {exportingJson ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          {t("exportJson")}
        </button>
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
              {t("exporting")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {t("exportJpeg")}
            </>
          )}
        </button>
        </div>
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
            nodeColor={(n) => ROLE_STYLES[(n.data as NodeData).role].minimap}
            maskColor="rgba(240,236,232,0.6)"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
    </div>
  );
}
