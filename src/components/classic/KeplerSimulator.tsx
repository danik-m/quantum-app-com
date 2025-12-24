import React, { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { calculateKepler, type KeplerData } from "../../api/classic";

// ==========================================
// МАТЕМАТИЧНЕ ЯДРО
// ==========================================
function solveKeplerEquation(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 10; i++) {
        const f = E - e * Math.sin(E) - M;
        const df = 1 - e * Math.cos(E);
        E = E - f / df;
    }
    return E;
}

// ==========================================
// 3D КОМПОНЕНТИ
// ==========================================

// --- СЦЕНА 1: ГЕОМЕТРІЯ (1-й Закон) ---
const Law1Scene: React.FC<{ data: KeplerData }> = ({ data }) => {
    // ВИПРАВЛЕННЯ: Усі змінні оголошуються ДО return
    const scale = 10;
    const a = data.semi_major_axis_au * scale;
    const b = data.semi_minor_axis_au * scale;
    const c = data.focus_distance_au * scale; 

    const points = useMemo(() => {
        const pts = [];
        for (let theta = 0; theta <= 2 * Math.PI; theta += 0.05) {
            const x = a * Math.cos(theta) + c; 
            const z = b * Math.sin(theta);
            pts.push(new THREE.Vector3(x, 0, z));
        }
        return pts;
    }, [a, b, c]);

    return (
        <group>
            {/* Сонце у фокусі */}
            <mesh position={[0,0,0]}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial color="#fdb813" emissive="#fdb813" emissiveIntensity={2} />
            </mesh>
            <pointLight position={[0,0,0]} intensity={2} distance={100} decay={0} />

            {/* Орбіта */}
            <Line points={points} color="#4ade80" lineWidth={2} />

            {/* Другий фокус */}
            <mesh position={[c * 2, 0, 0]}>
                <sphereGeometry args={[0.3]} />
                <meshBasicMaterial color="#555" />
            </mesh>
            <Html position={[c*2, -1.5, 0]}>
                <div style={{color:'#888', fontSize:'12px', width:'100px', textAlign:'center', background: 'rgba(0,0,0,0.5)', borderRadius: '4px'}}>Другий фокус</div>
            </Html>

            {/* Осі */}
            <Line points={[new THREE.Vector3(c-a, 0, 0), new THREE.Vector3(c+a, 0, 0)]} color="#ffffff55" lineWidth={1} dashed={true} />
            <Html position={[c, 0, -b-2]}>
                <div style={{color:'#4ade80', fontSize:'14px', background: 'rgba(0,0,0,0.5)', padding: '2px'}}>2a (Велика вісь)</div>
            </Html>
        </group>
    );
};

// --- КОМПОНЕНТ СЕКТОРА (Для 2-го закону) ---
const SectorMesh = ({ points, color }: { points: THREE.Vector3[], color: string }) => {
    const geometry = useMemo(() => {
        if (points.length < 2) return null;
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); // Центр (Сонце)
        points.forEach(p => shape.lineTo(p.x, p.z)); // 2D shape in X-Z plane
        shape.lineTo(0, 0);
        return new THREE.ShapeGeometry(shape);
    }, [points]);

    if (!geometry) return null;

    return (
        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={geometry}>
            <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
    );
};

