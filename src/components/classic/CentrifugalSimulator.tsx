import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import { calculateCentrifugalForce } from "../../api/classic";

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = {hasError:false}; }
  static getDerivedStateFromError() { return {hasError:true}; }
  componentDidCatch(err:any) { console.error("Simulation Error:", err); }
  render() { 
    if (this.state.hasError) {
        return <div className="text-red-500 p-4 border border-red-500 rounded bg-red-900/20">Помилка відображення симуляції. Спробуйте оновити сторінку.</div>;
    }
    return this.props.children; 
  }
}

// --- ТИПИ ---
type UnitData = {
  conversions: {
    force: Record<string, number>;
    acceleration: Record<string, number>;
    angular_velocity: Record<string, number>;
    effective_mass: Record<string, number>;
    radius: Record<string, string | number>;
  };
  physics: {
    omega_rad_s: number;
    g_force: number;
  };
};

// =====================================================================
// 1. СТАНЦІЯ "ENDURANCE" (ANDREWS)
// =====================================================================
const SpaceStation: React.FC<{ angularVelocity: number; radius: number }> = ({ angularVelocity, radius }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += angularVelocity * delta * 0.2; 
    }
  });

  const moduleCount = 12;
  const modules = useMemo(() => {
    return new Array(moduleCount).fill(0).map((_, i) => {
      const angle = (i / moduleCount) * Math.PI * 2;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rot: angle
      };
    });
  }, [radius]);

  return (
    <group>
      <gridHelper args={[100, 20, 0x222222, 0x111111]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, -5]} />
      
      <group ref={groupRef}>
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 1.5, 32]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {modules.map((m, i) => (
          <group key={i}>
            <mesh key={`spoke-${i}`} position={[m.x / 2, m.y / 2, 0]} rotation={[0, 0, m.rot]}>
                <boxGeometry args={[radius, 0.4, 0.4]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            
            <group position={[m.x, m.y, 0]} rotation={[0, 0, m.rot]}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[4.2, 1.8, 1.8]} />
                    <meshStandardMaterial color={i % 2 === 0 ? "#eeeeee" : "#cccccc"} metalness={0.5} roughness={0.4} />
                </mesh>
                <mesh position={[0, -0.91, 0]} rotation={[Math.PI/2, 0, 0]}>
                    <planeGeometry args={[2, 1]} />
                    <meshStandardMaterial color="#88ccff" emissive="#004488" emissiveIntensity={1} />
                </mesh>
            </group>
          </group>
        ))}

        <group position={[0, -radius + 1.8, 0]}>
          <mesh position={[0, 0, 0]}>
              <capsuleGeometry args={[0.3, 0.9, 4, 8]} />
              <meshStandardMaterial color="#eab308" />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
              <sphereGeometry args={[0.25]} />
              <meshStandardMaterial color="white" />
          </mesh>

          <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1.2, 0), 5, 0x4ade80, 1.2, 0.8]} />
          <Html position={[1.5, 1.5, 0]} zIndexRange={[100, 0]}>
              <div style={{ background: 'rgba(0,0,0,0.8)', padding: '4px', borderRadius: '4px', border: '1px solid #4ade80', color: '#4ade80', fontSize: '10px', whiteSpace: 'nowrap' }}>
                 <b>N</b> (Штучна гравітація)
              </div>
           </Html>

          <arrowHelper args={[new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 5, 0xff4444, 1.2, 0.8]} />
          <Html position={[1.5, -3, 0]} zIndexRange={[100, 0]}>
              <div style={{ background: 'rgba(0,0,0,0.8)', padding: '4px', borderRadius: '4px', border: '1px solid #ff4444', color: '#ff4444', fontSize: '10px', whiteSpace: 'nowrap' }}>
                 <b>F_cf</b> (Інерція)
              </div>
           </Html>
        </group>
      </group>
    </group>
  );
};

