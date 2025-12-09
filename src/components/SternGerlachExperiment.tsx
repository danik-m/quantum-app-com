import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { getSternGerlachBatch } from '../api/quantum';
import type { SternGerlachAtomData } from '../api/quantum';

// --- КОНСТАНТИ РОЗМІЩЕННЯ (Вздовж осі X) ---
const POS_OVEN = -10;
const POS_COLLIMATOR_1 = -7;
const POS_COLLIMATOR_2 = -5;
const POS_COLLIMATOR_3 = -3;
const MAGNET_START = -1.5;
const MAGNET_END = 1.5;
const POS_SCREEN = 5;

// Параметри симуляції
const VISUAL_SPEED_FACTOR = 0.015; // Уповільнення часу для візуалізації
const DEFLECTION_SCALE = 2000;     // Масштаб відхилення

// Інтерфейс атома
interface Atom extends SternGerlachAtomData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean; 
  color: string;
}

// ------------------------------------------------------------------
// 1. ГЕОМЕТРІЯ УСТАНОВКИ
// ------------------------------------------------------------------

const Oven = () => (
  <group position={[POS_OVEN, 0, 0]}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#444" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[1.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <circleGeometry args={[0.2, 32]} />
      <meshBasicMaterial color="black" />
    </mesh>
    <Text position={[0, 1.5, 0]} fontSize={0.5} color="white">
      1. Піч (Ag)
    </Text>
  </group>
);

const Collimator = ({ x, label }: { x: number, label?: string }) => (
  <group position={[x, 0, 0]}>
    <mesh receiveShadow castShadow>
      <boxGeometry args={[0.1, 2, 2]} />
      <meshStandardMaterial color="#888" transparent opacity={0.9} />
    </mesh>
    <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <circleGeometry args={[0.25, 32]} />
      <meshBasicMaterial color="black" />
    </mesh>
    {label && <Text position={[0, 1.5, 0]} fontSize={0.4} color="white">{label}</Text>}
  </group>
);

const Magnet = () => {
  const northShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.5, 0.5);
    s.lineTo(1.5, 0.5);
    s.lineTo(0, -0.8);
    s.lineTo(-1.5, 0.5);
    return s;
  }, []);

  const southShape = useMemo(() => {
    const s = new THREE.Shape();
    const w = 1.5; 
    const h = 1.5; 
    const gap = 0.5;
    const depth = 0.5;
    s.moveTo(-w, -h); 
    s.lineTo(w, -h);
    s.lineTo(w, 0.5);
    s.lineTo(gap, 0.5);
    s.lineTo(0, 0.5 - depth);
    s.lineTo(-gap, 0.5);
    s.lineTo(-w, 0.5);
    return s;
  }, []);

  const extrudeSettings = { depth: MAGNET_END - MAGNET_START, bevelEnabled: false };

  return (
    <group position={[(MAGNET_START + MAGNET_END) / 2, 0, 0]}>
      <group position={[0, 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, - (MAGNET_END - MAGNET_START)/2]}>
          <extrudeGeometry args={[northShape, extrudeSettings]} />
          <meshStandardMaterial color="#e74c3c" roughness={0.3} />
        </mesh>
      </group>
      <Text position={[0, 1.5, 1.5]} fontSize={0.8} color="#e74c3c" fontWeight="bold">N</Text>

      <group position={[0, -1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, - (MAGNET_END - MAGNET_START)/2]}>
          <extrudeGeometry args={[southShape, extrudeSettings]} />
          <meshStandardMaterial color="#3498db" roughness={0.3} />
        </mesh>
      </group>
      <Text position={[0, -1.5, 1.5]} fontSize={0.8} color="#3498db" fontWeight="bold">S</Text>

      <group>
         <arrowHelper args={[new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0.5, 0), 1.2, 0xffff00, 0.3, 0.2]} />
      </group>
      
      <Text position={[0, 2.5, 0]} fontSize={0.4} color="white">3. Магніт</Text>
    </group>
  );
};

