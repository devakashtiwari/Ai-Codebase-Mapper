import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { SnapshotPayload } from '../App';

interface Props {
  snapshot: SnapshotPayload;
  onOpenFile: (path: string) => void;
}

export function ArchitectureGraph({ snapshot, onOpenFile }: Props) {
  const { initialNodes, initialEdges } = useMemo(
    () => buildGraph(snapshot),
    [snapshot]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Re-sync when snapshot changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const path = node.data?.path as string | undefined;
      if (path && (path.includes('/') || path.includes('.'))) {
        onOpenFile(path);
      }
    },
    [onOpenFile]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      attributionPosition="bottom-left"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#30363d" gap={16} />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          if (n.type === 'module') return '#1f6feb';
          if (n.data?.isEntry) return '#3fb950';
          return '#8b949e';
        }}
        maskColor="rgba(0,0,0,0.5)"
      />
    </ReactFlow>
  );
}

function buildGraph(snapshot: SnapshotPayload): {
  initialNodes: Node[];
  initialEdges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const analysis = snapshot.analysis;

  if (!analysis) {
    // Fallback: show top-level folders + entry points
    const folders = new Set<string>();
    snapshot.files.forEach(f => {
      const top = f.path.split('/')[0];
      if (top) folders.add(top);
    });
    let y = 0;
    nodes.push({
      id: 'root',
      position: { x: 200, y: 0 },
      data: { label: snapshot.name },
      style: nodeStyle('#1f6feb')
    });
    [...folders].slice(0, 10).forEach((f, i) => {
      const id = `folder-${f}`;
      nodes.push({
        id,
        position: { x: 80 + (i % 4) * 160, y: 100 + Math.floor(i / 4) * 70 },
        data: { label: f, path: f },
        style: nodeStyle('#6e7681')
      });
      edges.push({
        id: `e-root-${id}`,
        source: 'root',
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed }
      });
    });
    return { initialNodes: nodes, initialEdges: edges };
  }

  // Project root
  nodes.push({
    id: 'project',
    position: { x: 300, y: 0 },
    data: { label: analysis.projectName || snapshot.name },
    style: nodeStyle('#1f6feb', true)
  });

  // Modules
  const modules = analysis.modules || [];
  modules.slice(0, 12).forEach((m, i) => {
    const id = `mod-${m.name}`;
    const col = i % 4;
    const row = Math.floor(i / 4);
    nodes.push({
      id,
      position: { x: 40 + col * 180, y: 100 + row * 80 },
      data: { label: m.name, path: m.path, purpose: m.purpose },
      style: nodeStyle('#8957e5')
    });
    edges.push({
      id: `e-proj-${id}`,
      source: 'project',
      target: id,
      markerEnd: { type: MarkerType.ArrowClosed }
    });
  });

  // Entry points
  const entries = analysis.entryPoints || [];
  entries.slice(0, 8).forEach((ep, i) => {
    const id = `ep-${ep}`;
    nodes.push({
      id,
      position: { x: 60 + (i % 4) * 180, y: 280 + Math.floor(i / 4) * 70 },
      data: { label: shortName(ep), path: ep, isEntry: true },
      style: nodeStyle('#3fb950')
    });
    // connect to matching module if possible
    const mod = modules.find(m => ep.startsWith(m.path + '/') || ep.startsWith(m.path));
    if (mod) {
      edges.push({
        id: `e-mod-ep-${i}`,
        source: `mod-${mod.name}`,
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed }
      });
    } else {
      edges.push({
        id: `e-proj-ep-${i}`,
        source: 'project',
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed }
      });
    }
  });

  // Important files (not already entry points)
  const important = (analysis.importantFiles || []).filter(
    f => !entries.includes(f.path)
  );
  important.slice(0, 8).forEach((f, i) => {
    const id = `imp-${f.path}`;
    nodes.push({
      id,
      position: { x: 60 + (i % 4) * 180, y: 420 + Math.floor(i / 4) * 70 },
      data: { label: shortName(f.path), path: f.path },
      style: nodeStyle('#d29922')
    });
  });

  // Sample internal relationships
  const rels = (analysis.relationships || []).slice(0, 40);
  rels.forEach((r, i) => {
    const srcId = findNodeId(nodes, r.source);
    const tgtId = findNodeId(nodes, r.target);
    if (srcId && tgtId && srcId !== tgtId) {
      edges.push({
        id: `rel-${i}`,
        source: srcId,
        target: tgtId,
        animated: true,
        style: { stroke: '#484f58' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#484f58' }
      });
    }
  });

  return { initialNodes: nodes, initialEdges: edges };
}

function shortName(p: string): string {
  const parts = p.split('/');
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : p;
}

function findNodeId(nodes: Node[], path: string): string | undefined {
  const exact = nodes.find(n => n.data?.path === path);
  if (exact) return exact.id;
  // try module match
  const mod = nodes.find(
    n => n.id.startsWith('mod-') && path.startsWith((n.data?.path as string) || '')
  );
  return mod?.id;
}

function nodeStyle(borderColor: string, bold = false): React.CSSProperties {
  return {
    background: '#21262d',
    border: `1px solid ${borderColor}`,
    borderRadius: 8,
    padding: '8px 12px',
    color: '#c9d1d9',
    fontSize: 12,
    fontWeight: bold ? 600 : 400,
    minWidth: 100,
    textAlign: 'center' as const
  };
}
