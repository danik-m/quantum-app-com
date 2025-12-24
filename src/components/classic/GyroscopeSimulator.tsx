import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Sphere, Torus } from "@react-three/drei";
import * as THREE from "three";
import { calculateGyroscope } from "../../api/classic";
import type { GyroData } from "../../api/classic";

// ==========================================
// 1. 3D МОДЕЛЬ ГІРОСКОПА
// ==========================================
interface GyroModelProps {
    data: GyroData;
    tiltDeg: number;
    length: number;  // Візуальна довжина стрижня
    diskRadius: number; // Візуальний радіус диска
    showVectors: boolean;
}

const GyroModel: React.FC<GyroModelProps> = ({ data, tiltDeg, length, diskRadius, showVectors }) => {
    const groupRef = useRef<THREE.Group>(null); // Група, що прецесує
    const diskRef = useRef<THREE.Group>(null);  // Диск, що обертається
    
    // Кут прецесії (накопичується)
    const precessionAngleRef = useRef(0);
    
    useFrame((_, delta) => {
        // 1. Власне обертання диска (Spin)
        if (diskRef.current) {
            // omega_spin_rad_s - швидкість спіну
            diskRef.current.rotation.y += data.omega_spin_rad_s * delta * 0.1; // *0.1 для візуального комфорту
        }

        // 2. Прецесія (обертання всієї нахиленої системи навколо вертикальної осі Y)
        if (groupRef.current) {
            // omega_precession_rad_s - швидкість прецесії
            const speed = data.omega_precession_rad_s;
            precessionAngleRef.current += speed * delta;
            groupRef.current.rotation.y = precessionAngleRef.current;
        }
    });

    const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
    const rodLength = length * 5; // Масштабування для сцени
    const rDisk = diskRadius * 5;

    // Вектори
    const vecLength = 4;

    return (
        <group>
            {/* --- СТАТИЧНА ОСНОВА --- */}
            <mesh position={[0, -2, 0]} receiveShadow>
                <cylinderGeometry args={[2, 2.5, 0.5, 32]} />
                <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 5, 16]} />
                <meshStandardMaterial color="#888" />
            </mesh>
            <Sphere position={[0, 3, 0]} args={[0.3]}>
                <meshStandardMaterial color="gold" />
            </Sphere>

            {/* --- ПРЕЦЕСУЮЧА ЧАСТИНА --- */}
            <group ref={groupRef} position={[0, 3, 0]}>
                
                {/* ВІЗЬ ГІРОСКОПА (Нахилена) */}
                <group rotation={[0, 0, -tiltRad]}> {/* Нахил праворуч */}
                    
                    {/* Стрижень */}
                    <mesh position={[0, rodLength/2, 0]}> 
                        <cylinderGeometry args={[0.15, 0.15, rodLength, 16]} />
                        <meshStandardMaterial color="#ccc" />
                    </mesh>

                    {/* ДИСК (Обертається навколо осі стрижня Y) */}
                    <group ref={diskRef} position={[0, rodLength, 0]}>
                        <mesh castShadow>
                            <cylinderGeometry args={[rDisk, rDisk, 0.8, 32]} />
                            <meshStandardMaterial color="#e74c3c" metalness={0.4} roughness={0.5} />
                        </mesh>
                        {/* Смужка на диску, щоб бачити обертання */}
                        <mesh position={[0, 0.41, rDisk*0.6]}>
                             <boxGeometry args={[rDisk*0.5, 0.05, rDisk*0.2]} />
                             <meshBasicMaterial color="white" />
                        </mesh>
                        
                        {/* Вектор L (Момент імпульсу) */}
                        {showVectors && (
                            <group position={[0, 1, 0]}>
                                <arrowHelper args={[new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), vecLength, 0x00ff00, 0.8, 0.4]} />
                                <Html position={[0, vecLength + 0.5, 0]}>
                                    <div style={{color:'#00ff00', fontWeight:'bold', textShadow:'0 0 2px black'}}>L</div>
                                </Html>
                            </group>
                        )}
                        
                        {/* Вектор omega (Кутова швидкість) - збігається з L */}
                        {showVectors && (
                           <group position={[0.5, 1, 0]}>
                                <arrowHelper args={[new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), vecLength * 0.7, 0x00ffff, 0.8, 0.4]} />
                                <Html position={[0, vecLength * 0.7, 0]}>
                                    <div style={{color:'#00ffff', fontWeight:'bold', textShadow:'0 0 2px black'}}>ω</div>
                                </Html>
                           </group>
                        )}
                    </group>

                    {/* Вектор Сили Тяжіння (Mg) - прикладений до центру мас */}
                    {showVectors && (
                        <group position={[0, rodLength, 0]}>
                             <group rotation={[0, 0, tiltRad]}>
                                <arrowHelper args={[new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,0), vecLength, 0xffff00, 0.8, 0.4]} />
                                <Html position={[0, -vecLength, 0]}>
                                    <div style={{color:'#ffff00', fontWeight:'bold', textShadow:'0 0 2px black'}}>mg</div>
                                </Html>
                             </group>
                        </group>
                    )}

                    {/* Вектор Моменту Сили (Torque) - перпендикулярний площині */}
                    {showVectors && (
                        <group position={[0, rodLength, 0]}>
                            <arrowHelper args={[new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), vecLength * 0.8, 0xff00ff, 0.8, 0.4]} />
                            <Html position={[0, 0, vecLength]}>
                                <div style={{color:'#ff00ff', fontWeight:'bold', textShadow:'0 0 2px black'}}>M</div>
                            </Html>
                        </group>
                    )}

                </group>

                {/* Траєкторія прецесії (Кільце) */}
                <group rotation={[Math.PI/2, 0, 0]} position={[0, rodLength * Math.cos(tiltRad), 0]}>
                     <Torus args={[rodLength * Math.sin(tiltRad), 0.05, 16, 100]} rotation={[0,0,0]}>
                        <meshBasicMaterial color="white" transparent opacity={0.3} />
                     </Torus>
                </group>
            </group>
        </group>
    );
};