// =====================================================================
// 2. КАЛЬКУЛЯТОР ДЛЯ СТАНЦІЇ (ANDREWS)
// =====================================================================
const AndrewsFullCalculator = ({ mass, setMass, massUnit, setMassUnit, radius, setRadius, radiusUnit, setRadiusUnit, velocity, setVelocity, velocityUnit, setVelocityUnit, results }: any) => {
  return (
    <div style={{ color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: '1px solid #333', marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb', fontSize: '0.85rem' }}>Mass (m)</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input type="number" value={mass} onChange={(e)=>setMass(Number(e.target.value))} style={{ flex:1, background:'#222', color:'white', border:'1px solid #444', padding:'6px', borderRadius:'4px' }} />
          <select value={massUnit} onChange={(e)=>setMassUnit(e.target.value)} style={{ background:'#333', color:'white', border:'1px solid #444', padding:'6px', borderRadius:'4px' }}>
            <option value="kg">kg</option>
            <option value="g">grams</option>
            <option value="dag">decagrams</option>
            <option value="gr">grains</option>
            <option value="dr">drachms</option>
            <option value="oz">ounces</option>
            <option value="lb">pounds</option>
            <option value="st">stones</option>
          </select>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: '1px solid #333', marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb', fontSize: '0.85rem' }}>Radius (r)</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input type="number" value={radius} onChange={(e)=>setRadius(Number(e.target.value))} style={{ flex:1, background:'#222', color:'white', border:'1px solid #444', padding:'6px', borderRadius:'4px' }} />
          <select value={radiusUnit} onChange={(e)=>setRadiusUnit(e.target.value)} style={{ background:'#333', color:'white', border:'1px solid #444', padding:'6px', borderRadius:'4px' }}>
            <option value="m">m</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="km">km</option>
            <option value="in">in</option>
            <option value="ft">ft</option>
            <option value="yd">yd</option>
            <option value="mi">mi</option>
          </select>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: '1px solid #333', marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb', fontSize: '0.85rem' }}>Tangential velocity (v)</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input type="number" value={velocity} onChange={(e)=>setVelocity(Number(e.target.value))} style={{ flex:1, background:'#222', color:'white', border:'1px solid #444', padding:'6px', borderRadius:'4px' }} />
          <select value={velocityUnit} onChange={(e)=>setVelocityUnit(e.target.value)} style={{ background:'#333', color:'white', border:'1px solid #444', padding:'6px', borderRadius:'4px' }}>
            <option value="m/s">m/s</option>
            <option value="km/h">km/h</option>
            <option value="ft/s">ft/s</option>
            <option value="mph">mph</option>
            <option value="ft/min">ft/min</option>
            <option value="m/min">m/min</option>
          </select>
        </div>
      </div>

      {results && (
        <div style={{ display:"grid", gap:"10px", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ background:"rgba(255,255,255,0.05)", padding:"10px", borderRadius:"8px" }}>
            <h3 style={{ color:"#ff5555", margin: "0 0 5px 0", fontSize: "0.9rem" }}>Force (F)</h3>
            <p className="text-xs">N: {results.conversions.force["N"]?.toFixed(1)}</p>
            <p className="text-xs">kN: {results.conversions.force["kN"]?.toFixed(3)}</p>
            <p className="text-xs">lbf: {results.conversions.force["lbf"]?.toFixed(1)}</p>
          </div>

          <div style={{ background:"rgba(255,255,255,0.05)", padding:"10px", borderRadius:"8px" }}>
            <h3 style={{ color:"#55aaff", margin: "0 0 5px 0", fontSize: "0.9rem" }}>Acc (a)</h3>
            <p className="text-xs">m/s²: {results.conversions.acceleration["m/s2"]?.toFixed(2)}</p>
            <p className="text-xs text-yellow-400 font-bold">g: {results.conversions.acceleration["g"]?.toFixed(2)}</p>
          </div>

          <div style={{ background:"rgba(255,255,255,0.05)", padding:"10px", borderRadius:"8px" }}>
            <h3 style={{ color:"#55ff55", margin: "0 0 5px 0", fontSize: "0.9rem" }}>Omega (ω)</h3>
            <p className="text-xs">RPM: {results.conversions.angular_velocity["rpm"]?.toFixed(1)}</p>
            <p className="text-xs">rad/s: {results.conversions.angular_velocity["rad/s"]?.toFixed(2)}</p>
          </div>

          <div style={{ background:"rgba(255,255,255,0.05)", padding:"10px", borderRadius:"8px" }}>
            <h3 style={{ color:"#aaa", margin: "0 0 5px 0", fontSize: "0.9rem" }}>Mass</h3>
            <p className="text-xs">kg: {results.conversions.effective_mass["kg"]?.toFixed(1)}</p>
            <p className="text-xs">lb: {results.conversions.effective_mass["lb"]?.toFixed(1)}</p>
          </div>
        </div>
      )}
    </div>
  );
};


// =====================================================================
// 3. СИМУЛЯЦІЯ КОРІОЛІСА (ДИСК)
// =====================================================================

const CoriolisInnerLoop = ({ 
    launch, 
    omega, 
    initialVel, 
    launchAngle, 
    onFinish 
}: { 
    launch: number, 
    omega: number, 
    initialVel: number,
    launchAngle: number,
    onFinish: () => void
}) => {
    const timeRef = useRef(0);
    const ballRef = useRef<THREE.Mesh>(null);
    const vArrowRef = useRef<THREE.ArrowHelper>(null);
    const corArrowRef = useRef<THREE.ArrowHelper>(null);
    const cfArrowRef = useRef<THREE.ArrowHelper>(null);

    const initialPos = useMemo(() => new THREE.Vector3(0, 0, 0.5), []);

    // Лінія траєкторії (синя)
    // Використовуємо стабільний об'єкт лінії
    const lineObject = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        // Створюємо буфер на 2000 точок
        const points = new Float32Array(2000 * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
        geometry.setDrawRange(0, 0); // Спочатку не малюємо
        
        const material = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false; // Важливо!
        return line;
    }, []);

    // Скидання при зупинці/запуску
    useEffect(() => {
        if (launch > 0) {
            timeRef.current = 0;
            if (ballRef.current) ballRef.current.position.copy(initialPos);
            // Очищення лінії
            lineObject.geometry.setDrawRange(0, 0);
        }
    }, [launch, initialPos, lineObject]);

    useFrame((_, delta) => {
        if (launch === 0 || !ballRef.current) return;

        // Перевірка на вихід за межі
        if (ballRef.current.position.length() > 9.5) {
            onFinish();
            return;
        }

        timeRef.current += delta;
        const t = timeRef.current;

        // --- ФІЗИКА ---
        const radAngle = launchAngle * Math.PI / 180;
        const dist = initialVel * t;
        
        // Координати в інерціальній системі
        const x_in = dist * Math.cos(radAngle);
        const y_in = dist * Math.sin(radAngle);

        // Перехід в обертову систему
        const rotAngle = -omega * t;
        const x_rot = x_in * Math.cos(rotAngle) - y_in * Math.sin(rotAngle);
        const y_rot = x_in * Math.sin(rotAngle) + y_in * Math.cos(rotAngle);
        
        const currentPos = new THREE.Vector3(x_rot, y_rot, 0.5);
        ballRef.current.position.copy(currentPos);

        // --- ТРАЄКТОРІЯ ---
        // Оновлюємо буфер точок
        const positions = lineObject.geometry.attributes.position.array as Float32Array;
        // Кількість точок для малювання (приблизно 60 точок на секунду для плавності)
        const steps = Math.min(1999, Math.ceil(t * 60) + 2);
        
        for(let i=0; i<=steps; i++) {
            const ti = (i / steps) * t;
            const di = initialVel * ti;
            const xi = di * Math.cos(radAngle);
            const yi = di * Math.sin(radAngle);
            
            const ra = -omega * ti;
            const xr = xi * Math.cos(ra) - yi * Math.sin(ra);
            const yr = xi * Math.sin(ra) + yi * Math.cos(ra);
            
            positions[i*3] = xr;
            positions[i*3+1] = yr;
            positions[i*3+2] = 0.05;
        }
        lineObject.geometry.setDrawRange(0, steps);
        lineObject.geometry.attributes.position.needsUpdate = true;

        // --- ВЕКТОРИ ---
        const r_dir = currentPos.clone().normalize();
        if (r_dir.length() === 0) r_dir.set(1,0,0);
        const tan_dir = new THREE.Vector3(-r_dir.y, r_dir.x, 0); 
        // V_rel
        const v_rel = r_dir.clone().multiplyScalar(initialVel).add(tan_dir.clone().multiplyScalar(omega * dist));
        
        if (vArrowRef.current) {
            vArrowRef.current.setDirection(v_rel.clone().normalize());
            vArrowRef.current.setLength(v_rel.length() * 0.4); 
            vArrowRef.current.position.copy(currentPos);
        }

        if (corArrowRef.current) {
            const f_cor_dir = new THREE.Vector3(v_rel.y, -v_rel.x, 0).normalize();
            if (omega < 0) f_cor_dir.negate();
            corArrowRef.current.setDirection(f_cor_dir);
            corArrowRef.current.setLength(2.0);
            corArrowRef.current.position.copy(currentPos);
        }

        if (cfArrowRef.current) {
            cfArrowRef.current.setDirection(r_dir);
            cfArrowRef.current.setLength(dist * omega * omega * 0.2 + 0.5);
            cfArrowRef.current.position.copy(currentPos);
        }
    });

    return (
        <>
            <mesh ref={ballRef} position={[0, 0, 0.5]}>
                <sphereGeometry args={[0.4]} />
                <meshStandardMaterial color="#ffd12a" emissive="#ffaa00" emissiveIntensity={0.2} />
            </mesh>
            
            {/* Траєкторія - використовуємо primitive для надійного рендеру */}
            <primitive object={lineObject} />

            {/* Вектори */}
            {launch > 0 && (
                <>
                    <arrowHelper ref={vArrowRef} args={[new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1, 0x00ffff]} />
                    <arrowHelper ref={corArrowRef} args={[new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1, 0x00ff00]} />
                    <arrowHelper ref={cfArrowRef} args={[new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1, 0xff0000]} />
                </>
            )}
        </>
    );
};

export const CoriolisDisk = () => {
  const [launch, setLaunch] = useState(0); // Timestamp
  const [omega, setOmega] = useState(1.0);
  const [velocity, setVelocity] = useState(4.0);
  const [angle, setAngle] = useState(0); 
  
  // Функція запуску
  const handleLaunch = () => {
      setLaunch(0); // Скидаємо спочатку
      // Невеликий таймаут щоб скинути стан
      setTimeout(() => setLaunch(Date.now()), 10);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        
        {/* 3D View */}
        <div style={{ height: 450, borderRadius: 12, overflow: 'hidden', background: '#0a162e', border: '1px solid #334155', position: 'relative' }}>
            <Canvas camera={{ position: [0, -15, 12], fov: 45 }}>
                <ambientLight intensity={0.6} />
                <pointLight position={[15, 15, 20]} intensity={1.2} />

                {/* Диск */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[9, 9, 0.5, 64]} />
                    <meshStandardMaterial color="#64748b" />
                </mesh>
                <gridHelper args={[18, 18, 0x334155, 0x334155]} rotation={[Math.PI / 2, 0, 0]} position={[0,0,0.3]} />
                
                {/* Вісь */}
                <arrowHelper args={[new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), 6, 0xa855f7, 1, 0.5]} />
                <Html position={[0,0,6.5]}><div className="text-purple-400 font-bold text-lg">ω</div></Html>

                <CoriolisInnerLoop 
                    launch={launch} 
                    omega={omega} 
                    initialVel={velocity}
                    launchAngle={angle}
                    onFinish={() => {}}
                />

                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
            </Canvas>
            
            {/* Легенда */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur p-3 rounded border border-slate-700 text-xs text-slate-300 pointer-events-none">
                <div className="font-bold mb-2 text-white">Вектори</div>
                <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 bg-cyan-400 rounded-full"></span> Швидкість (v_rel)</div>
                <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Сила Коріоліса (F_cor)</div>
                <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Відцентрова (F_cf)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Траєкторія</div>
            </div>
        </div>

        {/* Controls - ТЕПЕР ЗНИЗУ */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 h-fit">
            <h3 className="text-cyan-400 font-bold mb-4 border-b border-slate-700 pb-2">Налаштування Коріоліса</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-1">Angular Velocity (ω)</label>
                    <input type="range" min="0.1" max="5" step="0.1" value={omega} onChange={(e)=>setOmega(Number(e.target.value))} className="w-full accent-purple-500" />
                    <div className="text-right font-mono text-purple-400">{omega} rad/s</div>
                </div>

                <div>
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-1">Launch Velocity (v)</label>
                    <input type="range" min="1" max="10" step="0.5" value={velocity} onChange={(e)=>setVelocity(Number(e.target.value))} className="w-full accent-cyan-500" />
                    <div className="text-right font-mono text-cyan-400">{velocity} m/s</div>
                </div>

                <div>
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-1">Launch Angle (deg)</label>
                    <input type="range" min="0" max="360" step="15" value={angle} onChange={(e)=>setAngle(Number(e.target.value))} className="w-full accent-yellow-500" />
                    <div className="text-right font-mono text-yellow-400">{angle}°</div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition active:scale-95"
                    onClick={handleLaunch}
                >
                    🚀 ЗАПУСТИТИ
                </button>
            </div>
            
            {/* Independent Calc */}
            <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center text-xs font-mono">
                    <div className="bg-green-900/30 p-2 rounded border border-green-500/50 flex justify-between px-4">
                        <span className="text-green-400 font-bold">F_coriolis (max)</span>
                        <span>{(2 * 1 * velocity * omega).toFixed(2)} N</span>
                    </div>
                    <div className="text-slate-500 flex items-center justify-center">
                        (Розрахунок для m=1кг)
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};


// =====================================================================
// 4. ГОЛОВНИЙ КОМПОНЕНТ СТОРІНКИ
// =====================================================================
export default function CentrifugalSimulator() {
  const [mass, setMass] = useState<number>(70);
  const [massUnit, setMassUnit] = useState<string>("kg");
  const [radius, setRadius] = useState<number>(50);
  const [radiusUnit, setRadiusUnit] = useState<string>("m");
  const [velocity, setVelocity] = useState<number>(22);
  const [velocityUnit, setVelocityUnit] = useState<string>("m/s");
  const [results, setResults] = useState<UnitData | null>(null);
  const [theoryText, setTheoryText] = useState<string>("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      const data = await calculateCentrifugalForce(mass, massUnit, radius, radiusUnit, velocity, velocityUnit);
      if (!active) return;
      if (data) {
        const normalized: UnitData = {
          conversions: (data as any).conversions || {},
          physics: (data as any).physics || { omega_rad_s: 0, g_force: 0 }
        };
        setResults(normalized);
      }
    };
    const t = setTimeout(run, 200);
    return () => { active = false; clearTimeout(t); };
  }, [mass, massUnit, radius, radiusUnit, velocity, velocityUnit]);

  const visualRadius = 20;
  const visualOmega = results?.physics?.omega_rad_s || 0.6;

  return (
    <div style={{ display: 'block', width: '100%', minHeight: '100vh', background: '#020617', color: '#f1f5f9' }}>
      <div style={{ width: '100%', padding: '32px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Відцентрова Сила & Коріоліс
        </h1>
        <ErrorBoundary>
          
          {/* СЕКЦІЯ 1: СТАНЦІЯ */}
          <section className="mb-24">
            <h2 style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎡</span> Штучна гравітація (Станція)
            </h2>

            {/* Layout: Andrews - GRID для надійного side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left: 3D Canvas */}
              <div className="lg:col-span-2 w-full">
                <div style={{ height: '500px', borderRadius: '16px', overflow: 'hidden', background: '#000', position: 'relative', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <Canvas camera={{ position: [0,0,60], fov: 45 }}>
                    <Suspense fallback={<Html center><div style={{color:'white'}}>Завантаження...</div></Html>}>
                      <color attach="background" args={["#050505"]} />
                      <Stars radius={150} depth={50} count={3000} factor={4} saturation={0} fade />
                      <ambientLight intensity={0.3} />
                      <pointLight position={[40,40,50]} intensity={1.5} />
                      <SpaceStation angularVelocity={results?.physics?.omega_rad_s ?? visualOmega} radius={visualRadius} />
                      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                    </Suspense>
                  </Canvas>

                  <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Параметри візуалізації</div>
                    <div style={{ color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}>ω = {(results?.physics?.omega_rad_s ?? visualOmega).toFixed(3)} rad/s</div>
                  </div>
                </div>
                
                <div className="mt-4 bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 text-sm text-blue-200">
                  <strong className="text-blue-400">Пояснення:</strong> Станція обертається, створюючи інерційну систему. Для спостерігача всередині це виглядає як гравітація, що діє від центру назовні (притискає до підлоги).
                </div>
              </div>

              {/* Right: Calculator */}
              <div className="lg:col-span-1 w-full">
                <AndrewsFullCalculator
                  mass={mass} setMass={setMass} massUnit={massUnit} setMassUnit={setMassUnit}
                  radius={radius} setRadius={setRadius} radiusUnit={radiusUnit} setRadiusUnit={setRadiusUnit}
                  velocity={velocity} setVelocity={setVelocity} velocityUnit={velocityUnit} setVelocityUnit={setVelocityUnit}
                  results={results} theoryText={theoryText} setTheoryText={setTheoryText}
                />
              </div>
            </div>
          </section>

          {/* СЕКЦІЯ 2: КОРІОЛІС */}
          <section className="mb-8">
            <h2 style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌀</span> Ефект Коріоліса (Диск)
            </h2>
            <CoriolisDisk />
          </section>

        {/* --- FULL CORIOLIS THEOREM TEXT BLOCK --- */}
        <div style={{ marginTop:"60px", padding:"32px", background:"rgba(10,20,40,0.55)", borderRadius:"16px", border:"1px solid rgba(80,150,255,0.25)", color:"white", lineHeight:"1.7", fontSize:"1rem", boxShadow:"0 0 25px rgba(0,150,255,0.15)" }}>

  <h2 style={{ fontSize:"2rem", color:"#38bdf8", marginBottom:"20px", fontWeight:"700", textShadow:"0 0 10px rgba(56,189,248,0.4)" }}>
    5.1. Теорема Коріоліса (Розширена версія)
  </h2>

  <p>
    Теорема Коріоліса описує прискорення точки у неінерціальній системі, що обертається. 
    Нижче наведено повний та розширений виклад, включно з основними формулами.
  </p>

  <h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.3rem" }}>1. Радіус-вектор та швидкості</h3>

  <p>
    У цьому розділі ми детально розглянемо, як описується положення та швидкість матеріальної точки
    одночасно в інерціальній та неінерціальній системах відліку. Це критично важливо, оскільки
    перехід між двома системами не є тривіальним через обертання та можливе прискорення основи.
  </p>

  <p>
    Нехай центр неінерціальної системи має положення:
  </p>
  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[ \\vec{R}(t) \\]` }}
  />

  <p>Тоді положення точки в інерціальній системі:</p>
  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[ \\vec{F}_i = \\vec{R}(t) + \\vec{F}_n \\]` }}
  />

  <h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.3rem" }}>2. Орти та похідні</h3>
  <p>У системі, що обертається з кутовою швидкістю Ω(t):</p>

  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[
\\frac{d\\vec i}{dt} = \\vec\\Omega \\times \\vec i \\\\
\\frac{d\\vec j}{dt} = \\vec\\Omega \\times \\vec j \\\\
\\frac{d\\vec k}{dt} = \\vec\\Omega \\times \\vec k
\\]` }}
  />

  <p>Радіус-вектор точки в неінерціальній системі:</p>
  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[ \\vec{F}_n = x\\vec i + y\\vec j + z\\vec k \\]` }}
  />

  <h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.3rem" }}>3. Абсолютна швидкість</h3>

  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[ \\vec{V}_a = \\vec{V} + \\dot{\\vec{r}}_n + \\vec\\Omega \\times \\vec{F}_n \\]` }}
  />

  <p>
    Вираз для абсолютної швидкості демонструє, що рух точки складається з трьох незалежних частин:
    руху центру системи, відносного руху точки всередині системи та додаткової компоненти, що пов'язана
    з обертанням базису. Саме ця третя складова є ключем до появи ефектів Коріоліса.
  </p>

  <p>Де V — швидкість центру обертання:</p>
  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[ \\vec{V} = \\frac{d\\vec{R}}{dt} \\]` }}
  />

  <h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.3rem" }}>4. Абсолютне прискорення</h3>

  <p>Загальна формула прискорення точки в інерціальній системі:</p>

  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[
\\vec{a}_a = \\vec{A} + \\vec{a}_n + 2\\vec\\Omega \\times \\vec{V}_n + \\frac{d\\vec\\Omega}{dt} \\times \\vec{F}_n + \\vec\\Omega \\times (\\vec\\Omega \\times \\vec{F}_n)
\\]` }}
  />

  <p>
    Повне диференціювання векторів у системі, що обертається, призводить до появи трьох різних
    додаткових прискорень, кожне з яких має власну фізичну природу. Їх сума створює складну,
    але строго визначену кінематичну структуру руху.
  </p>

  <p>Це і є повна форма Теореми Коріоліса:</p>

  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[ \\vec{a}_a = \\vec{a}_n + \\vec{a}_{kor} + \\vec{a}_{per} \\]` }}
  />

  <p><b>Де:</b></p>

  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[
\\vec{a}_{kor} = 2\\vec\\Omega \\times \\vec{V}_n \\\\
\\vec{a}_{per} = \\vec{A} + \\frac{d\\vec\\Omega}{dt} \\times \\vec{F}_n + \\vec\\Omega \\times (\\vec\\Omega \\times \\vec{F}_n) \\\\
\\vec{a}_{doc} = \\Omega^2 \\vec{r}
\\]` }}
  />

  <h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.3rem" }}>5. Сили інерції</h3>

  <p>
    У неінерціальних системах відліку ми змушені вводити фіктивні сили. Хоча ці сили не існують
    фізично — вони є математичним наслідком використання прискореної системи координат —
    їх вплив на рух реальний і вимірюваний.
  </p>

  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[
\\vec{F}_{kor} = 2m (\\vec\\Omega \\times \\vec{V}_n) \\\\
\\vec{F}_{doc} = m \\Omega^2 \\vec{r} \\\\
\\vec{F}_{per} = -m\\vec{A} - m\\left(\\frac{d\\vec\\Omega}{dt} \\times \\vec{F}_n\\right)
\\]` }}
  />

  <h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.3rem" }}>6. Для сталої швидкості обертання</h3>

  <div
    className="math-block"
    dangerouslySetInnerHTML={{ __html: `\\[ \\vec{a}_a = \\vec{a}_n + 2\\vec\\Omega \\times \\vec{V}_n - \\Omega^2 \\vec{r} \\]` }}
  />

  <p>
    Ця формула повністю узгоджується з математикою, що використовується
    у нашій 3D симуляції ефекту Коріоліса.
  </p>

  <p style={{ marginTop:"28px", fontSize:"1.1rem", color:"#cbd5e1" }}>
    Підсумовуючи, Теорема Коріоліса є фундаментальною для розуміння руху тіл на Землі,
    у штучних космічних станціях та в будь-яких обертових системах. Вона дозволяє точно
    враховувати ефекти викривлення траєкторій, появу уявних сил та складніші взаємодії
    між рухомими об'єктами та самою системою відліку.
  </p>
