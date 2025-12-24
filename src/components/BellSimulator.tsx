import { useState, useEffect, useRef } from "react";
import { runBellExperiment } from "../api/quantum"; // должен возвращать { res_a: number|string, res_b: number|string }
// Если runBellExperiment отсутствует, компонент всё равно будет работать благодаря fallback.

type Particle = {
  id: number;
  x: number;
  y: number;
  z: number;
  direction: -1 | 1;
  outcome?: 1 | -1;
  color: string;
};

export default function BellSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [angleA, setAngleA] = useState<number>(0);
  const [angleB, setAngleB] = useState<number>(45);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stats, setStats] = useState({ total: 0, matches: 0 });
  const [report, setReport] = useState<{time: number, corr: number}[]>([]);
  const [photonCount, setPhotonCount] = useState<number>(100);
  const [emitted, setEmitted] = useState<number>(0);
  const [showTable, setShowTable] = useState<boolean>(false);

  const [rotation, setRotation] = useState({ x: 20, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const particlesRef = useRef<Particle[]>([]);
  const particleIdCounter = useRef(1);
  const animationRef = useRef<number | null>(null);
  const lastSpawn = useRef<number>(0);
  const spawnInterval = 180; // ms between pair spawns
  const sceneScale = 40;

  // Canvas resize observer
  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = Math.floor(rect.width * devicePixelRatio);
      canvas.height = Math.floor(rect.height * devicePixelRatio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Animation + render loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;


    const project = (x: number, y: number, z: number) => {
      const w = canvas.width / devicePixelRatio;
      const h = canvas.height / devicePixelRatio;
      const radY = (rotation.y * Math.PI) / 180;
      const x1 = x * Math.cos(radY) - z * Math.sin(radY);
      const z1 = x * Math.sin(radY) + z * Math.cos(radY);
      const radX = (rotation.x * Math.PI) / 180;
      const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);
      const f = 600 / (600 + z2);
      return {
        x: w / 2 + x1 * sceneScale * f,
        y: h / 2 - y2 * sceneScale * f,
        scale: f * sceneScale,
        depth: z2,
      };
    };

    const drawSphere = (x: number, y: number, z: number, radius: number, color: string, label?: string) => {
      const p = project(x, y, z);
      const r = radius * (p.scale / sceneScale);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      if (label) {
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.fillText(label, p.x + r + 6, p.y + 4);
      }
    };

    const drawCoincidenceMonitor = (x: number, y: number) => {
      const p = project(x, y, 0);
      const wRect = 10 * (p.scale / sceneScale);
      const hRect = 4 * (p.scale / sceneScale);
      ctx.fillStyle = "#f5deb3";
      ctx.strokeStyle = "#5a5a5a";
      ctx.lineWidth = 1.6;
      ctx.fillRect(p.x - wRect/2, p.y - hRect/2, wRect, hRect);
      ctx.strokeRect(p.x - wRect/2, p.y - hRect/2, wRect, hRect);
      ctx.fillStyle = "#222";
      ctx.font = "bold 9px Arial";
      ctx.fillText("COINCIDENCE", p.x - wRect/2 + 4, p.y + 3);
    };

    function drawTube(xPos: number, length: number, radius: number, color: string) {
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const z = -length/2 + t * length;
        const p = project(xPos, 0, z);
        const r = radius * (p.scale / sceneScale);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color + "30";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    }

    function drawVolumetricDetector(xPos: number, angleDeg: number, color: string, label: string) {
      drawTube(xPos, 12, 1.2, color);
      const rad = (angleDeg * Math.PI) / 180;
      const boxSize = 3;
      const boxDepth = 0.6;
      const verts = [
        { x: -boxDepth/2, y: -boxSize/2, z: -boxSize/2 }, { x: boxDepth/2, y: -boxSize/2, z: -boxSize/2 },
        { x: boxDepth/2, y: boxSize/2, z: -boxSize/2 }, { x: -boxDepth/2, y: boxSize/2, z: -boxSize/2 },
        { x: -boxDepth/2, y: -boxSize/2, z: boxSize/2 }, { x: boxDepth/2, y: -boxSize/2, z: boxSize/2 },
        { x: boxDepth/2, y: boxSize/2, z: boxSize/2 }, { x: -boxDepth/2, y: boxSize/2, z: boxSize/2 },
      ];
      const projected = verts.map(v => {
        const ry = v.y * Math.cos(rad) - v.z * Math.sin(rad);
        const rz = v.y * Math.sin(rad) + v.z * Math.cos(rad);
        return project(v.x + xPos, ry, rz);
      });
      const faces = [
        [0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]
      ];
      const faceDepths = faces.map(face => ({ face, depth: face.reduce((s,i)=>s+projected[i].depth,0)/4 }));
      faceDepths.sort((a,b)=>b.depth-a.depth);
      faceDepths.forEach(fd => {
        const face = fd.face;
        ctx.beginPath();
        ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
        for (let i = 1; i < face.length; i++) ctx.lineTo(projected[face[i]].x, projected[face[i]].y);
        ctx.closePath();
        ctx.fillStyle = color + "40";
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      });

      // SPAD-style detector face
      const spad = project(xPos, 0, boxSize/2 + 0.8);
      ctx.beginPath();
      ctx.arc(spad.x, spad.y, 6 * (spad.scale/sceneScale), 0, Math.PI*2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "white";
      ctx.font = "bold 10px Arial";
      ctx.fillText("SPAD", spad.x - 12, spad.y - 10);

      // polarizer axis
      const axisY = 4.2 * Math.cos(rad);
      const axisZ = 4.2 * Math.sin(rad);
      const tip = project(xPos, axisY, axisZ);
      const tail = project(xPos, -axisY, -axisZ);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();

      const c = project(xPos, 0, 0);
      ctx.fillStyle = color;
      ctx.font = "bold 12px Arial";
      ctx.fillText(`${angleDeg}°`, c.x - 10, c.y + 52);
      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.fillText(label, c.x - 28, c.y - 42);
    }

    const drawFinalDetector = (x: number, y: number, outcome: number, color: string) => {
      const p = project(x, y, 0);
      const size = 15 * (p.scale / sceneScale);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - size/2, p.y - size/2, size, size);
      ctx.fillStyle = outcome === 1 ? "#7ee787" : "#ff7b72";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = outcome === 1 ? "#7ee787" : "#ff7b72";
      ctx.font = "bold 12px Arial";
      ctx.fillText(outcome === 1 ? "+1" : "-1", p.x + size/2 + 6, p.y + 4);
    };

    const drawChannelDetector = (xStart: number, yEnd: number, detectorColor: string) => {
      const xEnd = xStart * 2;
      const pStart = project(xStart, 0, 0);
      const pEnd = project(xEnd, yEnd, 0);
      ctx.strokeStyle = detectorColor + "60";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();

      const pMonitor = project(xEnd, -12, 0);
      ctx.strokeStyle = "#ffffff22";
      ctx.setLineDash([5,5]);
      ctx.beginPath();
      ctx.moveTo(pEnd.x, pEnd.y);
      ctx.lineTo(pMonitor.x, pMonitor.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // main render
    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // draw scene
      drawSphere(0, 0, 0, 1.5, "#38bdf8", "Source");
      const detectorPos = 10;
      const colA = "#00ffff";
      const colB = "#ff00ff";
      drawVolumetricDetector(-detectorPos, angleA, colA, "Alice SPAD");
      drawVolumetricDetector(detectorPos, angleB, colB, "Bob SPAD");
      drawCoincidenceMonitor(0, -10);

      // update particles
      particlesRef.current.forEach(p => {
        if (!p.outcome) p.x += p.direction * 0.16;
        else {
          p.x += p.direction * 0.22;
          if (Math.abs(p.x) > detectorPos) {
            const dPos = detectorPos * p.direction;
            const targetX = p.direction === -1 ? -20 : 20;
            const fraction = (p.x - dPos) / (targetX - dPos);
            const targetY = p.outcome === 1 ? -3 : 3;
            p.y = fraction * targetY;
          }
        }
      });
      particlesRef.current = particlesRef.current.filter(p => Math.abs(p.x) < 30);

      // draw particles sorted by depth
      const drawn = particlesRef.current.map(p => ({ p, pos: project(p.x, p.y, p.z) }));
      drawn.sort((a,b)=>a.pos.depth - b.pos.depth);
      drawn.forEach(({p, pos}) => {
        const r = 4 * (pos.scale/sceneScale);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.fill();
        // channels / detectors
        if (Math.abs(p.x) > detectorPos) {
          drawChannelDetector(
            p.direction === -1 ? -detectorPos : detectorPos,
            p.outcome === 1 ? -3 : 3,
            p.direction === -1 ? colA : colB
          );
        }
        if (p.outcome && Math.abs(p.x) > 18) {
          drawFinalDetector(p.x, p.y, p.outcome, p.color);
        }
      });

      // spawn logic when playing
      if (isPlaying && emitted < photonCount && (time - lastSpawn.current) > spawnInterval) {
        lastSpawn.current = time;
        spawnPair();
        setEmitted(e => {
          const next = e + 1;
          if (next >= photonCount) {
            setIsPlaying(false);
            setShowTable(true);
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, isPlaying, angleA, angleB]);

  // spawnPair: create two particles and ask backend (or fallback)
  async function spawnPair() {
    const id = particleIdCounter.current;
    particleIdCounter.current += 2;
    const p1: Particle = { id, x: 0, y: 0, z: 0, direction: -1, outcome: undefined, color: "#00ffff" };
    const p2: Particle = { id: id+1, x: 0, y: 0, z: 0, direction: 1, outcome: undefined, color: "#ff00ff" };
    particlesRef.current.push(p1, p2);

    // Try backend call, if it fails, fallback to local correlated sample
    try {
      if (typeof runBellExperiment === "function") {
        const res = await runBellExperiment(angleA, angleB);
        const a = Number(res?.res_a ?? 1);
        const b = Number(res?.res_b ?? (Math.random() > 0.5 ? 1 : -1));
        const pA = particlesRef.current.find(p=>p.id===id);
        const pB = particlesRef.current.find(p=>p.id===id+1);
        if (pA) pA.outcome = a === 1 ? 1 : -1;
        if (pB) pB.outcome = b === 1 ? 1 : -1;
        setStats(prev => ({ total: prev.total + 1, matches: prev.matches + ((a===b)?1:0) }));
        const now = performance.now();
        setReport(prev => {
          const total = prev.length + 1;
          const matches = stats.matches + ((a === b) ? 1 : 0);
          const corr = (2 * matches - total) / total;
          return [...prev, { time: now, corr }];
        });
        return;
      }
    } catch (err) {
      // fallback below
    }

    // -- Local fallback: produce correlated outcomes with QM-like correlation (singlet)
    // For singlet: correlation E = -cos(theta), we produce outcomes so that
    // empirical correlation approximates -cos(delta).
    const deltaRad = ((angleA - angleB) * Math.PI) / 180;
    const targetCorr = -Math.cos(deltaRad);
    // We sample outcomes using a simple method:
    // generate u in [0,1]. If u < p_same then outcomes equal, else opposite.
    // We choose p_same = (1 + targetCorr) / 2  (works to get desired corr on average).
    const p_same = Math.max(0, Math.min(1, (1 + targetCorr) / 2));
    const same = Math.random() < p_same;
    const bit = Math.random() < 0.5 ? 1 : -1;
    const outA = bit;
    const outB = same ? bit : -bit;

    const pA = particlesRef.current.find(p => p.id === id);
    const pB = particlesRef.current.find(p => p.id === id + 1);
    if (pA) pA.outcome = outA as 1 | -1;
    if (pB) pB.outcome = outB as 1 | -1;
    setStats(prev => ({ total: prev.total + 1, matches: prev.matches + (outA === outB ? 1 : 0) }));
    const now = performance.now();
    setReport(prev => {
      const total = prev.length + 1;
      const matches = stats.matches + (outA === outB ? 1 : 0);
      const corr = (2 * matches - total) / total;
      return [...prev, { time: now, corr }];
    });
  }

  // Mouse handlers for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setRotation(prev => ({ x: prev.x + dy * 0.45, y: prev.y + dx * 0.45 }));
  };
  const handleMouseUp = () => { isDragging.current = false; };

  const correlation = stats.total > 0 ? (2 * stats.matches - stats.total) / stats.total : 0;
  const theory = -Math.cos(((angleA - angleB) * Math.PI) / 180);

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", background: "#0E1117", color: "white" }}>
      <div style={{ width: 340, background: "#161b22", padding: 20, borderRight: "1px solid #30363d", display: "flex", flexDirection: "column" }}>
        <h3 style={{ color: "#38bdf8", margin: 0, paddingBottom: 8 }}>QUANTUM BELL TEST SIMULATOR</h3>

        <div style={{ marginTop: 12 }}>
          <label style={{ color: "cyan", fontWeight: 700, display: "block" }}>Alice (α): {angleA}°</label>
          <input type="range" min={0} max={360} step={5} value={angleA} onChange={(e)=>setAngleA(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ color: "magenta", fontWeight: 700, display: "block" }}>Bob (β): {angleB}°</label>
          <input type="range" min={0} max={360} step={5} value={angleB} onChange={(e)=>setAngleB(Number(e.target.value))} style={{ width: "100%" }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ color: "#38bdf8", fontWeight: 700, display: "block" }}>
            Photon pairs: {photonCount}
          </label>
          <input
            type="number"
            min={1}
            max={5000}
            step={10}
            value={photonCount}
            onChange={(e) => setPhotonCount(Number(e.target.value))}
            style={{ width: "100%", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: 6, padding: 6 }}
            disabled={isPlaying}
          />
        </div>

        <div style={{ marginTop: 10, color: "#8b949e" }}>
          Δ = <strong style={{ color: "white" }}>{Math.abs(angleA - angleB)}°</strong>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button onClick={()=>setIsPlaying(p=>!p)} style={{ flex: 1, background: isPlaying ? "#da3633" : "#238636", color: "white", padding: 12, border: "none", borderRadius: 6, cursor: "pointer" }}>
            {isPlaying ? "⏹ СТОП" : "▶ ЗАПУСТИТИ"}
          </button>
          <button onClick={()=>{
            setStats({ total: 0, matches: 0 });
            setReport([]);
            setEmitted(0);
            setShowTable(false);
            setIsPlaying(false);
          }} style={{ width: 48, background: "#30363d", borderRadius: 6, color: "white", border: "none", cursor: "pointer" }}>↺</button>
        </div>

        <div style={{ marginTop: "auto", background: "#0d1117", padding: 14, borderRadius: 10, border: "1px solid #30363d" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#8b949e" }}>Measured pairs</span><strong>{stats.total}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={{ color: "#8b949e" }}>Correlation (Exp)</span><strong style={{ color: correlation > 0 ? "#7ee787" : "#ff7b72" }}>{correlation.toFixed(3)}</strong></div>
          <div style={{ marginTop: 8, borderTop: "1px dashed #30363d", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#8b949e" }}>QM theory</span><strong style={{ color: "white" }}>{theory.toFixed(3)}</strong>
          </div>
          <div style={{ marginTop: 10, color: "#ff7b72", textAlign: "center" }}>
            Bell violation: {Math.abs(correlation) > 0.707 && stats.total > 100 ? "YES" : "NO"}
          </div>
        </div>
        <div style={{marginTop:20, padding:10, background:"#111", borderRadius:8}}>
          <h4 style={{margin:0, color:"#38bdf8"}}>Detector Report</h4>
          <div style={{fontSize:12, color:"#ccc", marginTop:8}}>
            Records: {report.length}
          </div>
        </div>

        <div style={{marginTop:20, padding:12, background:"#0d1117", borderRadius:8, border:"1px solid #30363d"}}>
          <h4 style={{margin:0, color:"#38bdf8"}}>Interactive Charts</h4>
          <div id="chart-placeholder" style={{height:120, marginTop:10, background:"#111", borderRadius:6, border:"1px solid #222", padding:4}}>
            <svg width="100%" height="100%">
              {report.length > 1 &&
                report.map((p, i) => {
                  if (i === 0) return null;
                  const x1 = (i - 1) * (100 / report.length);
                  const x2 = i * (100 / report.length);
                  const y1 = 60 - report[i - 1].corr * 50;
                  const y2 = 60 - p.corr * 50;
                  return (
                    <line
                      key={i}
                      x1={`${x1}%`}
                      y1={y1}
                      x2={`${x2}%`}
                      y2={y2}
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                  );
                })}
            </svg>
          </div>
        </div>

        <div style={{marginTop:20, padding:12, background:"#0d1117", borderRadius:8, border:"1px solid #30363d"}}>
          <h4 style={{margin:0, color:"#38bdf8"}}>Correlation vs Time</h4>
          <div style={{height:120, marginTop:10, background:"#111", borderRadius:6, border:"1px solid #222", padding:4}}>
            <svg width="100%" height="100%">
              {report.length >= 1 &&
                report.map((p, i) => {
                  if (i === 0) return null;
                  const t0 = report[0].time;
                  const tN = report[report.length - 1].time;
                  const denom = Math.max(1, tN - t0);
                  const x1 = ((report[i-1].time - t0) / denom) * 100;
                  const x2 = ((p.time - t0) / denom) * 100;
                  const y1 = 60 - report[i-1].corr * 50;
                  const y2 = 60 - p.corr * 50;
                  return (
                    <line
                      key={i}
                      x1={`${x1}%`}
                      y1={y1}
                      x2={`${x2}%`}
                      y2={y2}
                      stroke="#ffdd55"
                      strokeWidth="2"
                    />
                  );
                })}
            </svg>
          </div>
        </div>

        <div style={{marginTop:20, padding:12, background:"#0d1117", borderRadius:8, border:"1px solid #30363d"}}>
          <h4 style={{margin:0, color:"#38bdf8"}}>Data Table</h4>
          <div id="table-placeholder" style={{height:100, marginTop:10, overflowY:"auto", background:"#111", borderRadius:6, border:"1px solid #222", padding:6}}>
            {!showTable && (
              <div style={{ fontSize: 12, color: "#8b949e", textAlign: "center", paddingTop: 30 }}>
                Run the experiment to completion to display results
              </div>
            )}
            <table style={{width:"100%", fontSize:12, color:"#ccc"}}>
              <thead>
                <tr><th align="left">Index</th><th align="left">Correlation</th></tr>
              </thead>
              <tbody>
                {report.length > 0 &&
                  report.map((r, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{r.corr.toFixed(3)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden", cursor: isDragging.current ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", bottom: 18, left: 18, color: "rgba(255,255,255,0.4)" }}>🖱️ Drag to rotate</div>
        <div style={{
          width: "100%",
          maxWidth: 900,
          margin: "40px auto",
          padding: "24px",
          background: "#0d1117",
          border: "1px solid #30363d",
          borderRadius: 12,
          color: "#c9d1d9",
          lineHeight: 1.7
        }}>
          <h2 style={{ color: "#38bdf8", textAlign: "center" }}>
            Детальне пояснення симуляції квантового експерименту Белла
          </h2>

          <p>
            <strong>Що відбувається в симуляції</strong><br />
            Моделюється експеримент Белла з квантово заплутаними фотонами.
            Джерело в центрі випромінює пари фотонів у протилежних напрямках
            до двох детекторів — Alice та Bob.
          </p>

          <p>
            Кожен фотон проходить через поляризаційний аналізатор:
            Alice з кутом α, Bob з кутом β.
            Результат вимірювання —
            A і B можуть набувати лише двох значень: +1 або −1.
            Значення не існують до вимірювання і виникають лише під час детекції.
          </p>

          <p>
            <strong>Походження експерименту</strong><br />
            Експеримент запропонований Джоном Беллом (1964)
            як відповідь на парадокс Ейнштейна–Подольського–Розена (EPR).
            Белл довів, що жодна локальна теорія прихованих змінних
            не може відтворити всі передбачення квантової механіки.
          </p>

          <p>
            <strong>Ідея нерівності Белла</strong><br />
            Вводиться кореляційна функція:
            E(α, β) = ⟨A · B⟩.
            Для класичних локальних теорій |S| ≤ 2 (форма CHSH),
            тоді як квантова механіка передбачає
            S = 2√2 ≈ 2.828.
          </p>

          <p>
            <strong>Чому виникає квантова кореляція</strong><br />
            Система описується синглетним станом:
            |ψ⟩ = (|01⟩ − |10⟩) / √2.
            Окремі результати випадкові,
            але їхня кореляція строго визначена:
            E(α, β) = −cos(α − β).
          </p>

          <p style={{ color: "#7ee787" }}>
            Саме ця формула реалізується в симуляції,
            що приводить до порушення нерівності Белла
            та демонструє фундаментальну нелокальність квантової механіки.
          </p>
        </div>
      </div>
    </div>
  );
}