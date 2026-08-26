export function initPlexusBackground(canvas) {
  if (!canvas) return () => {};

  const ctx = canvas.getContext("2d", { alpha: false });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const config = {
    nodeCount: window.innerWidth < 768 ? 42 : 68,
    linkDistance: window.innerWidth < 768 ? 165 : 210,
    nodeRadius: 1.2,
    lineOpacity: 0.28,
    nodeOpacity: 0.7,
    drift: 0.055,
    pulse: 0.00024,
    fillOpacity: 0.055,
  };

  let width = 0;
  let height = 0;
  let nodes = [];
  let frame = 0;
  let rafId = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedNodes();
  }

  function seedNodes() {
    nodes = Array.from({ length: config.nodeCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      ox: Math.random() * Math.PI * 2,
      oy: Math.random() * Math.PI * 2,
      r: 1.1 + Math.random() * 1.4,
      phase: (i / config.nodeCount) * Math.PI * 2,
    }));
  }

  function nodePos(node, t) {
    if (reducedMotion) {
      return { x: node.x, y: node.y };
    }
    return {
      x: node.x + Math.sin(t * config.pulse + node.phase) * 14 + Math.cos(node.ox + t * 0.00004) * 6,
      y: node.y + Math.cos(t * config.pulse * 1.1 + node.phase) * 12 + Math.sin(node.oy + t * 0.000032) * 6,
    };
  }

  function draw(t) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const positions = nodes.map((n) => nodePos(n, t));

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist > config.linkDistance) continue;

        const alpha = config.lineOpacity * (1 - dist / config.linkDistance);
        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(positions[i].x, positions[i].y);
        ctx.lineTo(positions[j].x, positions[j].y);
        ctx.stroke();
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 2; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const a = positions[i];
          const b = positions[j];
          const c = positions[k];
          const maxEdge = config.linkDistance * 0.72;
          if (
            Math.hypot(a.x - b.x, a.y - b.y) > maxEdge ||
            Math.hypot(b.x - c.x, b.y - c.y) > maxEdge ||
            Math.hypot(c.x - a.x, c.y - a.y) > maxEdge
          ) {
            continue;
          }
          ctx.fillStyle = `rgba(16, 185, 129, ${config.fillOpacity})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const p = positions[i];
      const glow = config.nodeOpacity + Math.sin(t * 0.0008 + nodes[i].phase) * 0.05;
      ctx.fillStyle = `rgba(5, 150, 105, ${glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, nodes[i].r + 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reducedMotion) {
      for (const node of nodes) {
        node.x += (Math.random() - 0.5) * config.drift;
        node.y += (Math.random() - 0.5) * config.drift;
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
      }
    }
  }

  function loop(t) {
    draw(t);
    frame = requestAnimationFrame(loop);
  }

  resize();
  draw(0);

  if (!reducedMotion) {
    rafId = requestAnimationFrame(loop);
  }

  const onResize = () => {
    config.nodeCount = window.innerWidth < 768 ? 42 : 68;
    config.linkDistance = window.innerWidth < 768 ? 165 : 210;
    resize();
  };

  window.addEventListener("resize", onResize);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
  };
}