</div>

        {/* --- INSERTED: КІНЕМАТИКА ТА ДИНАМІКА У НЕІНЕРЦІАЛЬНИХ СИСТЕМАХ --- */}
        <div style={{ marginTop:"60px", padding:"32px", background:"rgba(10,20,40,0.65)", borderRadius:"16px", border:"1px solid rgba(80,150,255,0.35)", color:"white", lineHeight:"1.7", fontSize:"1rem", boxShadow:"0 0 25px rgba(0,150,255,0.25)" }}>

<h2 style={{ fontSize:"2.2rem", color:"#38bdf8", marginBottom:"20px", fontWeight:"800", textShadow:"0 0 12px rgba(56,189,248,0.5)" }}>
5.1. Теорема Коріоліса: Кінематика та динаміка у неінерціальних системах
</h2>

<p>
У класичній механіці закони Ньютона виконуються лише в інерціальних системах відліку. Проте на практиці ми часто маємо справу з системами, що рухаються з прискоренням або обертаються (наприклад, поверхня Землі, карусель, транспорт, що гальмує). Щоб описувати рух тіл у таких <b>неінерціальних системах відліку (НіСВ)</b>, необхідно ввести поправки до кінематичних величин та ввести поняття <b>сил інерції</b>. Фундаментальним результатом цієї теорії є теорема, доведена французьким вченим Гаспаром-Гюставом Коріолісом.
</p>

