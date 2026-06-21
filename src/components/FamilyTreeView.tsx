"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import {
  ReactFlow,
  Background,
  Controls,
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
import { exportToGedcom } from "@/lib/gedcom-export";
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
  /** Pedigree qualifier — set on sibling, father, and mother nodes for non-birth relationships */
  pedigree?: "birth" | "adopted" | "half" | null;
  dob?: string;
  placeOfBirth?: string | null;
  biography?: string | null;
  imagePath?: string | null;
  imageVersion?: number;
  orientation: Orientation;
};

// Per-role visual style
const ROLE_STYLES: Record<Role, { border: string; bg: string; text: string; handle: string }> = {
  root:    { border: "border-emerald-700", bg: "bg-emerald-600", text: "text-white",        handle: "!bg-white"       },
  father:  { border: "border-blue-400",    bg: "bg-blue-50",     text: "text-blue-800",    handle: "!bg-blue-400"    },
  mother:  { border: "border-rose-400",    bg: "bg-rose-50",     text: "text-rose-800",    handle: "!bg-rose-400"    },
  child:   { border: "border-amber-400",   bg: "bg-amber-50",    text: "text-amber-800",   handle: "!bg-amber-400"   },
  spouse:  { border: "border-violet-400",  bg: "bg-violet-50",   text: "text-violet-800",  handle: "!bg-violet-400"  },
  sibling: { border: "border-teal-400",    bg: "bg-teal-50",     text: "text-teal-800",    handle: "!bg-teal-400"    },
};

// ── Custom person node ───────────────────────────────────────────────────────