// --- СЦЕНА 2: ЗАМІТАННЯ ПЛОЩ (2-й Закон) ---
const Law2Scene: React.FC<{ data: KeplerData; speed: number }> = ({ data, speed }) => {
    const planetRef = useRef<THREE.Group>(null);
    const timeRef = useRef(0);
    const scale = 10;
    
    const [currentSectorPoints, setCurrentSectorPoints] = useState<THREE.Vector3[]>([]);
    const [savedSectors, setSavedSectors] = useState<THREE.Vector3[][]>([]);
    
    const lastSweepTime = useRef(0);
    const isSweeping = useRef(false);

    useEffect(() => {
        setSavedSectors([]);
        setCurrentSectorPoints([]);
        timeRef.current = 0;
        lastSweepTime.current = 0;
        isSweeping.current = false;
    }, [data]);

    useFrame((_, delta) => {
        if (!planetRef.current) return;
        
        timeRef.current += delta * speed * 0.5;

        const T = data.period_years;
        const M = (2 * Math.PI / T) * timeRef.current;
        const E = solveKeplerEquation(M, data.eccentricity);

        const a = data.semi_major_axis_au * scale;
        const b = data.semi_minor_axis_au * scale;
        const c = data.focus_distance_au * scale;

        let x = a * Math.cos(E);
        let z = b * Math.sin(E);
        x += c;

        const currentPos = new THREE.Vector3(x, 0, z);
        planetRef.current.position.copy(currentPos);

        const interval = T / 8;
        const sweepDuration = T / 24; 

        if (timeRef.current > lastSweepTime.current + interval) {
            lastSweepTime.current = timeRef.current;
            isSweeping.current = true;
            setCurrentSectorPoints([]);
        }

        if (isSweeping.current) {
            if (timeRef.current > lastSweepTime.current + sweepDuration) {
                isSweeping.current = false;
                setSavedSectors(prev => {
                    const next = [...prev, currentSectorPoints];
                    if (next.length > 6) next.shift();
                    return next;
                });
                setCurrentSectorPoints([]);
            } else {
                setCurrentSectorPoints(prev => {
                    if (prev.length > 0 && prev[prev.length - 1].distanceTo(currentPos) < 0.1) return prev;
                    return [...prev, currentPos.clone()];
                });
            }
        }
    });

    const ellipsePoints = useMemo(() => {
        const pts = [];
        const a = data.semi_major_axis_au * scale;
        const b = data.semi_minor_axis_au * scale;
        const c = data.focus_distance_au * scale;
        for (let t = 0; t <= 2*Math.PI; t+=0.05) {
            pts.push(new THREE.Vector3(a*Math.cos(t)+c, 0, b*Math.sin(t)));
        }
        return pts;
    }, [data]);

    return (
        <group>
            <mesh position={[0,0,0]}>
                <sphereGeometry args={[1.2]} />
                <meshStandardMaterial color="#fdb813" emissive="#fdb813" emissiveIntensity={1.5} />
            </mesh>
            <pointLight position={[0,0,0]} intensity={2} distance={200} decay={0} />
            
            <Line points={ellipsePoints} color="#333" lineWidth={1} />

            {currentSectorPoints.length > 1 && (
                <SectorMesh points={currentSectorPoints} color="#38bdf8" />
            )}

            {savedSectors.map((sectorPts, i) => (
                <SectorMesh key={i} points={sectorPts} color={i % 2 === 0 ? "#4ade80" : "#f472b6"} />
            ))}

            <group ref={planetRef}>
                <mesh>
                    <sphereGeometry args={[0.5]} />
                    <meshStandardMaterial color="#ffffff" />
                </mesh>
                <Html position={[0, 1.5, 0]}>
                    <div style={{
                        color: isSweeping.current ? '#38bdf8' : '#666', 
                        fontSize: '10px', 
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold',
                        textShadow: '0 0 2px black'
                    }}>
                        {isSweeping.current ? "Замітання..." : "Рух"}
                    </div>
                </Html>
            </group>
        </group>
    );
};