<h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.4rem" }}>1. Кінематичний опис руху</h3>

<p>
Розглянемо дві системи відліку:<br/>
1. <b>Інерціальна система (K)</b> — умовно "нерухома".<br/>
2. <b>Неінерціальна система (K')</b> — рухається довільним чином відносно K.
</p>

<p>Рух системи K' можна розкласти на дві складові:</p>

<ul>
<li><b>Поступальний рух:</b> центр системи O' рухається зі швидкістю 𝑽₀(t) та має радіус-вектор 𝑹(t).</li>
<li><b>Обертальний рух:</b> система K' обертається навколо миттєвої осі з кутовою швидкістю 𝛀(t).</li>
</ul>

<p>Положення довільної точки M:</p>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[ \\vec{r} = \\vec{R} + \\vec{r}' \\]` }}
/>

<h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.4rem" }}>Швидкість зміни ортів (Формули Пуассона)</h3>

<p>
Нехай у НіСВ базисні орти 𝒊, 𝒋, 𝒌. Для зовнішнього спостерігача вони обертаються разом із системою. Їх похідні:
</p>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[
\\frac{d\\vec{i}}{dt} = \\vec{\\Omega} \\times \\vec{i} \\\\
\\frac{d\\vec{j}}{dt} = \\vec{\\Omega} \\times \\vec{j} \\\\
\\frac{d\\vec{k}}{dt} = \\vec{\\Omega} \\times \\vec{k}
\\]` }}
/>

<h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.4rem" }}>2. Додавання швидкостей</h3>

<p>Відносний радіус-вектор:</p>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[ \\vec{r}' = x\\vec{i} + y\\vec{j} + z\\vec{k} \\]` }}
/>

