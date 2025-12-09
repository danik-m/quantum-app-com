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
  render() { return this.state.hasError ? <div style={{color:"red"}}>Помилка симуляції</div> : this.props.children; }
}


// --- ТИПИ ---
type UnitData = {
  conversions: {
    force: Record<string, number>;
    acceleration: Record<string, number>;
    angular_velocity: Record<string, number>;
    effective_mass?: Record<string, number>;
    radius?: Record<string, string | number>;
  };
  physics: {
    omega_rad_s: number;
    g_force: number;
  };
};

// =====================================================================
// 1. ПОКРАЩЕНА МОДЕЛЬ СТАНЦІЇ (ANDREWS / ENDURANCE)
// =====================================================================
const SpaceStation: React.FC<{ angularVelocity: number; radius: number }> = ({ angularVelocity, radius }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Обертання станції навколо осі Z
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
        rotation: angle
      };
    });
  }, [radius]);

  return (
    <group>
      {/* Нерухома "орбітальна сітка" для контрасту обертання */}
      <gridHelper args={[100, 20, 0x222222, 0x111111]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, -5]} />
      
      {/* Група, що обертається */}
      <group ref={groupRef}>
        {/* Центральний хаб */}
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 1.5, 32]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 1]}>
           <cylinderGeometry args={[1, 1, 0.5, 16]} />
           <meshStandardMaterial color="#222" />
        </mesh>

        {/* Спиці (Connections) */}
        {modules.map((m, i) => (
          <mesh key={`spoke-${i}`} position={[m.x / 2, m.y / 2, 0]} rotation={[0, 0, m.rotation]}>
            <boxGeometry args={[radius, 0.4, 0.4]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        ))}

        {/* Модулі (Кільце) */}
        {modules.map((m, i) => (
          <group key={`module-${i}`} position={[m.x, m.y, 0]} rotation={[0, 0, m.rotation]}>
            {/* Корпус */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[4.2, 1.8, 1.8]} />
              <meshStandardMaterial color={i % 2 === 0 ? "#eeeeee" : "#cccccc"} metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Вікна (спрямовані "вгору" до центру, звідки падає світло зірок) */}
            <mesh position={[0, -0.91, 0]} rotation={[Math.PI/2, 0, 0]}>
              <planeGeometry args={[2, 1]} />
              <meshStandardMaterial color="#88ccff" emissive="#004488" emissiveIntensity={1} />
            </mesh>
            {/* Двигуни/Деталі на зовнішній стороні */}
            <mesh position={[0, 0.91, 0]} rotation={[-Math.PI/2, 0, 0]}>
               <planeGeometry args={[3, 1.2]} />
               <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        ))}

        {/* --- СЦЕНА З АСТРОНАВТОМ (В НИЖНЬОМУ МОДУЛІ) --- */}
        {/* Розташовуємо астронавта на "підлозі" (зовнішній радіус) */}
        <group position={[0, -radius + 1.8, 0]}>
          {/* Астронавт */}
          <mesh position={[0, 0, 0]}>
              <capsuleGeometry args={[0.3, 0.9, 4, 8]} />
              <meshStandardMaterial color="#eab308" />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
              <sphereGeometry args={[0.25]} />
              <meshStandardMaterial color="white" />
          </mesh>

          {/* Вектори сил (з підписами через HTML) */}
          
          {/* N (Зелена) - Реакція опори / Гравітація */}
          <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1.2, 0), 5, 0x4ade80, 1.2, 0.8]} />
          <Html position={[1.5, 1.5, 0]} zIndexRange={[100, 0]}>
              <div style={{ background: 'rgba(0,0,0,0.8)', padding: '4px', borderRadius: '4px', border: '1px solid #4ade80', color: '#4ade80', fontSize: '10px', whiteSpace: 'nowrap' }}>
                 <b>N</b> (Штучна гравітація)
              </div>
           </Html>

          {/* F_cf (Червона) - Відцентрова сила */}
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
// 3. ГОЛОВНИЙ КОМПОНЕНТ СТОРІНКИ
// =====================================================================
export default function CentrifugalSimulator() {
  // Lifted state for Andrews calculator (so calculator and simulation share same data)
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
    <div style={{ display: 'block', width: '100%', minHeight: '100vh', background: '#020617', color: '#f1f5f9', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100vh', overflowY: 'auto', padding: '32px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '2rem', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Відцентрова Сила & Коріоліс
        </h1>
        <ErrorBoundary>
          {/* Блок 1: Станція + праворуч калькулятор (одне вікно, дві колонки) */}
          <section className="mb-12">
            <h2 style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎡</span> Штучна гравітація (Станція)
            </h2>

            {/* Two-column layout: left = canvas, right = calculator */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* Left: 3D Canvas */}
              <div style={{ flex: '1 1 65%', minWidth: 420 }}>
                <div style={{ height: '450px', borderRadius: '16px', overflow: 'hidden', background: '#000', position: 'relative', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <Canvas camera={{ position: [0,0,60], fov: 45 }}>
                    <Suspense fallback={<Html center><div style={{color:'white'}}>Завантаження 3D...</div></Html>}>
                      <color attach="background" args={["#050505"]} />
                      <Stars radius={150} depth={50} count={3000} factor={4} saturation={0} fade />
                      <ambientLight intensity={0.3} />
                      <pointLight position={[40,40,50]} intensity={1.5} />
                      {/* Pass visualOmega and radius computed from calculator state */}
                      <SpaceStation angularVelocity={results?.physics?.omega_rad_s ?? visualOmega} radius={Math.max(6, Math.min(visualRadius, radius / 2))} />
                      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                    </Suspense>
                  </Canvas>

                  {/* Overlay Info */}
                  <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Параметри візуалізації</div>
                    <div style={{ color: '#fff', fontSize: '14px', fontFamily: 'monospace' }}>ω = {(results?.physics?.omega_rad_s ?? visualOmega).toFixed(3)} rad/s</div>
                  </div>
                </div>

                <div className="mt-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300 leading-relaxed">
                  Обертання станції створює ілюзію гравітації. Насправді це підлога тисне на астронавта (сила N), змушуючи його рухатися по колу, а не по прямій. Астронавт відчуває це як "вагу".
                </div>
              </div>

              {/* Right: Calculator panel — connected to Andrews simulation */}
              <div style={{ flex: '0 0 320px' }}>
                <div style={{ position: 'sticky', top: 24 }}>
                  <div style={{ marginTop:'0px', background:'#0f172a', padding:'24px', borderRadius:'12px' }}>
                    <h2 style={{ color:'#38bdf8', fontSize:'1.4rem', fontWeight:'bold', marginBottom:'16px' }}>
                      🧮 Калькулятор Штучної Гравітації (Endurance / Andrews)
                    </h2>
                    <AndrewsFullCalculator
                      mass={mass} setMass={setMass} massUnit={massUnit} setMassUnit={setMassUnit}
                      radius={radius} setRadius={setRadius} radiusUnit={radiusUnit} setRadiusUnit={setRadiusUnit}
                      velocity={velocity} setVelocity={setVelocity} velocityUnit={velocityUnit} setVelocityUnit={setVelocityUnit}
                      results={results} theoryText={theoryText} setTheoryText={setTheoryText}
                    />
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* Блок 2: Коріоліс / Диск */}
          <section className="mb-8">
            <h2 style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌀</span> Ефект Коріоліса (Диск)
            </h2>
            {/* Place the CoriolisDisk simulation here */}
            <CoriolisDisk />
          </section>
        </ErrorBoundary>
      </div>
    </div>
  );
}



export const AndrewsFullCalculator = ({ mass, setMass, massUnit, setMassUnit, radius, setRadius, radiusUnit, setRadiusUnit, velocity, setVelocity, velocityUnit, setVelocityUnit, results, theoryText, setTheoryText }: any) => {
  // This component no longer fetches results — parent provides `results` and state setters
  return (
    <div style={{ color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Mass (m)</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="number" value={mass} onChange={(e)=>setMass(Number(e.target.value))} style={{ flex:1, background:'#222', color:'white', border:'1px solid #444', padding:'8px' }} />
          <select value={massUnit} onChange={(e)=>setMassUnit(e.target.value)} style={{ background:'#333', color:'white', border:'1px solid #444', padding:'8px' }}>
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

      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Radius (r)</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="number" value={radius} onChange={(e)=>setRadius(Number(e.target.value))} style={{ flex:1, background:'#222', color:'white', border:'1px solid #444', padding:'8px' }} />
          <select value={radiusUnit} onChange={(e)=>setRadiusUnit(e.target.value)} style={{ background:'#333', color:'white', border:'1px solid #444', padding:'8px' }}>
            <option value="m">meters</option>
            <option value="mm">millimeters</option>
            <option value="cm">centimeters</option>
            <option value="km">kilometers</option>
            <option value="in">inches</option>
            <option value="ft">feet</option>
            <option value="yd">yards</option>
            <option value="mi">miles</option>
          </select>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#bbb' }}>Tangential velocity (v)</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="number" value={velocity} onChange={(e)=>setVelocity(Number(e.target.value))} style={{ flex:1, background:'#222', color:'white', border:'1px solid #444', padding:'8px' }} />
          <select value={velocityUnit} onChange={(e)=>setVelocityUnit(e.target.value)} style={{ background:'#333', color:'white', border:'1px solid #444', padding:'8px' }}>
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
        <div style={{ display:"grid", gap:"20px" }}>
          <div style={{ background:"rgba(255,255,255,0.05)", padding:"15px", borderRadius:"8px" }}>
            <h3 style={{ color:"#ff5555" }}>Force (F)</h3>
            <p>N: {results.conversions.force["N"]}</p>
            <p>kN: {results.conversions.force["kN"]}</p>
            <p>lbf: {results.conversions.force["lbf"]}</p>
            <p>pdl: {results.conversions.force["pdl"]}</p>
          </div>

          <div style={{ background:"rgba(255,255,255,0.05)", padding:"15px", borderRadius:"8px" }}>
            <h3 style={{ color:"#55aaff" }}>Acceleration</h3>
            <p>m/s²: {results.conversions.acceleration["m/s2"]}</p>
            <p>g: {results.conversions.acceleration["g"]}</p>
          </div>

          <div style={{ background:"rgba(255,255,255,0.05)", padding:"15px", borderRadius:"8px" }}>
            <h3 style={{ color:"#55ff55" }}>Angular velocity</h3>
            <p>RPM: {results.conversions.angular_velocity["rpm"]}</p>
            <p>rad/s: {results.conversions.angular_velocity["rad/s"]}</p>
            <p>Hz: {results.conversions.angular_velocity["Hz"]}</p>
          </div>

          <div style={{ background:"rgba(255,255,255,0.05)", padding:"15px", borderRadius:"8px" }}>
            <h3 style={{ color:"#aaa" }}>Effective Mass</h3>
            <p>kg: {results.conversions.effective_mass["kg"]}</p>
            <p>lb: {results.conversions.effective_mass["lb"]}</p>
            <p>st: {results.conversions.effective_mass["st"]}</p>
          </div>
        </div>
      )}

      <div style={{ marginTop:"20px", padding:"15px", background:"#111", border:"1px dashed #555", borderRadius:"8px" }}>
        <h3>Теоретичні нотатки</h3>
        <textarea value={theoryText} onChange={(e)=>setTheoryText(e.target.value)} style={{ width:"100%", height:"150px", background:"#000", color:"#ccc", border:"1px solid #333", padding:"10px" }} />
      </div>
    </div>
  );
};

// --- Новий компонент для диска (user-rotatable, траєкторія, вектори) ---
const NewDiskSimulation = () => {
  return (
    <CoriolisDisk />
  );
};

export const CoriolisDisk = () => {
  return (
    <div style={{ width: '100%', maxWidth: 700 }}>
      <div style={{ height: 320, borderRadius: 12, overflow: 'hidden', background: '#0a162e', marginBottom: 12 }}>
        <Canvas camera={{ position: [0, 0, 22], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[15, 20, 20]} intensity={1.1} />
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[8, 8, 0.7, 64]} />
            <meshStandardMaterial color="#22334e" metalness={0.45} roughness={0.35} />
          </mesh>
          <mesh position={[8, 0, 0.5]}>
            <sphereGeometry args={[0.33]} />
            <meshStandardMaterial color="#f59e42" emissive="#ffb366" />
          </mesh>
          <line>
            <bufferGeometry attach="geometry">
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array(
                    Array.from({ length: 64 * 3 }, (_, i) => {
                      const t = (i / 63) * Math.PI * 1.2;
                      const r = 8 - 4 * (i / 63);
                      return i % 3 === 0
                        ? r * Math.cos(t)
                        : i % 3 === 1
                        ? r * Math.sin(t)
                        : 0.5;
                    })
                  ),
                  3
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#38bdf8" linewidth={2} />
          </line>
          <arrowHelper
            args={[
              new THREE.Vector3(1,0,0),
              new THREE.Vector3(8,0,0.5),
              2,
              0xff4444,
              0.7,
              0.4
            ]}
          />

          <arrowHelper
            args={[
              new THREE.Vector3(0,1,0),
              new THREE.Vector3(8,0,0.5),
              2,
              0x22d3ee,
              0.7,
              0.4
            ]}
          />

          <arrowHelper
            args={[
              new THREE.Vector3(0,0,1),
              new THREE.Vector3(8,0,0.5),
              2,
              0x818cf8,
              0.7,
              0.4
            ]}
          />

          <arrowHelper
            args={[
              new THREE.Vector3(0,0,1),
              new THREE.Vector3(0,0,0.5),
              2,
              0x818cf8,
              0.7,
              0.4
            ]}
/>
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </div>
      <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 text-slate-200 text-sm leading-relaxed">
        <b>Висновок:</b> <br />
        Частинка покидає диск, рухаючись інерційно по прямій, тоді як диск продовжує обертатись. Спостерігач на диску бачить вигнуту траєкторію — прояв інерції та відсутності радіального утримання.
      </div>
    </div>
  );
};