// ==========================================
// 2. ІНТЕРФЕЙС ТА ЛОГІКА
// ==========================================
export default function GyroscopeSimulator() {
    // Стан параметрів
    const [mass, setMass] = useState(2.0); // кг
    const [radius, setRadius] = useState(0.5); // м
    const [length, setLength] = useState(0.8); // м
    const [rpm, setRpm] = useState(600); // об/хв
    const [theta, setTheta] = useState(30); // градуси
    const [showVectors, setShowVectors] = useState(true);

    const [physicsData, setPhysicsData] = useState<GyroData | null>(null);

    // Запит до бекенду при зміні параметрів
    useEffect(() => {
        let active = true;
        calculateGyroscope(mass, radius, length, rpm, theta).then(data => {
            if (active && data) setPhysicsData(data);
        });
        return () => { active = false; };
    }, [mass, radius, length, rpm, theta]);

    return (
        <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: '#050505', color: 'white' }}>
            
            {/* ПАНЕЛЬ КЕРУВАННЯ (ЛІВА) */}
            <div style={{ width: 340, background: '#161b22', padding: 20, borderRight: '1px solid #333', overflowY:'auto', flexShrink: 0 }}>
                <h2 style={{ color: '#e74c3c', marginBottom: 20 }}>Гіроскоп (Дзиґа)</h2>
                
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display:'block', color:'#888', fontSize:12 }}>Маса диска (m)</label>
                    <input type="range" min={0.5} max={10} step={0.1} value={mass} onChange={e=>setMass(Number(e.target.value))} style={{width:'100%'}} />
                    <div style={{textAlign:'right', fontWeight:'bold'}}>{mass} кг</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display:'block', color:'#888', fontSize:12 }}>Радіус диска (R)</label>
                    <input type="range" min={0.1} max={1.0} step={0.05} value={radius} onChange={e=>setRadius(Number(e.target.value))} style={{width:'100%'}} />
                    <div style={{textAlign:'right', fontWeight:'bold'}}>{radius} м</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display:'block', color:'#888', fontSize:12 }}>Плече сили (l)</label>
                    <input type="range" min={0.2} max={2.0} step={0.1} value={length} onChange={e=>setLength(Number(e.target.value))} style={{width:'100%'}} />
                    <div style={{textAlign:'right', fontWeight:'bold'}}>{length} м</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display:'block', color:'#888', fontSize:12 }}>Оберти (RPM)</label>
                    <input type="range" min={100} max={3000} step={50} value={rpm} onChange={e=>setRpm(Number(e.target.value))} style={{width:'100%'}} />
                    <div style={{textAlign:'right', fontWeight:'bold'}}>{rpm} об/хв</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display:'block', color:'#888', fontSize:12 }}>Кут нахилу (Θ)</label>
                    <input type="range" min={5} max={85} step={1} value={theta} onChange={e=>setTheta(Number(e.target.value))} style={{width:'100%'}} />
                    <div style={{textAlign:'right', fontWeight:'bold'}}>{theta}°</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{display:'flex', alignItems:'center', gap:10, cursor:'pointer'}}>
                        <input type="checkbox" checked={showVectors} onChange={e=>setShowVectors(e.target.checked)} />
                        Показати вектори
                    </label>
                </div>

                {physicsData && (
                    <div style={{ background: '#0d1117', padding: 15, borderRadius: 8, border: '1px solid #333', fontSize: 13 }}>
                        <h4 style={{ margin:'0 0 10px 0', color:'#58a6ff' }}>Розрахунки (Backend):</h4>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <span style={{color:'#888'}}>Момент інерції (I):</span>
                            <span>{physicsData.I_kgm2.toFixed(3)} кг·м²</span>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <span style={{color:'#888'}}>Момент імпульсу (L):</span>
                            <span style={{color:'#00ff00'}}>{physicsData.L_kgm2s.toFixed(2)}</span>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <span style={{color:'#888'}}>Момент сили (M):</span>
                            <span style={{color:'#ff00ff'}}>{physicsData.torque_Nm.toFixed(2)} Н·м</span>
                        </div>
                        <hr style={{borderColor:'#333', margin:'8px 0'}}/>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <span style={{color:'#888'}}>Шв. прецесії (Ω):</span>
                            <strong>{physicsData.omega_precession_rad_s.toFixed(3)} рад/с</strong>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <span style={{color:'#888'}}>Період прецесії:</span>
                            <span>{physicsData.T_precession_s.toFixed(1)} с</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ПРАВА ПАНЕЛЬ: 3D + ТЕОРІЯ */}
            <div style={{ flex: 1, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                
                {/* 3D СЦЕНА (ЗБІЛЬШЕНА до 60% висоти екрану) */}
                <div style={{ height: '60vh', minHeight: '500px', width: '100%', position: 'relative', borderBottom: '1px solid #333' }}>
                    <Canvas shadows camera={{ position: [10, 8, 15], fov: 40 }}>
                        <color attach="background" args={['#080808']} />
                        <fog attach="fog" args={['#080808', 20, 60]} />
                        <OrbitControls target={[0, 3, 0]} maxPolarAngle={Math.PI / 1.5} />
                        <ambientLight intensity={0.4} />
                        <pointLight position={[10, 20, 10]} intensity={1.5} castShadow />
                        <spotLight position={[-10, 10, -5]} angle={0.3} intensity={1} color="#e74c3c" />

                        {physicsData && (
                            <Suspense fallback={null}>
                                <GyroModel 
                                    data={physicsData} 
                                    tiltDeg={theta} 
                                    length={length} 
                                    diskRadius={radius} 
                                    showVectors={showVectors}
                                />
                            </Suspense>
                        )}
                        <gridHelper args={[50, 50, '#222', '#111']} position={[0, -2, 0]} />
                    </Canvas>
                    
                    <div style={{ position:'absolute', bottom:20, left:20, color:'#555', fontSize:12 }}>
                        Mouse: Rotate / Zoom
                    </div>
                </div>

                {/* ТЕОРЕТИЧНИЙ БЛОК */}
                <div style={{ padding: '60px', maxWidth: '900px', margin: '0 auto', color: '#c9d1d9', lineHeight: '1.8', fontSize: '1.1rem' }}>
                    <h2 style={{ color: '#e74c3c', fontSize: '2rem', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '30px' }}>
                        Теорія: Рух Гіроскопа
                    </h2>

                    <p className="mb-6">
                        Розглядаючи рух дзиґи, на яку не діють жодні зовнішні моменти сили. 
                        Ми бачили, що у цьому випадку момент імпульсу <b style={{color:'#00ff00'}}>L</b>, взагалі кажучи, 
                        не співпадає за напрямком із кутовою швидкістю <b style={{color:'#00ffff'}}>ω</b>.
                    </p>

                    <p className="mb-6">
                        Тепер розглянемо рух гіроскопу. Гіроскопом називають таке осесиметричне тіло, що швидко обертається 
                        навколо своєї геометричної осі. Залежно від призначення гіроскоп може мати різну конструкцію. 
                        В 3D-моделі вище наведено один із варіантів гіроскопа (дзиґи).
                    </p>

                    <h3 style={{ color: '#58a6ff', marginTop: '30px' }}>Природа прецесії</h3>
                    
                    <p className="mb-6">
                        При обертанні гіроскопа навколо його осі вектор моменту імпульсу <b style={{color:'#00ff00'}}>L</b> також 
                        (як і вектор кутової швидкості <b style={{color:'#00ffff'}}>ω</b>) направлений уздовж осі тіла. 
                        Це очевидно вже без обчислень, просто з міркувань симетрії: завдяки осьовій симетрії руху немає 
                        жодного іншого напрямку, куди б міг бути направлений вектор <b style={{color:'#00ff00'}}>L</b>.
                    </p>
                    
                    <p className="mb-6">
                        Далі, доки на гіроскоп не діють ніякі зовнішні сили, його вісь зберігає свій напрямок у просторі: 
                        завдяки закону збереження моменту імпульсу напрямок (як і абсолютна величина) вектора <b style={{color:'#00ff00'}}>L</b> 
                        залишається незмінним.
                    </p>

                    <div style={{ background: '#161b22', padding: '20px', borderLeft: '4px solid #e74c3c', margin: '30px 0' }}>
                        <p style={{fontStyle:'italic'}}>
                            Якщо ж прикласти до гіроскопа зовнішній момент сили, його вісь почне відхилятись від початкового напрямку. 
                            Саме цей рух осі гіроскопа називається <strong>прецесією</strong>.
                        </p>
                    </div>

                    <p className="mb-6">
                        Нехай до кінців осі гіроскопа прикладено силу тяжіння <b style={{color:'#ffff00'}}>mg</b>. 
                        Тоді виникає момент сили <b style={{color:'#ff00ff'}}>M</b>, направлений перпендикулярно до площини нахилу. 
                        В цей самий бік направлено похідну <span style={{fontFamily:'monospace'}}>dL/dt</span>. 
                        Отже, момент імпульсу внаслідок дії моменту сили отримує приріст:
                    </p>

                    <div style={{ textAlign: 'center', fontSize: '1.4rem', margin: '20px 0', fontFamily: 'serif' }}>
                        d<b style={{color:'#00ff00'}}>L</b> = <b style={{color:'#ff00ff'}}>M</b> dt
                    </div>

                    <p className="mb-6">
                        Таким чином, прикладання до гіроскопа сили (тяжіння) викликає обертання його осі в напрямку, 
                        перпендикулярному до напрямку сили. Це є проявом <strong>гіроскопічного ефекту</strong>: 
                        якщо тіло не обертається навколо власної осі, воно б просто впало. Але обертання гіроскопу 
                        спричиняє зміну напрямку осі під дією моменту сил.
                    </p>

                    <p className="mb-6">
                        Вектор моменту імпульсу <b style={{color:'#00ff00'}}>L</b> лишається незмінним за абсолютною величиною 
                        (оскільки момент сили перпендикулярний до нього), змінюючи лише свій напрямок, що спостерігається 
                        як обертання осі гіроскопа (біла кільцева траєкторія на симуляції).
                    </p>

                    <h3 style={{ color: '#58a6ff', marginTop: '30px' }}>Розрахунок швидкості прецесії</h3>

                    <p className="mb-6">
                        Прикладом гіроскопа є дзиґа, що спирається на одну нижню точку. Дзиґа перебуває під дією сили тяжіння, 
                        яка дорівнює <b style={{color:'#ffff00'}}>P = mg</b>. Момент сили тяжіння відносно точки опори дорівнює:
                    </p>

                    <div style={{ textAlign: 'center', fontSize: '1.2rem', margin: '15px 0', fontFamily: 'serif' }}>
                        M = mgl sin(Θ)
                    </div>

                    <p className="mb-6">
                        де <i>l</i> – це відстань від точки опори до центру мас, а <i>Θ</i> (Тета) − кут між віссю дзиґи і вертикаллю. 
                        Знайдемо кутову швидкість прецесії <b>Ω</b> (або ω₁ в тексті). Протягом часу <i>dt</i> вектор моменту імпульсу 
                        отримує приріст <i>dL = L sin(Θ) dφ</i>. Прирівнявши це до <i>M dt</i>, отримуємо:
                    </p>

                    <div style={{ background: '#0d1117', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #30363d' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#7ee787' }}>Кутова швидкість прецесії</h4>
                        <div style={{ fontSize: '1.8rem', fontFamily: 'serif' }}>
                            Ω = <span style={{display:'inline-block', verticalAlign:'middle', textAlign:'center'}}>
                                <div style={{borderBottom:'1px solid white'}}>mgl</div>
                                <div>Iω</div>
                            </span>
                        </div>
                    </div>

                    <p className="mb-6" style={{ marginTop: '20px' }}>
                        Цей результат показує, що кутова швидкість прецесії прямо пропорційна до моменту сили тяжіння 
                        та обернено пропорційна моменту інерції та швидкості власного обертання.
                    </p>
                    
                    <p className="mb-6">
                        <strong style={{color:'#e74c3c'}}>Важливо:</strong> Кутова швидкість прецесії не залежить від кута нахилу Θ 
                        (оскільки sin(Θ) скорочується в чисельнику моменту сили і в знаменнику радіуса кола прецесії), 
                        але тільки для швидкого гіроскопа.
                    </p>

                    <h3 style={{ color: '#58a6ff', marginTop: '30px' }}>Гіроскопічний ефект у житті</h3>

                    <p className="mb-6">
                        У повсякденному житті ми маємо дуже добрий приклад гіроскопічного ефекту – це їзда на велосипеді [Image of bicycle riding]. 
                        Унаслідок обертання коліс велосипед має момент імпульсу, який направлено ліворуч від велосипедиста. 
                        Коли велосипедист нахиляє велосипед, виникає момент сили тяжіння, що змушує переднє колесо повертати, 
                        допомагаючи увійти в поворот, а не падати.
                    </p>

                    <p className="mb-6">
                        Саме тому на швидкому велосипеді їхати стабільніше: більша швидкість коліс створює більший момент імпульсу <b style={{color:'#00ff00'}}>L</b>, 
                        що робить систему більш стійкою до зовнішніх збурень.
                    </p>
                    
                    
                </div>
            </div>

        </div>
    );
}