// --- СЦЕНА 3: ПОРІВНЯННЯ ПЕРІОДІВ (3-й Закон) ---
const Law3Scene: React.FC<{ data1: KeplerData; data2: KeplerData; speed: number }> = ({ data1, data2, speed }) => {
    const p1Ref = useRef<THREE.Group>(null);
    const p2Ref = useRef<THREE.Group>(null);
    const tRef = useRef(0);
    const scale = 7;

    useFrame((_, delta) => {
        tRef.current += delta * speed * 0.5;

        const M1 = (2 * Math.PI / data1.period_years) * tRef.current;
        const E1 = solveKeplerEquation(M1, data1.eccentricity);
        const x1 = (data1.semi_major_axis_au * scale * Math.cos(E1)) + (data1.focus_distance_au * scale);
        const z1 = (data1.semi_minor_axis_au * scale * Math.sin(E1));
        if (p1Ref.current) p1Ref.current.position.set(x1, 0, z1);

        const M2 = (2 * Math.PI / data2.period_years) * tRef.current;
        const E2 = solveKeplerEquation(M2, data2.eccentricity);
        const x2 = (data2.semi_major_axis_au * scale * Math.cos(E2)) + (data2.focus_distance_au * scale);
        const z2 = (data2.semi_minor_axis_au * scale * Math.sin(E2));
        if (p2Ref.current) p2Ref.current.position.set(x2, 0, z2);
    });

    const getOrbit = (d: KeplerData) => {
        const pts = [];
        const a = d.semi_major_axis_au * scale;
        const b = d.semi_minor_axis_au * scale;
        const c = d.focus_distance_au * scale;
        for (let t=0; t<=2*Math.PI; t+=0.1) pts.push(new THREE.Vector3(a*Math.cos(t)+c, 0, b*Math.sin(t)));
        return pts;
    };

    return (
        <group>
            <mesh position={[0,0,0]}>
                <sphereGeometry args={[1.5]} />
                <meshStandardMaterial color="#fdb813" emissive="#fdb813" />
            </mesh>
            <pointLight position={[0,0,0]} intensity={2} distance={200} />

            <Line points={getOrbit(data1)} color="#4ade80" lineWidth={2} />
            <group ref={p1Ref}>
                <mesh>
                    <sphereGeometry args={[0.5]} />
                    <meshStandardMaterial color="#4ade80" />
                </mesh>
                <Html position={[0,1,0]}><div style={{color:'#4ade80', fontSize:'10px'}}>T={(data1.period_years).toFixed(1)}y</div></Html>
            </group>

            <Line points={getOrbit(data2)} color="#f472b6" lineWidth={2} />
            <group ref={p2Ref}>
                <mesh>
                    <sphereGeometry args={[0.6]} />
                    <meshStandardMaterial color="#f472b6" />
                </mesh>
                <Html position={[0,1,0]}><div style={{color:'#f472b6', fontSize:'10px'}}>T={(data2.period_years).toFixed(1)}y</div></Html>
            </group>
        </group>
    );
};