<p>Диференціюючи:</p>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[ \\frac{d\\vec{r}'}{dt} = \\vec{v}_{rel} + \\Omega \\times \\vec{r}' \\]` }}
/>

<p>Абсолютна швидкість:</p>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[ \\vec{v}_{abs} = \\vec{V}_0 + \\vec{v}_{rel} + \\Omega \\times \\vec{r}' \\]` }}
/>

<p>Класичне додавання швидкостей:</p>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[ \\vec{v}_{abs} = \\vec{v}_{rel} + \\vec{v}_{tr} \\]` }}
/>

<h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.4rem" }}>3. Теорема Коріоліса</h3>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[
\\vec{a}_{abs} = \\vec{A}_0 + \\vec{a}_{rel} + [\\varepsilon, \\vec{r}'] + 2[\\Omega, \\vec{v}_{rel}] + [\\Omega, [\\Omega, \\vec{r}']]
\\]` }}
/>

<p>Головний результат:</p>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[ \\vec{a}_{abs} = \\vec{a}_{rel} + \\vec{a}_{tr} + \\vec{a}_{cor} \\]` }}
/>

<h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.4rem" }}>4. Динаміка: сили інерції</h3>

<div
  className="math-block"
  dangerouslySetInnerHTML={{ __html: `\\[
  \\vec{F}_{kor} = 2m(\\vec{\\Omega} \\times \\vec{V}_n) \\\\
  \\vec{F}_{doc} = m\\Omega^2 \\vec{r} \\\\
  \\vec{F}_{per} = -m\\vec{A} - m\\left(\\frac{d\\vec{\\Omega}}{dt} \\times \\vec{F}_n\\right)
\\]` }}
/>

<h3 style={{ marginTop:"24px", color:"#93c5fd", fontSize:"1.4rem" }}>5. Фізичний зміст</h3>

<p><b>Відцентрова сила</b> — притискає до підлоги в обертових станціях.</p>
<p><b>Сила Коріоліса</b> — викривляє траєкторії на дисках і на Землі.</p>

</div>
        </ErrorBoundary>
      </div>
    </div>
  );
}