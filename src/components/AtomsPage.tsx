import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
// Імпортуємо дані
import { PERIODIC } from "./PeriodicTableData";
// Імпортуємо розрахунки
import { generateElectronConfig, calculateTransition, A0, estimateZeff } from "../utils/atomicCalculations";


const MAX_N_DISPLAY = 6;


// =========================================================================
// ОСНОВНИЙ КОМПОНЕНТ СТОРІНКИ
// =========================================================================

export default function AtomsPage() {
    // Встановлення початкових значень
    const [selectedZ, setSelectedZ] = useState(1);
    const [nInitial, setNInitial] = useState(2); // Плавне/поточне n
    const [nFinal, setNFinal] = useState(1);
    const [bohrRotation, setBohrRotation] = useState({ x: 0, y: 0 });
    const [selectedOrbital, setSelectedOrbital] = useState("auto");
    const [superposition, setSuperposition] = useState(false);
    const [selectedElementInfo, setSelectedElementInfo] = useState<any|null>(null);

    const Z_data = PERIODIC[selectedZ];
    const { configString, shells } = generateElectronConfig(selectedZ);
    const transitionData = calculateTransition(selectedZ, Math.round(nInitial), Math.round(nFinal));
    const Z_eff_calc = estimateZeff(selectedZ, Math.max(Math.round(nInitial), Math.round(nFinal)));

    // ВИПРАВЛЕНО: useRefr залишається з <HTMLCanvasElement>, але ми перевіряємо його на null
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const modernCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null); 
    const angleRef = useRef(0);
    const isDraggingRef = useRef(false);
    const lastPosRef = useRef({x:0,y:0});
    // ---- інерція та масштабування для Bohr 3D view ----
    const rotationVelocityRef = useRef({ vx: 0, vy: 0 });
    const scaleRef = useRef(1.0);

    
    // Запуск/зупинка анімації
    // const handleAnimate = (n_i: number, n_f: number) => {
    //     if (n_i === n_f) return;
    //     
    //     if (animationRef.current) cancelAnimationFrame(animationRef.current);
    //     
    //     setAnimRunning(true);
    //     setNInitial(n_i);
    //     setNFinal(n_f);
    //     timeStartRef.current = 0;
    //     
    //     animationRef.current = requestAnimationFrame((t) => animateTransition(n_i, n_f, t));
    // };

    // ВИПРАВЛЕНО 2304 & 2554: Використовуємо прямий рендерер Canvas, визначений нижче
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const renderLoop = () => {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                angleRef.current += 0.04;
                renderBohrAnimation(ctx, canvas.width, canvas.height, { 
                    Z: selectedZ,
                    electronAngle: angleRef.current,
                    shells,
                    bohrRotation
                });
            }
            animationRef.current = requestAnimationFrame(renderLoop);
        };
        animationRef.current = requestAnimationFrame(renderLoop);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [selectedZ, nInitial, shells]);

    useEffect(() => {
      let rafId: number | null = null;
      let lastT = performance.now();

      function tick(t: number) {
        const dt = (t - lastT) * 0.001;
        lastT = t;

        setBohrRotation(r => {
          const nx = r.x + rotationVelocityRef.current.vx * dt;
          const ny = r.y + rotationVelocityRef.current.vy * dt;
          return { x: nx, y: ny };
        });

        rotationVelocityRef.current.vx *= Math.max(0, 1 - 3 * dt);
        rotationVelocityRef.current.vy *= Math.max(0, 1 - 3 * dt);

        rafId = requestAnimationFrame(tick);
      }

      rafId = requestAnimationFrame(tick);
      return () => { if (rafId) cancelAnimationFrame(rafId); };
    }, []);

    useEffect(() => {
        const canvas = modernCanvasRef.current;
        if (!canvas) return;

        // Try to get a WebGL context; if not available we'll draw a 2D fallback
        const gl = (canvas!.getContext('webgl', { antialias: true }) ||
                    canvas!.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (!gl) {
            console.warn('WebGL not available, falling back to 2D rendering.');
            // Fallback: 2D animated cloud
            const ctx2 = canvas.getContext('2d') as CanvasRenderingContext2D | null;
            if (!ctx2) return;
            const safeCanvas = canvas!;
            let rafId: number | null = null;
            let running = true;
            function draw() {
                if (!running) return;
                // simple 2D fallback cloud (keeps the old visual behavior)
                ctx2!.fillStyle = '#0b0f1a';
                ctx2!.fillRect(0, 0, safeCanvas.width, safeCanvas.height);

                const cx = safeCanvas.width / 2;
                const cy = safeCanvas.height / 2;
                const nucleusR = Math.max(6, Math.log(Math.max(2, selectedZ)) * 2);
                ctx2!.fillStyle = '#ffaa00';
                ctx2!.beginPath();
                ctx2!.arc(cx, cy, nucleusR, 0, Math.PI * 2);
                ctx2!.fill();

                const pointCount = 1200;
                for (let i = 0; i < pointCount; i++) {
                    const r = Math.random() * 4;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const x = Math.sin(phi) * Math.cos(theta);
                    const y = Math.sin(phi) * Math.sin(theta);

                    // simple radial envelope
                    const intensity = Math.exp(-r * 0.6) * Math.random();
                    const Rpx = 30 * r;
                    const px = cx + Rpx * x;
                    const py = cy + Rpx * y;

                    ctx2!.fillStyle = `rgba(0,150,255,${Math.min(0.9, intensity)})`;
                    ctx2!.fillRect(px, py, 2, 2);
                }

                rafId = requestAnimationFrame(draw);
            }
            rafId = requestAnimationFrame(draw);

            return () => {
                running = false;
                if (rafId) cancelAnimationFrame(rafId);
            };
        }
        // If WebGL is available, let renderModernOrbitalCloud handle the loop and return a stop function
        // initialize once and get a stop function
        const stop = renderModernOrbitalCloud(
            canvas,
            selectedZ,
            Math.round(nInitial),
            selectedOrbital,
            superposition
        );
        // On unmount, stop animation
        return () => {
            if (typeof stop === 'function') stop();
        };
    }, [selectedZ, nInitial, selectedOrbital, superposition]);

    // Helper для таблиці: визначає місце для Lanthanides/Actinides
    const getGridPosition = (Z: number, group: number, period: number): { row: number, col: number } => {
        if (period <= 7) return { row: period, col: group };
        if (period === 9) return { row: 8, col: 3 + (Z - 57) }; // Lanthanides
        if (period === 10) return { row: 9, col: 3 + (Z - 89) }; // Actinides
        return { row: period, col: group };
    };

    return (
        <div className="p-10 max-w-7xl mx-auto min-h-screen bg-[#0a0f24] text-white">
            <Link to="/physics/atomic" className="text-cyan-400 mb-5 inline-block">← Назад до Атомної фізики</Link>
            <h1 className="text-4xl font-bold text-center mb-10 text-cyan-400">AtomLab — Інтерактивна структура атома</h1>

            <div className="flex flex-col gap-10">
                
                {/* ЛІВА КОЛОНКА: ТАБЛИЦЯ */}
                <div className="lg:col-span-1">
                    <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">1. Періодична таблиця</h2>
                    <div className="flex flex-col items-center gap-4">

                      {/* Block legend removed */}

                      {/* MAIN GRID */}
                      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(18, 32px)', fontSize: '10px' }}>
                        {Object.entries(PERIODIC).map(([Z_str, elem]: [string, any]) => {
                          const Z = Number(Z_str);
                          const { row, col } = getGridPosition(Z, elem.group, elem.period);

                          const color =
                            elem.block === 's' ? '#fda4af' :
                            elem.block === 'p' ? '#86efac' :
                            elem.block === 'd' ? '#fde047' :
                            elem.block === 'f' ? '#93c5fd' : '#334155';

                          return (
                            <div
                              key={Z}
                              style={{
                                gridRow: row,
                                gridColumn: col,
                                width:'32px',
                                height:'32px',
                                backgroundColor: color,
                                border: '1px solid #555',
                                borderRadius:'4px',
                                cursor:'pointer',
                                padding:'2px',
                                textAlign:'center',
                                fontWeight:'700'
                              }}
                              onClick={() => {
                                setSelectedZ(Z);
                                setSelectedElementInfo(elem);
                              }}
                            >
                              <div style={{fontSize:'8px'}}>{Z}</div>
                              <div style={{fontSize:'12px'}}>{elem.symbol}</div>
                              <div style={{display:'grid',gridTemplateColumns:'repeat(4,6px)',gap:'1px',marginTop:'2px'}}>
                                {Array.from({length: elem.orbitals?.length || 0}).map((_,i)=>(
                                   <div key={i} style={{
                                      width:'6px',
                                      height:'6px',
                                      backgroundColor:'#1e293b',
                                      border:'1px solid #475569'
                                   }}></div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Lanthanides / Actinides */}
                      <div className="grid gap-1 mt-4" style={{ gridTemplateColumns: 'repeat(15, 32px)', fontSize: '10px' }}>
                        {[...Array(15)].map((_,i)=>(
                          <div key={i} className="w-[32px] h-[32px] bg-blue-300 border border-gray-600 rounded"></div>
                        ))}
                      </div>
                      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, 32px)', fontSize: '10px' }}>
                        {[...Array(15)].map((_,i)=>(
                          <div key={i} className="w-[32px] h-[32px] bg-blue-300 border border-gray-600 rounded"></div>
                        ))}
                      </div>

                    </div>
                    
                    {/* Підписи рядів Lanthanides/Actinides */}
                    <div className="text-gray-400 text-xs mt-4">
                        * Ряди 57-71 (Лантаноїди) та 89-103 (Актиноїди) розміщені знизу.
                    </div>

                </div>
            </div>

            {/* ПРАВА КОЛОНКА ВІЗУАЛІЗАЦІЇ — ТЕПЕР ПІД ТАБЛИЦЕЮ */}
            <div className="w-full">
                <h2 className="text-2xl font-bold mb-4 text-center">{Z_data.symbol} (Z={selectedZ}) — {Z_data.name}</h2>
                <p className="text-gray-400 text-center mb-6">Конфігурація: <code className="bg-gray-800 p-1 rounded">{configString}</code></p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LEFT: Bohr Animation */}
                    <div
                      className="bg-gray-900 p-4 rounded-lg shadow-inner"
                      onMouseDown={(e)=>{ 
                        isDraggingRef.current = true; 
                        lastPosRef.current = { x: e.clientX, y: e.clientY }; 
                      }}
                      onMouseUp={(_e)=>{ 
                        isDraggingRef.current = false; 
                      }}
                      onMouseMove={(e)=>{ 
                        if (!isDraggingRef.current) return;
                        const dx = e.clientX - lastPosRef.current.x;
                        const dy = e.clientY - lastPosRef.current.y;
                        setBohrRotation(r => ({ x: r.x + dy * 0.01, y: r.y + dx * 0.01 }));
                        rotationVelocityRef.current.vx = dy * 0.02;
                        rotationVelocityRef.current.vy = dx * 0.02;
                        lastPosRef.current = { x: e.clientX, y: e.clientY };
                      }}
                      onWheel={(_e)=> {
                        _e.preventDefault();
                        const delta = -_e.deltaY * 0.001;
                        const newScale = Math.max(0.3, Math.min(3.0, scaleRef.current + delta));
                        scaleRef.current = newScale;
                      }}
                    >
                        <h3 className="text-lg font-semibold mb-2 text-center text-cyan-400">Анімація орбіт Бора</h3>
                        
                        <canvas 
                            ref={canvasRef}
                            className="w-full h-auto bg-[#0b0f1a] rounded-lg border border-gray-700"
                            width={400}
                            height={400}
                        />
                    </div>
                    {/* RIGHT: Quantum Model + Energy Info */}
                    <div>
                      <div className="bg-gray-900 p-4 rounded-lg shadow-inner mb-4">
                        <h3 className="text-lg font-semibold mb-2 text-center text-green-400">Сучасна квантова модель</h3>
                        <div className="flex gap-2 justify-center mb-2 text-xs">
                          <select value={selectedOrbital} onChange={e=>setSelectedOrbital(e.target.value)} className="bg-gray-800 p-1 rounded">
                            <option value="auto">auto</option>
                            <option value="1s">1s</option>
                            <option value="2p">2p</option>
                            <option value="3d">3d</option>
                            <option value="4f">4f</option>
                          </select>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" checked={superposition} onChange={e=>setSuperposition(e.target.checked)} />
                            superposition
                          </label>
                        </div>
                        <canvas
                            ref={modernCanvasRef}
                            className="bg-[#0b0f1a] rounded-lg border border-gray-700"
                            style={{ width: "400px", height: "400px" }}
                            width={400}
                            height={400}
                        />
                      </div>
                      <div className="bg-gray-900 p-4 rounded-lg shadow-inner">
                        <h3 className="text-lg font-semibold mb-4 text-yellow-400 text-center">Розрахунок енергій (ΔE)</h3>
                        <table className="w-full text-[12px] bg-gray-800 rounded overflow-hidden border border-gray-700">
                            <tbody>
                                <tr className="border-b border-gray-700">
                                    <td className="p-2 font-semibold text-gray-300">Z_eff</td>
                                    <td className="p-2 text-right text-cyan-300">{Z_eff_calc.toFixed(3)}</td>
                                </tr>
                                <tr className="border-b border-gray-700">
                                    <td className="p-2 font-semibold text-gray-300">E_initial (n={nInitial.toFixed(0)})</td>
                                    <td className="p-2 text-right">{transitionData.E_initial.toFixed(4)} eV</td>
                                </tr>
                                <tr className="border-b border-gray-700">
                                    <td className="p-2 font-semibold text-gray-300">E_final (n={nFinal.toFixed(0)})</td>
                                    <td className="p-2 text-right">{transitionData.E_final.toFixed(4)} eV</td>
                                </tr>
                                <tr className="border-b border-gray-700">
                                    <td className="p-2 font-semibold text-gray-300">ΔE</td>
                                    <td className="p-2 text-right text-green-400 font-bold">
                                        {transitionData.E_photon.toFixed(4)} eV
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-semibold text-gray-300">λ</td>
                                    <td className="p-2 text-right text-gray-300">
                                        {transitionData.wavelength_nm != null
                                            ? `${transitionData.wavelength_nm.toFixed(1)} nm`
                                            : 'Немає емісії'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-center mt-3 text-cyan-300 text-xs">Photon emitted</p>
                        <div className="mt-4">
                            <label className="block text-sm mb-2 text-gray-300">Налаштування орбіт (n)</label>
                            <input 
                                type="number" min={1} max={MAX_N_DISPLAY} value={Math.round(nInitial)} 
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val >= 1 && val <= MAX_N_DISPLAY) setNInitial(val);
                                }}
                                className="w-full bg-gray-800 p-2 rounded mb-2"
                            />
                            <input 
                                type="number" min={1} max={MAX_N_DISPLAY} value={Math.round(nFinal)} 
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val >= 1 && val <= MAX_N_DISPLAY) setNFinal(val);
                                }}
                                className="w-full bg-gray-800 p-2 rounded"
                            />
                        </div>
                      </div>
                    </div>
                </div>
            </div>
            
            {/* Детальна інформація */}
            <div className="mt-10 bg-gray-900 p-6 rounded-lg text-sm text-gray-300">
                <h3 className="text-xl font-semibold mb-3">Оболонки та властивості</h3>
                <p><strong>Оболонки (n):</strong> { shells.map((s: any) => `n=${s.n}: ${s.electrons}e`).join(' | ') }</p>
                <p>Радіус орбіти n=1 (a₀) ≈ {A0.toExponential(2)} м</p>
                <p className="mt-3 text-red-400">Модель спрощена: Z_eff розраховується приблизно. Реальні атоми мають складніші ефекти екранування.</p>
            </div>
            {/* POPUP: Element info */}
            {selectedElementInfo && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-900 p-6 rounded-lg w-[420px] max-h-[90vh] overflow-y-auto border border-gray-700">
                  <h2 className="text-2xl font-bold mb-3 text-cyan-300">
                    {selectedElementInfo.name} ({selectedElementInfo.symbol})
                  </h2>
                  <p className="text-gray-300 mb-2"><strong>Серія:</strong> {selectedElementInfo.series ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Стан при 20°C:</strong> {selectedElementInfo.state ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Атомна маса:</strong> {selectedElementInfo.atomic_mass ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Енергетичні рівні:</strong> {selectedElementInfo.energy_levels?.join(', ') ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Електронегативність:</strong> {selectedElementInfo.electronegativity ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Температура плавлення:</strong> {selectedElementInfo.melting_point ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Температура кипіння:</strong> {selectedElementInfo.boiling_point ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Електронна спорідненість:</strong> {selectedElementInfo.electron_affinity ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Енергія іонізації:</strong> {selectedElementInfo.ionization_energy ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Радіус:</strong> {selectedElementInfo.radius ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Твердість:</strong> {selectedElementInfo.hardness ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Модуль:</strong> {selectedElementInfo.modulus ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Густина:</strong> {selectedElementInfo.density ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Провідність:</strong> {selectedElementInfo.conductivity ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Теплоємність:</strong> {selectedElementInfo.heat ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Поширеність:</strong> {selectedElementInfo.abundance ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Відкрито:</strong> {selectedElementInfo.discovery ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Ступені окиснення:</strong> {selectedElementInfo.oxidation_states?.join(', ') ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Конфігурація:</strong> {selectedElementInfo.configuration ?? "Немає даних"}</p>
                  <p className="text-gray-300 mb-2"><strong>Розгорнута конфігурація:</strong> {selectedElementInfo.expanded_config ?? "Немає даних"}</p>

                  <button
                    className="mt-4 bg-red-600 px-4 py-2 rounded"
                    onClick={() => setSelectedElementInfo(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            
        </div>
    );
}

// =========================================================================
// ФУНКЦІЯ РЕНДЕРИНГУ CANVAS (Виконує малювання на кожному кадрі)
// =========================================================================


const renderBohrAnimation = (ctx: CanvasRenderingContext2D, W: number, H: number, {
    Z, electronAngle, shells, bohrRotation
}: any) => {
    const w = W;
    const h = H;
    const center = { x: w / 2, y: h / 2 };
    // 3D rotation projection utility using bohrRotation state
    function rot3D(x:number,y:number,z:number){
      let cx=Math.cos(bohrRotation.x), sx=Math.sin(bohrRotation.x);
      let cy=Math.cos(bohrRotation.y), sy=Math.sin(bohrRotation.y);
      let y1 = y*cx - z*sx;
      let z1 = y*sx + z*cx;
      let x1 = x*cy + z1*sy;
      let z2 = -x*sy + z1*cy;
      return {x:x1,y:y1,z:z2};
    }
    const maxRadiusPx = 150; 

    // 1. Очищення
    ctx.fillStyle = '#0b0f1a';
    ctx.fillRect(0, 0, w, h);

    // 2. 3D Nucleus with protons and neutrons
    const protons = Z;
    const neutrons = Math.round(Z * 1.1);
    const totalNucs = protons + neutrons;
    const nucPositions = [];

    for (let i = 0; i < totalNucs; i++) {
        const theta = (i * 0.4) % (Math.PI * 2);
        const phi = Math.acos(1 - (i % 8) * 0.25);
        const r = 12;
        nucPositions.push({
            type: i < protons ? "p" : "n",
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
        });
    }

    for (const np of nucPositions) {
        const p3 = rot3D(np.x * 0.7, np.y * 0.7, np.z * 0.7);
        ctx.fillStyle = np.type === "p" ? "rgba(255,80,80,0.9)" : "rgba(80,80,255,0.9)";
        ctx.beginPath();
        ctx.arc(center.x + p3.x, center.y + p3.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // 3. Орбіти (Кільця)
    const nMax = shells[shells.length - 1]?.n || 1;
    const baseRadius = maxRadiusPx / (nMax + 1);

    for (let n = 1; n <= nMax; n++) {
        const r_px = baseRadius * n;
        ctx.strokeStyle = 'rgba(120,170,255,0.20)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const steps = 180;
        for (let k = 0; k <= steps; k++) {
            const ang = (k / steps) * Math.PI * 2;
            const p = rot3D(r_px * Math.cos(ang), r_px * Math.sin(ang), 0);
            const px = center.x + p.x;
            const py = center.y + p.y;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 4. Інші електрони (статика, rotated)
        const electronCount = shells.find((s: any) => s.n === n)?.electrons || 0;
        if (electronCount > 0) {
            for (let i = 0; i < electronCount; i++) {
                const staticAngle = (i / electronCount) * 2 * Math.PI + n * 0.5;
                const p = rot3D(
                  r_px * Math.cos(staticAngle),
                  r_px * Math.sin(staticAngle),
                  0
                );
                const ex = center.x + p.x;
                const ey = center.y + p.y;
                ctx.fillStyle = '#00eaff';
                ctx.beginPath();
                ctx.arc(ex, ey, 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    // Animated electrons for ALL shells (rotated)
    for (let n = 1; n <= nMax; n++) {
      const r_px = baseRadius * n;
      const electronCount = shells.find((s: any)=>s.n===n)?.electrons || 0;
      for (let i = 0; i < electronCount; i++) {
         const dynAngle = (i/electronCount)*2*Math.PI + electronAngle * 0.6;
         const p2 = rot3D(
           r_px * Math.cos(dynAngle),
           r_px * Math.sin(dynAngle),
           0
         );
         const ex2 = center.x + p2.x;
         const ey2 = center.y + p2.y;
         ctx.fillStyle = '#00ffff';
         ctx.beginPath();
         ctx.arc(ex2, ey2, 5, 0, 2*Math.PI);
         ctx.fill();
      }
    }
};



// =========================================================================
// ФУНКЦІЯ: Рендер сучасної хмари ймовірності електрона (квантова модель)
// =========================================================================
    function renderModernOrbitalCloud(
        canvas: HTMLCanvasElement,
        Z: number,
        energyN: number,
        selectedOrbital: string,
        superposition: boolean
    ) {
    // This function initializes WebGL once, compiles shaders and buffers, and starts
    // an animation loop. It returns a stop() function to cancel the loop and free GL resources.

    const gl = (canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
        console.warn('WebGL not available, falling back to 2D rendering.');
        return null;
    }

    // Resize canvas for device pixel ratio
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const cssW = 400;
        const cssH = 400;
        const width = Math.floor(cssW * dpr);
        const height = Math.floor(cssH * dpr);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        gl!.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();

    // Simple shaders: vertex positions + rotation matrix + scale
    const vsSrc = `
        attribute vec3 position;
        uniform mat4 uRotation;
        uniform float uScale;
        void main() {
            gl_PointSize = 12.0;
            gl_Position = uRotation * vec4(position * uScale, 1.0);
        }
    `;
    const fsSrc = `
        precision mediump float;
        uniform vec4 uColor;

        void main() {
            // Point sprite UV (0–1)
            vec2 uv = gl_PointCoord * 2.0 - 1.0;
            float r = dot(uv, uv);

            // outside circle — discard fragment
            if (r > 1.0) discard;

            // smooth falloff
            float alpha = exp(-3.0 * r);

            gl_FragColor = vec4(uColor.rgb, alpha * uColor.a);
        }
    `;

    function compileShader(src: string, type: number) {
        const s = gl!.createShader(type)!;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl!.getShaderInfoLog(s));
            gl!.deleteShader(s);
            return null;
        }
        return s;
    }

    const vs = compileShader(vsSrc, gl!.VERTEX_SHADER);
    const fs = compileShader(fsSrc, gl!.FRAGMENT_SHADER);
    const prog = gl!.createProgram()!;
    gl!.attachShader(prog, vs!);
    gl!.attachShader(prog, fs!);
    gl!.linkProgram(prog);
    if (!gl!.getProgramParameter(prog, gl!.LINK_STATUS)) {
        console.error('Program link error:', gl!.getProgramInfoLog(prog));
        return null;
    }
    gl!.useProgram(prog);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);

    // Create particle positions according to orbital type
    let orbital = selectedOrbital !== "auto" ? selectedOrbital : (
      energyN === 1 ? "1s" :
      energyN === 2 ? "2p" :
      energyN === 3 ? "3d" :
      energyN === 4 ? "4f" :
      energyN >= 5 ? "4f" : "1s"
    );
    const pts: number[] = [];
    // Increase density for clarity
    const N = 60000;

    // Z-dependent compression factor (heavier atoms → tighter orbitals)
    const Zscale = 1 / Math.cbrt(Z);

    // orbital-specific shape generators
    function addPoint(x: number, y: number, z: number) {
        pts.push(x * Zscale, y * Zscale, z * Zscale);
    }

    // --- REAL HYDROGENIC SPHERICAL HARMONIC MODELS ---

    function psi2_s(_phi: number, r: number) {
        const R = Math.exp(-2 * r);      // radial decay
        const Y = 1 / (4 * Math.PI);     // |Y00|^2
        return R * Y;
    }

    // 2p (m = 0) — axial bipolar shape
    function psi2_p(_theta: number, phi: number, r: number) {
        const R = r * r * Math.exp(-r);          // approximate hydrogenic 2p radial
        const Y = (3 / (4 * Math.PI)) * Math.pow(Math.cos(phi), 2); // |Y10|^2
        return R * Y;
    }

    // 3d (m = ±2) — four-lobed clover
    function psi2_d(_theta: number, phi: number, r: number) {
        const R = Math.pow(r, 4) * Math.exp(-2 * r / 3);
        const Y = (15 / (16 * Math.PI)) * Math.pow(Math.sin(phi), 2) * Math.pow(Math.cos(phi), 2);
        return R * Y;
    }

    // 4f — complex multi-lobed shape (simplified real harmonic)
    function psi2_f(theta: number, _phi: number, r: number) {
        const R = Math.pow(r, 6) * Math.exp(-r / 2);
        const Y = Math.pow(Math.sin(_phi), 4) * Math.pow(Math.cos(3 * theta), 2);
        return R * Y;
    }

    for (let i = 0; i < N; i++) {
        const r = Math.random() * (1.3 + energyN * 0.1);
        const _theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        // spherical coordinate → Cartesian
        let x = r * Math.sin(phi) * Math.cos(_theta);
        let y = r * Math.sin(phi) * Math.sin(_theta);
        let z = r * Math.cos(phi);

        let amp = 0;
        if (superposition) {
            amp =
                0.4 * psi2_s(phi, r) +
                0.4 * psi2_p(_theta, phi, r) +
                0.2 * psi2_d(_theta, phi, r);
        } else {
            if (orbital === "1s")       amp = psi2_s(phi, r);
            else if (orbital === "2p")  amp = psi2_p(_theta, phi, r);
            else if (orbital === "3d")  amp = psi2_d(_theta, phi, r);
            else if (orbital === "4f")  amp = psi2_f(_theta, phi, r);
        }
        if (Math.random() < amp){
            addPoint(x,y,z);
        }
    }

    // Sort points by radius so inner shells render first (for alpha blending)
    const sorted = [];
    for (let i=0; i<pts.length; i+=3) {
      const x = pts[i], y=pts[i+1], z=pts[i+2];
      const r = Math.sqrt(x*x+y*y+z*z);
      sorted.push({r,x,y,z});
    }
    sorted.sort(
      (
        a: { r: number; x: number; y: number; z: number },
        b: { r: number; x: number; y: number; z: number }
      ) => a.r - b.r
    );
    const flat = [];
    for (const p of sorted) flat.push(p.x,p.y,p.z);

    const buffer = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array(flat), gl!.STATIC_DRAW);

    const posLoc = gl!.getAttribLocation(prog, 'position');
    gl!.enableVertexAttribArray(posLoc);
    gl!.vertexAttribPointer(posLoc, 3, gl!.FLOAT, false, 0, 0);

    const rotLoc = gl!.getUniformLocation(prog, 'uRotation');
    const scaleLoc = gl!.getUniformLocation(prog, 'uScale');
    const colorLoc = gl!.getUniformLocation(prog, 'uColor');

    const valenceBoost = 1.0;
    gl!.uniform4f(colorLoc, 0.3 * valenceBoost, 0.85 * valenceBoost, 1.0, 0.35);
    gl!.uniform1f(scaleLoc, 0.35);

    let t = 0;
    let running = true;

    function rotationMatrix(tVal: number) {
        const c = Math.cos(tVal), s = Math.sin(tVal);
        return new Float32Array([
            c, 0, s, 0,
            0, 1, 0, 0,
           -s, 0, c, 0,
            0, 0, 0, 1
        ]);
    }

    function frame() {
        if (!running) return;
        resize();
        t += 0.008;
        gl!.uniformMatrix4fv(rotLoc, false, rotationMatrix(t));
        gl!.clearColor(0.03, 0.05, 0.1, 1.0);
        gl!.clear(gl!.COLOR_BUFFER_BIT);
        gl!.drawArrays(gl!.POINTS, 0, flat.length / 3);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // Return stop function
    return () => {
        running = false;
        try {
            if (buffer) gl!.deleteBuffer(buffer);
            if (prog) gl!.deleteProgram(prog);
            if (vs) gl!.deleteShader(vs);
            if (fs) gl!.deleteShader(fs);
        } catch (e) {
            // ignore cleanup errors
        }
    };
}