function PersonNode({ data }: NodeProps) {
  const router = useRouter();
  const d = data as NodeData;
  const [imgError, setImgError] = useState(false);
  const showImage = !!d.imagePath && !imgError;
  const imgSrc = `${personImageUrl(d.id)}${d.imageVersion ? `?v=${d.imageVersion}` : ""}`;

  const style = ROLE_STYLES[d.role];
  const isH = d.orientation === "horizontal";

  const hasTooltip = !!(d.dob || d.placeOfBirth || d.biography);

  const isRoot = d.role === "root";
  const showsPedigree = d.role === "sibling" || d.role === "father" || d.role === "mother";
  const pedigreeValue = showsPedigree ? (d.pedigree ?? "birth") : null;
  const pedigreeBadge: Record<string, { label: string; cls: string }> = {
    half:    { label: "½",      cls: "bg-orange-400 text-white" },
    adopted: { label: "A",      cls: "bg-sky-500 text-white"    },
  };
  const badge = pedigreeValue && pedigreeValue !== "birth" ? pedigreeBadge[pedigreeValue] : null;

  return (
    <div className="group relative">
      {/* Star badge — anchored to the card's top-right corner */}
      {isRoot && (
        <div className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] leading-none select-none">
          ★
        </div>
      )}
      {/* Pedigree badge for half / adopted siblings and parents */}
      {badge && (
        <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold border-2 border-white shadow-md leading-none select-none whitespace-nowrap ${badge.cls}`}>
          {badge.label}
        </div>
      )}
      <div
        onClick={() => router.push(`/persons/${rawId(d.id)}`)}
        className={`cursor-pointer rounded-xl border-2 px-4 py-3 w-[148px] text-center select-none transition-shadow ${style.border} ${style.bg} ${
          isRoot
            ? "shadow-xl shadow-emerald-400/50 ring-2 ring-emerald-400 ring-offset-2 hover:shadow-2xl hover:shadow-emerald-400/60"
            : "shadow-md hover:shadow-lg"
        }`}
      >
        {/* Main-axis handles */}
        <Handle id="main-s" type="source" position={isH ? Position.Left   : Position.Bottom} className={style.handle} />
        <Handle id="main-t" type="target" position={isH ? Position.Right  : Position.Top}    className={style.handle} />
        {/* Spouse-axis handles (perpendicular) */}
        <Handle id="sp-s" type="source" position={isH ? Position.Bottom : Position.Right} className={style.handle} />
        <Handle id="sp-t" type="target" position={isH ? Position.Top    : Position.Left}  className={style.handle} />
        {/* Half-sibling handle — source at Top (vertical) so arcs sweep upward to root */}
        <Handle id="sib-s" type="source" position={isH ? Position.Bottom : Position.Top} className={style.handle} />

        <div className="flex justify-center mb-2">
          {showImage ? (
            <div className={`relative w-14 h-14 rounded-full overflow-hidden ring-2 bg-stone-100 ${
              isRoot ? "ring-white/70" : d.role === "father" ? "ring-blue-200" : d.role === "mother" ? "ring-rose-200" : "ring-emerald-200"
            }`}>
              <Image
                src={imgSrc}
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
        {d.dob && <div className={`text-xs mt-1 ${isRoot ? "text-emerald-100" : "text-stone-400"}`}>b. {d.dob}</div>}
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
  photoVersions?: Record<string, number>,
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
      pedigree: node.pedigree ?? null,
      dob: node.date_of_birth ?? undefined,
      placeOfBirth: node.place_of_birth ?? null,
      biography: node.biography ?? null,
      imagePath: node.image_path ?? null,
      imageVersion: photoVersions?.[rawId(node.id)],
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

    buildGraph(p, px, py, nodes, edges, orientation, parentRole, visited, photoVersions);

    const edgeColor = parentRole === "father" ? "#93c5fd" : "#fda4af"; // blue-300 / rose-300
    const pedigree = p.pedigree ?? "birth";
    const pedigreeStyle =
      pedigree === "adopted" ? { strokeDasharray: "6 3" } :
      pedigree === "half"    ? { strokeDasharray: "2 4" } :
      {};
    edges.push({
      id: `${p.id}->${node.id}`,
      source: p.id,      sourceHandle: "main-s",
      target: node.id,   targetHandle: "main-t",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      style: { stroke: edgeColor, strokeWidth: 1.5, ...pedigreeStyle },
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

    buildGraph(child, px, py, nodes, edges, orientation, "child", visited, photoVersions);

    const edgeColor = "#fcd34d"; // amber-300
    const childPed = child.pedigree ?? "birth";
    const childStyle =
      childPed === "adopted" ? { strokeDasharray: "6 3" } :
      childPed === "half"    ? { strokeDasharray: "2 4" } :
      {};
    edges.push({
      id: `${node.id}->${child.id}`,
      source: node.id,   sourceHandle: "main-s",
      target: child.id,  targetHandle: "main-t",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
      style: { stroke: edgeColor, strokeWidth: 1.5, ...childStyle },
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

    buildGraph(sp, px, py, nodes, edges, orientation, "spouse", visited, photoVersions);

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

function PedigreeLineSwatch({ dasharray, opacity = 1 }: { dasharray?: string; opacity?: number }) {
  return (
    <svg width="20" height="10" className="inline-block flex-shrink-0">
      <line
        x1="0" y1="5" x2="20" y2="5"
        stroke="#78716c"
        strokeWidth="2"
        strokeDasharray={dasharray}
        opacity={opacity}
      />
    </svg>
  );
}

function Legend({ t, hasNonBirth }: { t: TranslateFn; hasNonBirth: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
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
      {hasNonBirth && (
        <>
          <span className="w-px h-4 bg-stone-300" />
          <span className="flex items-center gap-1.5">
            <PedigreeLineSwatch />
            {t("legendBirth")}
          </span>
          <span className="flex items-center gap-1.5">
            <PedigreeLineSwatch dasharray="6 3" />
            {t("legendAdopted")}
          </span>
          <span className="flex items-center gap-1.5">
            <PedigreeLineSwatch dasharray="2 4" />
            {t("legendHalf")}
          </span>
        </>
      )}
    </div>
  );
}

// ── DAM access check ─────────────────────────────────────────────────────────

/** Returns true if the JWT payload grants admin role or an active DAM subscription. */
function hasDamAccess(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    const roles = (payload.roles ?? []) as string[];
    if (roles.includes("admin")) return true;
    const subs = (payload.subscriptions ?? {}) as Record<string, { status?: string }>;
    const comad = subs["comad"];
    if (comad && ["active", "trialing"].includes(comad.status ?? "")) return true;
    return false;
  } catch {
    return false;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  tree: FamilyTreeNode;
  photoVersions?: Record<string, number>;
}

export default function FamilyTreeView({ tree, photoVersions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("familyTree");
  const locale = useLocale();
  const { activeTree } = useTree();
  const { user, token, roles } = useAuth();
  const canUseDam = hasDamAccess(token);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [showSiblings, setShowSiblings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingGedcom, setExportingGedcom] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as globalThis.Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const visited = new Set<string>();
    buildGraph(tree, 0, 0, nodes, edges, orientation, "root", visited, photoVersions);

    if (showSiblings) {
      const allSibs = tree.siblings ?? [];
      const birthSibs   = allSibs.filter(s => (s.pedigree ?? "birth") === "birth");
      const nonBirthSibs = allSibs.filter(s => (s.pedigree ?? "birth") !== "birth");
      const nBirthSibs  = birthSibs.length;
      const nChildren   = (tree.children ?? []).length;

      function addSibNode(sib: typeof allSibs[0], px: number, py: number) {
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
            pedigree: sib.pedigree ?? "birth",
            dob: sib.date_of_birth ?? undefined,
            placeOfBirth: sib.place_of_birth ?? null,
            biography: sib.biography ?? null,
            imagePath: sib.image_path ?? null,
            imageVersion: photoVersions?.[rawId(sib.id)],
            orientation,
          } satisfies NodeData,
        });
      }

      // Birth siblings — same row as root, to the left (vertical) or above (horizontal).
      // Clean straight horizontal/vertical sp-s→sp-t edges.
      birthSibs.forEach((sib, i) => {
        if (visited.has(sib.id)) return;
        visited.add(sib.id);
        const px = orientation === "vertical" ? -(i + 1) * X_GAP : 0;
        const py = orientation === "vertical" ? 0 : -(i + 1) * Y_GAP;
        addSibNode(sib, px, py);
        edges.push({
          id: `${tree.id}~sib~${sib.id}`,
          source: sib.id,  sourceHandle: "sp-s",
          target: tree.id, targetHandle: "sp-t",
          type: "straight",
          style: { stroke: "#5eead4", strokeWidth: 2 },
        });
      });

      // Non-birth siblings (half / adopted) — placed in a separate row.
      // Grouped by via_parent_id so half-siblings from different families are
      // visually separated. Each group is a distinct cluster with extra gap between groups.
      if (nonBirthSibs.length > 0) {
        const stepBase = orientation === "vertical"
          ? -(Math.max(nBirthSibs, Math.ceil(nChildren / 2)) + 2) * X_GAP
          : 0;

        // Group by via_parent_id. Siblings with no via_parent_id share one "unlinked" bucket.
        const groups = new Map<string, typeof nonBirthSibs>();
        for (const sib of nonBirthSibs) {
          const key = sib.via_parent_id ?? "unlinked";
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(sib);
        }

        if (orientation === "vertical") {
          // Each group is a horizontal cluster at y=2*Y_GAP, separated by an extra gap slot.
          let xCursor = stepBase;
          for (const [, groupSibs] of groups) {
            groupSibs.forEach((sib, j) => {
              if (visited.has(sib.id)) return;
              visited.add(sib.id);
              addSibNode(sib, xCursor - j * X_GAP, 2 * Y_GAP);
              const sibPed = sib.pedigree ?? "birth";
              const sibStyle =
                sibPed === "half"    ? { strokeDasharray: "2 4" } :
                sibPed === "adopted" ? { strokeDasharray: "6 3" } : {};
              edges.push({
                id: `${tree.id}~sib~${sib.id}`,
                source: sib.id,  sourceHandle: "sib-s",
                target: tree.id, targetHandle: "sp-t",
                type: "default",
                style: { stroke: "#5eead4", strokeWidth: 2, ...sibStyle },
              });
            });
            // Advance cursor: group width + 1 extra gap slot between groups
            xCursor -= (groupSibs.length + 1) * X_GAP;
          }
        } else {
          // Horizontal orientation: stack groups vertically above root, beyond birth siblings
          let yOffset = nBirthSibs + 2;
          for (const [, groupSibs] of groups) {
            groupSibs.forEach((sib, j) => {
              if (visited.has(sib.id)) return;
              visited.add(sib.id);
              addSibNode(sib, 0, -(yOffset + j) * Y_GAP);
              const sibPed = sib.pedigree ?? "birth";
              const sibStyle =
                sibPed === "half"    ? { strokeDasharray: "2 4" } :
                sibPed === "adopted" ? { strokeDasharray: "6 3" } : {};
              edges.push({
                id: `${tree.id}~sib~${sib.id}`,
                source: sib.id,  sourceHandle: "sp-s",
                target: tree.id, targetHandle: "sp-t",
                type: "straight",
                style: { stroke: "#5eead4", strokeWidth: 2, ...sibStyle },
              });
            });
            yOffset += groupSibs.length + 1;
          }
        }
      }
    }

    return { nodes, edges };
  }, [tree, orientation, showSiblings, photoVersions]);

  const hasNonBirth = useMemo(() => {
    function check(node: FamilyTreeNode): boolean {
      for (const p of [...(node.father ?? []), ...(node.mother ?? [])]) {
        if (p.pedigree && p.pedigree !== "birth") return true;
        if (check(p)) return true;
      }
      for (const c of node.children ?? []) {
        if (c.pedigree && c.pedigree !== "birth") return true;
      }
      for (const s of node.siblings ?? []) {
        if (s.pedigree && s.pedigree !== "birth") return true;
      }
      return false;
    }
    return check(tree);
  }, [tree]);

  // Elevate the hovered node so its tooltip stacks above all other nodes.
  // Each React Flow node wrapper has a CSS transform that creates a stacking
  // context, so z-index inside the node only works within that context.
  // Setting zIndex on the node object itself lifts the whole wrapper.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const displayNodes = useMemo(
    () => nodes.map((n) => n.id === hoveredNodeId ? { ...n, zIndex: 1000 } : n),
    [nodes, hoveredNodeId],
  );

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
      function addRel(type: string, personId: string, relatedId: string, extra?: Record<string, string | null>) {
        const pedigree = (extra?.pedigree ?? "birth");
        const key =
          type === "Spouse" || type === "Sibling"
            ? `${type}:${[personId, relatedId].sort().join(":")}`
            : `${type}:${personId}:${relatedId}:${pedigree}`;
        if (!relKeys.has(key)) {
          relKeys.add(key);
          relationships.push({ type, person_id: personId, related_id: relatedId, ...extra });
        }
      }

      for (const { id, r } of relResults) {
        for (const p of r.father)   addRel("Father",  id, p.id, { pedigree: p.pedigree });
        for (const p of r.mother)   addRel("Mother",  id, p.id, { pedigree: p.pedigree });
        for (const p of r.siblings) addRel("Sibling", id, p.id, { sibling_type: p.sex === "Female" ? "Sister" : "Brother" });
        for (const p of r.spouse)   addRel("Spouse",  id, p.id, { spouse_from: p.spouse_from ?? null, spouse_to: p.spouse_to ?? null });
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

  const exportGedcom = useCallback(async () => {
    if (!activeTree || !user) return;
    setExportingGedcom(true);
    try {
      const persons = await listPersons(user.username, activeTree.name);

      const relResults: { id: string; r: Awaited<ReturnType<typeof getRelationships>> }[] = [];
      for (const p of persons) {
        const r = await getRelationships(p.id, user.username);
        relResults.push({ id: p.id, r });
      }

      const relKeys = new Set<string>();
      const relationships: { type: string; person_id: string; related_id: string; pedigree?: string; spouse_from?: string | null; spouse_to?: string | null }[] = [];
      function addRel(type: string, personId: string, relatedId: string, extra?: { pedigree?: string; spouse_from?: string | null; spouse_to?: string | null }) {
        const pedigree = extra?.pedigree ?? "birth";
        const key =
          type === "Spouse" || type === "Sibling"
            ? `${type}:${[personId, relatedId].sort().join(":")}`
            : `${type}:${personId}:${relatedId}:${pedigree}`;
        if (!relKeys.has(key)) {
          relKeys.add(key);
          relationships.push({ type, person_id: personId, related_id: relatedId, ...extra });
        }
      }

      for (const { id, r } of relResults) {
        for (const p of r.father)   addRel("Father",  id, p.id, { pedigree: p.pedigree });
        for (const p of r.mother)   addRel("Mother",  id, p.id, { pedigree: p.pedigree });
        for (const p of r.siblings) addRel("Sibling", id, p.id);
        for (const p of r.spouse)   addRel("Spouse",  id, p.id, { spouse_from: p.spouse_from ?? null, spouse_to: p.spouse_to ?? null });
      }

      const exportPersons = persons.map(({ id, first_name, family_name, middle_name, sex,
        date_of_birth, date_of_death, place_of_birth, place_of_death,
        nickname, biography }) => ({
        id, first_name, family_name, middle_name, sex,
        date_of_birth, date_of_death, place_of_birth, place_of_death,
        nickname, biography,
      }));

      const gedcom = exportToGedcom(exportPersons, relationships, activeTree.name);
      const blob = new Blob([gedcom], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeTree.name}.ged`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingGedcom(false);
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
      {/* Button toolbar — orientation, siblings, export, DAM */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Orientation toggle */}
        <div className="inline-flex rounded-lg border border-stone-300 bg-white shadow-sm overflow-hidden flex-shrink-0">
          <button
            onClick={() => setOrientation("vertical")}
            title={t("orientationVerticalTitle")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              orientation === "vertical"
                ? "bg-emerald-700 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L7.707 7.707A1 1 0 016.293 6.293l3-3A1 1 0 0110 3z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">{t("orientationVertical")}</span>
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
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L12.586 8H4a1 1 0 110-2h8.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">{t("orientationHorizontal")}</span>
          </button>
        </div>

        {/* Siblings toggle */}
        <button
          onClick={() => setShowSiblings((v) => !v)}
          title={t("siblingsToggleTitle")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border shadow-sm transition-colors flex-shrink-0 ${
            showSiblings
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
          }`}
        >
          {t("siblingsToggle")}
        </button>

        <div className="flex-1" />

        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={exporting || exportingJson || exportingGedcom}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-400 transition-colors disabled:opacity-50"
          >
            {(exporting || exportingJson || exportingGedcom) ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            {(exporting || exportingJson || exportingGedcom) ? t("exporting") : t("export")}
            <svg className="h-3.5 w-3.5 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-44 rounded-lg border border-stone-200 bg-white shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => { setShowExportMenu(false); exportJson(); }}
                disabled={exportingJson}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                <span className="text-base">📋</span>
                {t("exportJson")}
              </button>
              <button
                onClick={() => { setShowExportMenu(false); exportGedcom(); }}
                disabled={exportingGedcom}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                <span className="text-base">🔗</span>
                {t("exportGedcom")}
              </button>
              <button
                onClick={() => { setShowExportMenu(false); exportJpeg(); }}
                disabled={exporting}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                <span className="text-base">🖼️</span>
                {t("exportJpeg")}
              </button>
            </div>
          )}
        </div>

        {/* Open DAM browser */}
        {canUseDam && user && token && (
          <button
            onClick={() => {
              const damUrl = (window as any).__ENV__?.DAM_BROWSER_URL ?? "https://comad.ullav.com";
              const session = encodeURIComponent(JSON.stringify({ token, user, roles }));
              window.open(`${damUrl}/${locale}/auth/sso?t=${session}`, "_blank", "noopener,noreferrer");
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-400 transition-colors flex-shrink-0"
            title={t("openDam")}
          >
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 5.5 2-3.5 3 6z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">{t("openDam")}</span>
          </button>
        )}
      </div>

      {/* Legend row — always below the button toolbar */}
      <Legend t={t} hasNonBirth={hasNonBirth} />

      <div ref={containerRef} className="w-full h-[560px] rounded-xl border border-stone-200 overflow-hidden shadow-inner bg-stone-50">
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
          onNodeMouseLeave={() => setHoveredNodeId(null)}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d6d3d1" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
