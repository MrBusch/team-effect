import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';

// ─── Dagre layout ─────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 80;

function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 });

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

// ─── Custom node ──────────────────────────────────────────────────────────────

function MemberNode({ data }) {
  const cls = [
    'rf-node',
    data.isRoot ? 'rf-node-root' : '',
    data.isHire ? 'rf-node-hire' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ width: NODE_W }}>
      <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
      <div className="rf-node-name" title={data.label}>{data.label}</div>
      <div className="rf-node-position" title={data.position}>{data.position}</div>
      {data.level && <span className="rf-node-level">{data.level}</span>}
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
    </div>
  );
}

const nodeTypes = { member: MemberNode };

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrgChart() {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/hires').then(r => r.json()),
    ]).then(([members, hires]) => {
      // Determine root nodes (no manager)
      const memberIds = new Set(members.map(m => m.id));
      const rootIds = new Set(members.filter(m => !m.reporting_to).map(m => m.id));

      const rawNodes = [];
      const rawEdges = [];

      // Member nodes
      members.forEach(m => {
        rawNodes.push({
          id: `m-${m.id}`,
          type: 'member',
          data: {
            label: m.name,
            position: m.position,
            level: m.level,
            isRoot: rootIds.has(m.id),
            isHire: false,
          },
          position: { x: 0, y: 0 },
        });
        if (m.reporting_to && memberIds.has(m.reporting_to)) {
          rawEdges.push({
            id: `e-m-${m.id}`,
            source: `m-${m.reporting_to}`,
            target: `m-${m.id}`,
            type: 'smoothstep',
          });
        }
      });

      // Planned hire nodes
      hires.forEach(h => {
        rawNodes.push({
          id: `h-${h.id}`,
          type: 'member',
          data: {
            label: h.name,
            position: h.position,
            level: h.level,
            isRoot: false,
            isHire: true,
          },
          position: { x: 0, y: 0 },
        });
        if (h.reporting_to && memberIds.has(h.reporting_to)) {
          rawEdges.push({
            id: `e-h-${h.id}`,
            source: `m-${h.reporting_to}`,
            target: `h-${h.id}`,
            type: 'smoothstep',
          });
        }
      });

      const laidOut = layoutGraph(rawNodes, rawEdges);
      setRfNodes(laidOut);
      setRfEdges(rawEdges.map(e => ({
        ...e,
        style: { stroke: 'var(--border-2)', strokeWidth: 1.5 },
        markerEnd: undefined,
      })));
      setLoading(false);
    }).catch(() => {
      setError('Failed to load org chart data.');
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading" style={{ paddingTop: 80 }}>Building org chart…</div>;
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;

  return (
    <div className="org-page">
      <div className="org-header">
        <div>
          <h1 className="page-title">Org Chart</h1>
          <p className="page-subtitle">Reporting structure — current team and planned hires</p>
        </div>
        <div className="org-legend">
          <div className="org-legend-item">
            <div className="org-legend-swatch org-legend-member" />
            <span>Team member</span>
          </div>
          <div className="org-legend-item">
            <div className="org-legend-swatch org-legend-hire" />
            <span>Planned hire</span>
          </div>
        </div>
      </div>
      <div className="org-canvas">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={true}
          panOnScroll={false}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background color="var(--border)" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