// ==========================================
// ГОЛОВНИЙ КОМПОНЕНТ
// ==========================================
export default function KeplerSimulator() {
    const [tab, setTab] = useState(1);
    const [a, setA] = useState(1.5);
    const [e, setE] = useState(0.5);
    const [speed, setSpeed] = useState(1.0);
    const [a2, setA2] = useState(2.5);

    const [data, setData] = useState<KeplerData | null>(null);
    const [data2, setData2] = useState<KeplerData | null>(null);

    useEffect(() => {
        let active = true;
        calculateKepler(a, e, 1.0).then(res => { if(active) setData(res); });
        calculateKepler(a2, 0, 1.0).then(res => { if(active) setData2(res); });
        return () => { active = false; };
    }, [a, e, a2]);

    return (
        <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: '#020617', color: 'white', fontFamily: 'Inter, sans-serif' }}>
            
            {/* ЛІВА ПАНЕЛЬ */}
            <div style={{ width: 360, background: '#0f172a', padding: 24, borderRight: '1px solid #1e293b', overflowY: 'auto', flexShrink: 0 }}>
                <h2 style={{ color: '#38bdf8', marginBottom: 24, fontSize: '1.5rem', fontWeight: 700 }}>Закони Кеплера</h2>
                
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    {[1, 2, 3].map(n => (
                        <button 
                            key={n}
                            onClick={() => setTab(n)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                background: tab === n ? '#38bdf8' : '#1e293b',
                                color: tab === n ? '#000' : '#94a3b8',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {n}-й Закон
                        </button>
                    ))}
                </div>

                <div style={{ marginBottom: 24, background: '#1e293b', padding: 16, borderRadius: 12 }}>
                    <label style={{ display:'block', color:'#94a3b8', fontSize:12, marginBottom: 4 }}>Велика піввісь (a) [AU]</label>
                    <input type="range" min={0.5} max={3.0} step={0.1} value={a} onChange={ev=>setA(Number(ev.target.value))} style={{width:'100%'}} />
                    <div style={{textAlign:'right', color:'#38bdf8', fontWeight:'bold'}}>{a} AU</div>

                    {tab !== 3 && (
                        <>
                            <label style={{ display:'block', color:'#94a3b8', fontSize:12, marginTop: 12, marginBottom: 4 }}>Ексцентриситет (e)</label>
                            <input type="range" min={0} max={0.8} step={0.05} value={e} onChange={ev=>setE(Number(ev.target.value))} style={{width:'100%'}} />
                            <div style={{textAlign:'right', color:'#38bdf8', fontWeight:'bold'}}>{e}</div>
                        </>
                    )}

                    {tab === 3 && (
                        <>
                            <label style={{ display:'block', color:'#94a3b8', fontSize:12, marginTop: 12, marginBottom: 4 }}>Планета 2 (a) [AU]</label>
                            <input type="range" min={0.5} max={4.0} step={0.1} value={a2} onChange={ev=>setA2(Number(ev.target.value))} style={{width:'100%'}} />
                            <div style={{textAlign:'right', color:'#f472b6', fontWeight:'bold'}}>{a2} AU</div>
                        </>
                    )}

                    <label style={{ display:'block', color:'#94a3b8', fontSize:12, marginTop: 12, marginBottom: 4 }}>Швидкість часу</label>
                    <input type="range" min={0.1} max={3.0} step={0.1} value={speed} onChange={ev=>setSpeed(Number(ev.target.value))} style={{width:'100%'}} />
                </div>

                {data && (
                    <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                        <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #334155'}}>
                            <span>Період (T):</span>
                            <span style={{color:'#38bdf8'}}>{data.period_years.toFixed(2)} роки</span>
                        </div>
                        {tab === 1 && (
                            <>
                                <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #334155'}}>
                                    <span>Перигелій:</span>
                                    <span>{data.perihelion_au.toFixed(2)} AU</span>
                                </div>
                                <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}>
                                    <span>Афелій:</span>
                                    <span>{data.aphelion_au.toFixed(2)} AU</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ПРАВА ПАНЕЛЬ: CANVAS + ТЕОРІЯ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
                
                <div style={{ height: '55vh', minHeight: '400px', background: '#000', position: 'relative' }}>
                    <Canvas camera={{ position: [0, 40, 40], fov: 45 }}>
                        <color attach="background" args={['#020617']} />
                        <OrbitControls />
                        <ambientLight intensity={0.6} />
                        <gridHelper args={[80, 80, '#1e293b', '#0f172a']} position={[0,-0.1,0]} />

                        {tab === 1 && data && <Law1Scene data={data} />}
                        {tab === 2 && data && <Law2Scene data={data} speed={speed} />}
                        {tab === 3 && data && data2 && <Law3Scene data1={data} data2={data2} speed={speed} />}
                    </Canvas>
                    
                    <div style={{ position:'absolute', bottom: 16, left: 16, background:'rgba(0,0,0,0.6)', padding:'8px 12px', borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
                        {!data ? "Завантаження..." : "Миша: Обертання / Наближення"}
                    </div>
                </div>

                {/* --- ТЕОРЕТИЧНА ЧАСТИНА --- */}
                <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', color: '#cbd5e1', lineHeight: '1.7', fontSize: '1.05rem' }}>
                    
                    {/* ТЕКСТ 1-ГО ЗАКОНУ */}
                    {tab === 1 && (
                        <div>
                            <h2 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: 12, marginBottom: 24, fontSize: '1.8rem' }}>
                                4.8. Перший закон Кеплера
                            </h2>
                            <p className="mb-4">
                                Перший закон Кеплера стверджує: <strong>«Всі планети рухаються за еліптичними орбітами навколо Сонця, яке знаходиться в одному з фокусів еліпса».</strong> [Image of Kepler first law]
                            </p>
                            <p className="mb-4">
                                Всі свої закони Кеплер встановив експериментально, систематизувавши та усвідомивши результати багаторічних спостережень (як власних, так і своїх попередників). Саме спираючись на закони Кеплера, Ньютон вивів свій закон всесвітнього тяжіння. Але теоретично можна, виходячи з законів Ньютона, розрахувати траєкторію рухів планет в Сонячній системі.
                            </p>
                            
                            <h3 style={{color:'#94a3b8', marginTop:30, marginBottom:10}}>Виведення рівняння траєкторії</h3>
                            <p className="mb-4">
                                Для цього скористаємося законом збереження моменту імпульсу:
                            </p>
                            <div style={{background:'#1e293b', padding:16, borderRadius:8, margin:'16px 0', fontFamily:'monospace', textAlign:'center', color:'#7dd3fc'}}>
                                L = mr²(dφ/dt) = const  (4.29)
                            </div>
                            <p className="mb-4">
                                та законом збереження повної механічної енергії:
                            </p>
                            <div style={{background:'#1e293b', padding:16, borderRadius:8, margin:'16px 0', fontFamily:'monospace', textAlign:'center', color:'#7dd3fc'}}>
                                E₀ = mv²/2 - GmM/r = const (4.30)
                            </div>
                            <p className="mb-4">
                                З цих двох законів (4.29) та (4.30) маємо два рівняння для двох невідомих функції r(t) та φ(t). Цього досить, щоб математично описати рух планети в Сонячній системі. Рівняння траєкторії r=r(φ) не містить часу – це підказує, як слід розв’язувати систему рівнянь: передовсім, слід виключити з цих рівнянь час. Для цього знайдемо з (4.29) вираз для похідної dφ/dt:
                            </p>
                            <div style={{textAlign:'center', margin:'10px 0', color:'#cbd5e1'}}>
                                dφ/dt = L / (mr²)  (4.31)
                            </div>
                            <p className="mb-4">
                                і підставимо його до рівняння енергії (4.29). Після перетворень знайдемо похідну від відстані r за часом (4.33):
                            </p>
                            <div style={{background:'#1e293b', padding:16, borderRadius:8, margin:'16px 0', fontFamily:'monospace', textAlign:'center', fontSize:'0.9rem', color:'#7dd3fc'}}>
                                dr/dt = √[ (2E₀/m) + (2GmM/mr) - (L²/m²r²) ]
                            </div>
                            <p className="mb-4">
                                Визначимо елементарний проміжок часу dt з (4.31) та отриманого виразу для dr/dt та прирівняємо їх. В такий спосіб ми здобули диференціальне рівняння (4.36), в якому не фігурує час. Це рівняння розв'язують методом поділу змінних. Інтегруючи його, отримуємо (4.39):
                            </p>
                            <div style={{background:'#1e293b', padding:20, borderRadius:8, margin:'16px 0', fontSize:'1.3rem', textAlign:'center', color:'#38bdf8', border:'1px solid #38bdf8'}}>
                                r = p / (1 - e·cos(φ - φ₀))
                            </div>
                            <p className="mb-4">
                                Це є рівняння еліпса (або конічного перерізу). Тут введено загальновживані позначення:
                            </p>
                            <ul style={{listStyle:'disc', paddingLeft:24, marginBottom:16}}>
                                <li><strong>p = L² / (Gm²M)</strong> — параметр орбіти (або фокальний параметр).</li>
                                <li><strong>e = √(1 + 2E₀L² / (G²m³M²))</strong> — ексцентриситет.</li>
                            </ul>
                            <p>
                                Якщо ексцентриситет є меншим за одиницю, <strong>0 &lt; e &lt; 1</strong>, траєкторією матеріальної точки є еліпс. При цьому повна механічна енергія є від’ємною.
                            </p>
                            
                            <h3 style={{color:'#94a3b8', marginTop:30, marginBottom:10}}>Аналіз руху</h3>
                            <p className="mb-4">
                                З рівняння (4.44) dU*/dr = 0 дістаємо координату мінімуму ефективної потенціальної енергії, r₁ = L²/(Gm²M). Це в точності співпадає з параметром орбіти p, що відповідає фізичному значенню параметра орбіти як радіуса окружності, по якій рухається матеріальна точка за умови нульового ексцентриситету, e=0.
                            </p>
                            <p>
                                Найменшу відстань від планети до Сонця називають <strong>перигелієм</strong>, найбільшу — <strong>афелієм</strong>.
                            </p>
                        </div>
                    )}

                    {/* ТЕКСТ 2-ГО ЗАКОНУ */}
                    {tab === 2 && (
                        <div>
                            <h2 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: 12, marginBottom: 24, fontSize: '1.8rem' }}>
                                Другий закон Кеплера
                            </h2>
                            <p className="mb-4">
                                Другий закон планетарного руху Кеплера, також відомий як <strong>закон рівних площ</strong>, стверджує:
                            </p>
                            <blockquote style={{borderLeft:'4px solid #38bdf8', paddingLeft:20, margin:'24px 0', fontStyle:'italic', color:'#e2e8f0', fontSize:'1.1rem', background:'#1e293b', padding:'16px'}}>
                                «Лінія, що з'єднує Сонце і планету (радіус-вектор), за рівні проміжки часу описує рівні площі». [Image of Kepler second law area]
                            </blockquote>
                            <p className="mb-4">
                                Цей закон є одним із трьох законів Кеплера, виявлених німецьким астрономом Йоганнесом Кеплером. Вперше опублікований в «Новій астрономії» (1609 р.). Книга також говорить про те, що закон однаковою мірою застосовується і до інших небесних систем, які рухаються навколо центру мас.
                            </p>
                            <p className="mb-4">
                                Другий закон Кеплера — це більш точний опис орбіти планети, він надає вагомі докази геліоцентричної теорії Коперніка та підґрунтя для пізнішого доказу гравітації Ньютоном разом з іншими двома законами.
                            </p>
                            <p>
                                <strong>В симуляції:</strong> Ви бачите кольорові сектори, які планета "замітає" за фіксований інтервал часу. 
                                Зверніть увагу: коли планета наближається до Сонця (перигелій), вона рухається <strong>швидше</strong>, тому сектор виходить коротким, але широким. 
                                Коли планета далеко (афелій), вона рухається <strong>повільніше</strong>, і сектор стає довгим і вузьким. 
                                Але площа цих секторів <strong>однакова</strong>.
                            </p>
                        </div>
                    )}

                    {/* ТЕКСТ 3-ГО ЗАКОНУ */}
                    {tab === 3 && (
                        <div>
                            <h2 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: 12, marginBottom: 24, fontSize: '1.8rem' }}>
                                4.9. Третій закон Кеплера
                            </h2>
                            <p className="mb-4">
                                Зміст цього закону Кеплера полягає в тому, що:
                                <strong> «Квадрати періоду часу обертання планет навколо Сонця відносяться один до одного так, як куби великих півосей їхніх еліптичних орбіт».</strong> 
                            </p>
                            <div style={{background:'#1e293b', padding:16, borderRadius:8, margin:'16px 0', fontSize:'1.3rem', textAlign:'center', color:'#38bdf8', border:'1px solid #38bdf8'}}>
                                T² / a³ = const
                            </div>
                            
                            <h3 style={{color:'#94a3b8', marginTop:30, marginBottom:10}}>Виведення (для колової орбіти)</h3>
                            <p className="mb-4">
                                Для спрощення математичних записів доведемо це на прикладі руху по окружності з радіусом R. Планета, що рівномірно обертається навколо Сонця по окружності, рухається з доцентровим прискоренням <strong>a = ω²R</strong> під дією сили гравітації <strong>F = GmM / R²</strong>. За другим законом Ньютона маємо рівняння:
                            </p>
                            <div style={{background:'#1e293b', padding:16, borderRadius:8, margin:'16px 0', fontFamily:'monospace', textAlign:'center', color:'#7dd3fc'}}>
                                ω²R = GM / R²  (4.46)
                            </div>
                            <p className="mb-4">
                                Беручи до уваги зв'язок кутової швидкості обертання планети з періодом, <strong>ω = 2π / T</strong>, підставимо це в (4.46) і перепишемо у наступному вигляді:
                            </p>
                            <div style={{background:'#1e293b', padding:20, borderRadius:8, margin:'16px 0', fontSize:'1.2rem', fontFamily:'monospace', textAlign:'center', color:'#7dd3fc'}}>
                                T² = (4π² / GM) · R³  (4.47)
                            </div>
                            <p className="mb-4">
                                де <strong>4π²/(GM) = const</strong> — це одна й та сама величина для всіх планет однієї Сонячної системи, бо вона не залежить від характеристик планети (її маси m).
                            </p>
                            <p>
                                Що ближча планета до Сонця, то коротший там рік, але залежність ця не є прямо пропорційною, а визначається формулою.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}