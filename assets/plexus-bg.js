export function initPlexusBackground(canvas) {
  if (!canvas) return () => {};

  const ctx = canvas.getContext("2d", { alpha: false });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let nodes = [];
  let links = [];
  let faces = [];
  let rafId = 0;
  let frame = 0;

  function densityFor(w) {
    if (w < 768) return { cols: 16, rows: 12, linkDist: 155 };
    return { cols: 28, rows: 16, linkDist: 195 };
  }

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
    rebuildTopology();
  }

  function seedNodes() {
    const { cols, rows } = densityFor(width);
    nodes = [];
    const cellW = width / (cols - 1);
    const cellH = height / (rows - 1);
    let i = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        nodes.push({
          x: col * cellW + (Math.random() - 0.5) * cellW * 0.5,
          y: row * cellH + (Math.random() - 0.5) * cellH * 0.5,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: 1.1 + Math.random() * 1.6,
          phase: (i++ / (cols * rows)) * Math.PI * 2,
        });
      }
    }
    const extras = Math.floor(nodes.length * 0.45);
    for (let e = 0; e < extras; e++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.9 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function rebuildTopology() {
    const { linkDist } = densityFor(width);
    links = [];
    faces = [];
    const n = nodes.length;

    for (let i = 0; i < n; i++) {
      const near = [];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist <= linkDist) near.push({ j, dist });
      }
      near.sort((a, b) => a.dist - b.dist);
      const top = near.slice(0, 7);
      for (const nb of top) {
        if (i < nb.j) links.push([i, nb.j, nb.dist]);
      }
      for (let a = 0; a < Math.min(top.length, 5); a++) {
        for (let b = a + 1; b < Math.min(top.length, 5); b++) {
          const j = top[a].j;
          const k = top[b].j;
          const jk = Math.hypot(nodes[j].x - nodes[k].x, nodes[j].y - nodes[k].y);
          if (jk > linkDist * 0.9) continue;
          if (i < j && i < k) faces.push([i, j, k]);
        }
      }
    }
  }

  function draw(t) {
    const { linkDist } = densityFor(width);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // faces first
    for (const [i, j, k] of faces) {
      ctx.fillStyle = "rgba(16, 185, 129, 0.085)";
      ctx.beginPath();
      ctx.moveTo(nodes[i].x, nodes[i].y);
      ctx.lineTo(nodes[j].x, nodes[j].y);
      ctx.lineTo(nodes[k].x, nodes[k].y);
      ctx.closePath();
      ctx.fill();
    }

    // links
    for (const [i, j] of links) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist > linkDist) continue;
      const alpha = 0.42 * (1 - dist / linkDist);
      ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nodes[i].x, nodes[i].y);
      ctx.lineTo(nodes[j].x, nodes[j].y);
      ctx.stroke();
    }

    // nodes
    for (const node of nodes) {
      const glow = 0.88 + Math.sin(t * 0.0025 + node.phase) * 0.1;
      ctx.fillStyle = `rgba(167, 243, 208, ${glow})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function step(t) {
    if (!reducedMotion) {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        // soft wrap
        if (node.x < -40) node.x = width + 40;
        if (node.x > width + 40) node.x = -40;
        if (node.y < -40) node.y = height + 40;
        if (node.y > height + 40) node.y = -40;
        // tiny wander
        node.vx += (Math.random() - 0.5) * 0.01;
        node.vy += (Math.random() - 0.5) * 0.01;
        node.vx *= 0.995;
        node.vy *= 0.995;
      }
      frame += 1;
      if (frame % 45 === 0) rebuildTopology();
    }
    draw(t);
    rafId = requestAnimationFrame(step);
  }

  resize();
  draw(0);
  if (!reducedMotion) rafId = requestAnimationFrame(step);
  else {
    // still draw once more after a tick for static density
    requestAnimationFrame((t) => draw(t));
  }

  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
  };
}