const DetectorScreen = ({ hits }: { hits: Atom[] }) => (
  <group position={[POS_SCREEN, 0, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[0.1, 4, 3]} />
      <meshStandardMaterial color="#ddd" />
    </mesh>
    <Text position={[0, 2.5, 0]} fontSize={0.4} color="white">4. Детектор</Text>
    
    {hits.map((atom) => (
      <mesh key={atom.id} position={[-0.06, atom.position.y, atom.position.z]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={atom.color} />
      </mesh>
    ))}

    <mesh position={[-0.07, 0, 0]}>
        <boxGeometry args={[0.01, 2.5, 0.1]} />
        <meshBasicMaterial color="gray" transparent opacity={0.2} />
    </mesh>
  </group>
);

// ------------------------------------------------------------------
// 2. ЛОГІКА СЦЕНИ
// ------------------------------------------------------------------

const Simulation = ({ isRunning, addHit }: { isRunning: boolean, addHit: (a: Atom) => void }) => {
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const atomId = useRef(0);
  const timer = useRef(0);
  const queue = useRef<SternGerlachAtomData[]>([]);
  const isFetching = useRef(false);

  // Функція для створення локального атому (якщо бекенд недоступний)
  const generateLocalAtom = (): SternGerlachAtomData => {
    const spin = Math.random() > 0.5 ? 'up' : 'down';
    return {
      vx: 450 + Math.random() * 100, // Швидкість ~500 м/с
      vy: (Math.random() - 0.5) * 10,
      vz: (Math.random() - 0.5) * 10,
      spin: spin,
      theoretical_acc_z: (spin === 'up' ? 1 : -1) * 2000 // Умовне прискорення
    };
  };

  const loadData = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
        const data = await getSternGerlachBatch(10);
        // Якщо API повернув порожній масив (помилка), генеруємо локально
        if (!data || data.length === 0) {
           for(let i=0; i<5; i++) queue.current.push(generateLocalAtom());
        } else {
           queue.current.push(...data);
        }
    } catch (e) {
        // Fallback: локальна генерація при помилці мережі
        for(let i=0; i<5; i++) queue.current.push(generateLocalAtom());
    } finally {
        isFetching.current = false;
    }
  };

  useEffect(() => {
    if (isRunning && queue.current.length === 0) loadData();
  }, [isRunning]);

  useFrame((state, delta) => {
    if (!isRunning) return;

    // 1. Спавн
    timer.current += delta;
    if (timer.current > 0.12) { 
      // Якщо черга порожня, додаємо локальний атом миттєво, щоб не було пауз
      if (queue.current.length === 0) {
         queue.current.push(generateLocalAtom());
         loadData(); // І фоново просимо ще
      }
      
      const data = queue.current.shift();
      if (data) {
        // Конвертація у візуальні координати
        const vel = new THREE.Vector3(
            Math.abs(data.vx), 
            data.theoretical_acc_z * (data.spin === 'up' ? 1 : -1), 
            data.vz
        );

        setAtoms(prev => [...prev, {
          ...data,
          id: atomId.current++,
          position: new THREE.Vector3(POS_OVEN + 1.2, 0, 0), 
          velocity: vel,
          active: true,
          color: data.spin === 'up' ? '#2ecc71' : '#9b59b6',
          spawnTime: state.clock.elapsedTime
        }]);
      }
      timer.current = 0;
    }

    // 2. Рух
    setAtoms(prev => prev.map(atom => {
        if (!atom.active) return atom;

        const dt = delta * 5.0; 
        const newPos = atom.position.clone();
        
        newPos.x += atom.velocity.x * VISUAL_SPEED_FACTOR * dt;

        const driftY = atom.velocity.z * VISUAL_SPEED_FACTOR * dt; 
        newPos.y += driftY;

        if (atom.position.x > MAGNET_START && atom.position.x < MAGNET_END) {
            const acc = atom.velocity.y; 
            newPos.y += acc * DEFLECTION_SCALE * dt * dt;
        } else if (atom.position.x >= MAGNET_END) {
             const acc = atom.velocity.y;
             newPos.y += acc * DEFLECTION_SCALE * dt * 0.1; 
        }

        if (newPos.x >= POS_SCREEN - 0.1) {
            newPos.x = POS_SCREEN - 0.06;
            addHit({ ...atom, position: newPos, active: false });
            return { ...atom, position: newPos, active: false };
        }

        return { ...atom, position: newPos };
    }));

    setAtoms(prev => prev.filter(a => a.active || a.position.x < POS_SCREEN + 1));
  });

  return (
    <>
      {atoms.map(atom => (
        <mesh key={atom.id} position={atom.position}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={atom.active ? "cyan" : atom.color} />
        </mesh>
      ))}
    </>
  );
};

// ------------------------------------------------------------------
// 3. ГОЛОВНИЙ КОМПОНЕНТ
// ------------------------------------------------------------------

