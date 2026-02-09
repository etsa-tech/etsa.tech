"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getTagUrl } from "@/lib/utils";

interface TagNode {
  tag: string;
  count: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface TagEdge {
  source: string;
  target: string;
  weight: number;
}

interface TagCloudProps {
  nodes: Array<{ tag: string; count: number }>;
  edges: Array<{ source: string; target: string; weight: number }>;
}

export default function TagCloud({ nodes, edges }: TagCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  const nodesRef = useRef<TagNode[]>([]);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = Math.max(600, Math.min(800, width * 0.75));
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Initialize nodes with physics
  useEffect(() => {
    const { width, height } = dimensions;
    const maxCount = Math.max(...nodes.map((n) => n.count));

    nodesRef.current = nodes.map((node) => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * width * 0.5,
      y: height / 2 + (Math.random() - 0.5) * height * 0.5,
      vx: 0,
      vy: 0,
    }));
  }, [nodes, dimensions]);

  // Physics simulation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensions;
    const maxCount = Math.max(...nodes.map((n) => n.count));

    // Build edge lookup for faster access
    const edgeMap = new Map<string, Map<string, number>>();
    edges.forEach(({ source, target, weight }) => {
      if (!edgeMap.has(source)) edgeMap.set(source, new Map());
      if (!edgeMap.has(target)) edgeMap.set(target, new Map());
      edgeMap.get(source)!.set(target, weight);
      edgeMap.get(target)!.set(source, weight);
    });

    const simulate = () => {
      const nodesList = nodesRef.current;

      // Apply forces
      nodesList.forEach((node, i) => {
        // Center gravity
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - node.x!;
        const dy = centerY - node.y!;
        node.vx! += dx * 0.0001;
        node.vy! += dy * 0.0001;

        // Repulsion from other nodes
        nodesList.forEach((other, j) => {
          if (i === j) return;
          const dx = other.x! - node.x!;
          const dy = other.y! - node.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = -50 / (dist * dist);
          node.vx! += (dx / dist) * force;
          node.vy! += (dy / dist) * force;
        });

        // Attraction along edges
        const connections = edgeMap.get(node.tag);
        if (connections) {
          connections.forEach((weight, targetTag) => {
            const target = nodesList.find((n) => n.tag === targetTag);
            if (target) {
              const dx = target.x! - node.x!;
              const dy = target.y! - node.y!;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = (dist - 100) * 0.01 * (weight / 10);
              node.vx! += (dx / dist) * force;
              node.vy! += (dy / dist) * force;
            }
          });
        }
      });

      // Update positions with damping
      nodesList.forEach((node) => {
        node.vx! *= 0.9;
        node.vy! *= 0.9;
        node.x! += node.vx!;
        node.y! += node.vy!;

        // Boundary constraints
        const radius = 5 + (node.count / maxCount) * 20;
        node.x! = Math.max(radius, Math.min(width - radius, node.x!));
        node.y! = Math.max(radius, Math.min(height - radius, node.y!));
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = "rgba(100, 116, 139, 0.2)";
      ctx.lineWidth = 1;

      edges.forEach(({ source, target, weight }) => {
        const sourceNode = nodesList.find((n) => n.tag === source);
        const targetNode = nodesList.find((n) => n.tag === target);
        if (sourceNode && targetNode) {
          // Highlight edges connected to hovered/selected tag
          if (
            hoveredTag === source ||
            hoveredTag === target ||
            selectedTag === source ||
            selectedTag === target
          ) {
            ctx.strokeStyle = `rgba(59, 130, 246, ${Math.min(weight / 5, 0.6)})`;
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = `rgba(100, 116, 139, ${Math.min(weight / 10, 0.2)})`;
            ctx.lineWidth = 1;
          }

          ctx.beginPath();
          ctx.moveTo(sourceNode.x!, sourceNode.y!);
          ctx.lineTo(targetNode.x!, targetNode.y!);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodesList.forEach((node) => {
        const radius = 5 + (node.count / maxCount) * 20;
        const isHighlighted =
          hoveredTag === node.tag || selectedTag === node.tag;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius, 0, Math.PI * 2);

        if (isHighlighted) {
          ctx.fillStyle = "#3b82f6";
        } else {
          ctx.fillStyle = "#64748b";
        }
        ctx.fill();

        // Node border
        ctx.strokeStyle = isHighlighted ? "#1e40af" : "#475569";
        ctx.lineWidth = isHighlighted ? 3 : 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = isHighlighted ? "#1e293b" : "#475569";
        ctx.font = `${isHighlighted ? "bold " : ""}${Math.max(10, radius)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.tag, node.x!, node.y! - radius - 10);

        // Count badge
        if (isHighlighted || node.count > 1) {
          ctx.fillStyle = isHighlighted ? "#3b82f6" : "#94a3b8";
          ctx.font = `${Math.max(8, radius * 0.6)}px sans-serif`;
          ctx.fillText(`(${node.count})`, node.x!, node.y! + radius + 12);
        }
      });

      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, edges, dimensions, hoveredTag, selectedTag]);

  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const maxCount = Math.max(...nodes.map((n) => n.count));
    let found = false;

    for (const node of nodesRef.current) {
      const radius = 5 + (node.count / maxCount) * 20;
      const dx = x - node.x!;
      const dy = y - node.y!;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        setHoveredTag(node.tag);
        canvas.style.cursor = "pointer";
        found = true;
        break;
      }
    }

    if (!found) {
      setHoveredTag(null);
      canvas.style.cursor = "default";
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredTag) {
      window.location.href = getTagUrl(hoveredTag);
    }
  };

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
      />
      {hoveredTag && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click on <span className="font-semibold text-etsa-primary">{hoveredTag}</span> to view related presentations
          </p>
        </div>
      )}
    </div>
  );
}