export default function SternGerlachExperiment() {
  const [isRunning, setIsRunning] = useState(false);
  const [hits, setHits] = useState<Atom[]>([]);

  const handleReset = () => {
    setIsRunning(false);
    setHits([]);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#050505', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* 3D Сцена */}
      <div style={{ height: '60vh', position: 'relative', borderBottom: '1px solid #333' }}>
        <Canvas shadows camera={{ position: [0, 5, 12], fov: 45 }}>
          <color attach="background" args={['#111']} />
          <fog attach="fog" args={['#111', 10, 30]} />
          
          <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2} />
          <PerspectiveCamera makeDefault position={[0, 4, 14]} />

          <ambientLight intensity={0.5} />
          <pointLight position={[5, 10, 5]} intensity={1} castShadow />
          <spotLight position={[-5, 5, 0]} angle={0.3} intensity={2} color="#00ffff" />

          <Oven />
          <Collimator x={POS_COLLIMATOR_1} label="2" />
          <Collimator x={POS_COLLIMATOR_2} />
          <Collimator x={POS_COLLIMATOR_3} />
          <Magnet />
          <DetectorScreen hits={hits} />
          
          <Simulation isRunning={isRunning} addHit={(a) => setHits(prev => [...prev, a])} />

          <gridHelper args={[40, 40, '#333', '#111']} position={[0, -2, 0]} />
        </Canvas>

        <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 10, border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>Експеримент Штерна-Герлаха</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              style={{ padding: '8px 16px', background: isRunning ? '#e74c3c' : '#27ae60', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isRunning ? 'Стоп' : 'Старт'}
            </button>
            <button 
              onClick={handleReset} 
              style={{ padding: '8px 16px', background: '#555', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              Скинути
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: '12px', color: '#aaa' }}>
            Атомів на екрані: {hits.length}
          </div>
        </div>
      </div>

      {/* Секція пояснень */}
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', paddingBottom: '80px' }}>
        
        {/* Класичний погляд */}
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '16px', border: '1px solid #333' }}>
          <h3 style={{ color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '15px', marginTop: 0 }}>
            🏛 Класична фізика (Очікування)
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', background: '#000', margin: '20px 0', borderRadius: '12px', border: '1px dashed #444' }}>
            {/* Імітація суцільної смуги */}
            <div style={{ width: '14px', height: '100px', background: 'linear-gradient(to bottom, transparent, #2ecc71, #2ecc71, transparent)', opacity: 0.8, filter: 'blur(4px)' }}></div>
          </div>

          <div style={{ color: '#ccc', lineHeight: '1.7', fontSize: '0.95rem' }}>
            <p><strong style={{ color: '#fff' }}>Гіпотеза:</strong> Атоми срібла поводяться як маленькі магнітні диполі. У тепловій печі їхні магнітні моменти μ орієнтовані абсолютно хаотично у всіх можливих напрямках.</p>
            
            <p>Сила, що діє на атом у неоднорідному полі, залежить від кута θ між магнітним моментом і полем:</p>
            <div style={{ background: '#222', padding: '8px', borderRadius: '6px', textAlign: 'center', margin: '10px 0', fontFamily: 'monospace' }}>
              Fz = μ · (∂B/∂z) · cos(θ)
            </div>
            
            <p>Оскільки кут θ може бути будь-яким (від 0° до 180°), проекція cos(θ) приймає неперервний ряд значень від -1 до 1. Тому ми очікували побачити на екрані <strong>широку, розмиту вертикальну смугу</strong>.</p>
          </div>
        </div>

        {/* Квантовий погляд */}
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '16px', border: '1px solid #005f73', boxShadow: '0 0 30px rgba(0, 255, 255, 0.05)' }}>
          <h3 style={{ color: '#00ffff', borderBottom: '1px solid #005f73', paddingBottom: '15px', marginTop: 0 }}>
            ⚛️ Квантова фізика
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', background: '#000', margin: '20px 0', borderRadius: '12px', border: '1px solid #005f73', gap: '40px' }}>
            {/* Імітація двох плям */}
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 15px #2ecc71' }}></div>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#9b59b6', boxShadow: '0 0 15px #9b59b6' }}></div>
          </div>

          <div style={{ color: '#ccc', lineHeight: '1.7', fontSize: '0.95rem' }}>
            <p><strong style={{ color: '#fff' }}>Результат:</strong> Пучок не розмився, а розщепився на <strong>два чітких компоненти</strong>. Середина екрану залишилась порожньою.</p>
            
            <p>Це фундаментальне відкриття <strong>просторового квантування</strong> (1922 р.). Магнітний момент (пов'язаний зі спіном електрона) не може повертатися як завгодно. При вимірюванні (взаємодії з полем) він "обирає" лише дискретні стани.</p>
            
            <div style={{ background: '#003344', padding: '8px', borderRadius: '6px', textAlign: 'center', margin: '10px 0', fontFamily: 'monospace', color: '#7df' }}>
              μz = ± μB (Тільки Вгору або Вниз)
            </div>

            <p>Для атома срібла (спін 1/2) існує лише 2 можливі проекції: +½ℏ та -½ℏ. Ніяких проміжних значень!</p>
          </div>
        </div>

      </div>
    </div>
  );
}