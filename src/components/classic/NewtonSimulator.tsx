import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Sparkles, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

// --- ТИПИ ТА КОНСТАНТИ ---
const COLORS = {
  accent: "#38bdf8",
  force: "#ef4444", 
  velocity: "#22c55e",
  metal: "#94a3b8",
  fire: "#f59e0b"
};

// --- 3D КОМПОНЕНТИ ---

// Процедурна модель ракети
const Rocket = ({ 
  thrust = 0, 
  scale = 1 
}: { 
  thrust?: number; 
  scale?: number; 
}) => {
  return (
    <group rotation={[0, 0, -Math.PI / 2]} scale={scale}>
      {/* Корпус */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.4, 1.8, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Кабіна/Ніс */}
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.3, 0.6, 32]} />
        <meshStandardMaterial color={COLORS.force} metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* Сопло двигуна */}
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 0.4, 32]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.8} />
      </mesh>

      {/* Крила/Стабілізатори */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, i) => (
        <group key={i} rotation={[0, angle, 0]}>
          <mesh position={[0.4, -0.6, 0]} rotation={[0, 0, 0]}>
             <boxGeometry args={[0.4, 0.8, 0.05]} />
             <meshStandardMaterial color={COLORS.force} />
          </mesh>
        </group>
      ))}

      {/* Полум'я двигуна */}
      {thrust > 0 && (
        <group position={[0, -1.5, 0]}>
          {/* Ядро полум'я */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
             <coneGeometry args={[0.15, thrust * 0.8 + 0.5, 16]} />
             <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
          </mesh>
          {/* Зовнішнє сяйво */}
          <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
             <coneGeometry args={[0.3, thrust + 0.5, 16]} />
             <meshBasicMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />
          </mesh>
          {/* Частинки */}
          <Sparkles 
            count={Math.floor(thrust * 30 + 20)} 
            scale={[0.6, thrust * 2 + 1, 0.6]} 
            size={6} 
            speed={4} 
            opacity={1} 
            color="#fcd34d"
            position={[0, -thrust/2 - 0.5, 0]}
          />
        </group>
      )}
    </group>
  );
};

// Стрілка вектора (без тексту)
const VectorArrow = ({ dir, length, color }: { dir: [number, number, number], length: number, color: string }) => {
  if (Math.abs(length) < 0.1) return null;
  const direction = new THREE.Vector3(...dir).normalize();
  return (
    <arrowHelper args={[direction, new THREE.Vector3(0,0,0), length, color, 0.4, 0.3]} />
  );
};

// --- СЦЕНИ СИМУЛЯЦІЇ ---

// 1. ЗАКОН ІНЕРЦІЇ
const Law1Scene = ({ velocity }: { velocity: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pos = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (velocity > 0) {
      pos.current += delta * 2;
      groupRef.current.position.x = pos.current % 20 - 10;
    }
  });

  return (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={velocity > 0 ? 3 : 0} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      
      <group ref={groupRef}>
        <Rocket thrust={velocity > 0 ? 0.2 : 0} />
        {velocity > 0 && (
          <group position={[1.5, 0, 0]}>
             <VectorArrow dir={[1, 0, 0]} length={2} color={COLORS.velocity} />
          </group>
        )}
      </group>
    </>
  );
};

// 2. ЗАКОН ДИНАМІКИ
const Law2Scene = ({ force, mass, isReset, onReset }: { force: number, mass: number, isReset: boolean, onReset: () => void }) => {
  const rocketRef = useRef<THREE.Group>(null);
  const velocity = useRef(0);
  const positionX = useRef(0);

  useEffect(() => {
    if (isReset) {
      velocity.current = 0;
      positionX.current = 0;
      if (rocketRef.current) rocketRef.current.position.x = 0;
      onReset();
    }
  }, [isReset, onReset]);

  useFrame((state, delta) => {
    const a = force / mass;
    velocity.current += a * delta;
    positionX.current += velocity.current * delta;
    if (rocketRef.current) {
      rocketRef.current.position.x = positionX.current % 20 - 10;
    }
  });

  return (
    <>
      {/* Рухомі зорі для відчуття швидкості */}
      <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade speed={velocity.current * 0.5} />
      
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={2} />

      <group ref={rocketRef}>
        <Rocket thrust={force * 0.2} scale={0.8 + mass * 0.1} />
        
        {/* Вектор Сили */}
        {force > 0 && (
           <group position={[0, 1, 0]}>
             <VectorArrow dir={[1, 0, 0]} length={force * 0.3} color={COLORS.force} />
           </group>
        )}
      </group>
    </>
  );
};

// 3. ЗАКОН ВЗАЄМОДІЇ
const Law3Scene = ({ active, onFinish }: { active: boolean, onFinish: () => void }) => {
  const rocketX = useRef(0);
  const gasX = useRef(0);
  
  useEffect(() => {
    if (active) {
       rocketX.current = 0;
       gasX.current = 0;
    }
  }, [active]);

  useFrame((state, delta) => {
    if (active) {
      rocketX.current += 4 * delta;
      gasX.current -= 8 * delta;
    }
  });

  return (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={active ? 2 : 0.5} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={2} />

      {/* Ракета (Дія) */}
      <group position={[rocketX.current, 0, 0]}>
        <Rocket thrust={active ? 1.5 : 0} />
        {active && (
           <group position={[1.5, 0, 0]}>
             <VectorArrow dir={[1, 0, 0]} length={2} color={COLORS.force} />
           </group>
        )}
      </group>

      {/* Гази (Протидія) */}
      {active && (
        <group position={[gasX.current - 1.5, 0, 0]}>
           <Sparkles count={100} scale={[4, 2, 2]} color="#fbbf24" size={10} speed={0} noise={1} />
           <group position={[-1, 0, 0]}>
             <VectorArrow dir={[-1, 0, 0]} length={2} color={COLORS.fire} />
           </group>
        </group>
      )}
    </>
  );
};

// --- ГОЛОВНИЙ КОМПОНЕНТ ---

export default function NewtonSimulator() {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // Стан для 1 закону
  const [l1Velocity, setL1Velocity] = useState(0);

  // Стан для 2 закону
  const [l2Force, setL2Force] = useState(0);
  const [l2Mass, setL2Mass] = useState(2);
  const [l2Reset, setL2Reset] = useState(false);

  // Стан для 3 закону
  const [l3Active, setL3Active] = useState(false);

  const handleL2Reset = () => {
    setL2Reset(true);
    setL2Force(0);
  };

  // --- Теорія для кожного закону ---
  const theoryBlocks = {
    1: (
      <div>
        <h2
          style={{
            borderBottom: '1px solid #334155',
            color: '#38bdf8',
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: 28,
            paddingBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span>❶</span> Перший закон Ньютона (Закон інерції)
        </h2>
        <div style={{ background: '#1e293b', padding: 24, borderRadius: 16, borderLeft: '4px solid #38bdf8', marginBottom: 32, boxShadow: '0 2px 8px #0f172a22' }}>
          <p style={{ fontSize: '1.15rem', fontStyle: 'italic', color: '#cbd5e1', marginBottom: 12 }}>
            «Існують такі системи відліку, що називаються інерціальними, в яких
            матеріальна точка або перебуває у стані спокою, або рухається
            прямолінійно та рівномірно, якщо векторна сума всіх зовнішніх
            сил, що діють на матеріальну точку, дорівнює нулю».
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, fontFamily: 'monospace', color: '#38bdf8', fontSize: 14 }}>
            <span style={{ background: '#38bdf822', padding: '4px 10px', borderRadius: 6 }}>F_res = 0</span>
            <span style={{ background: '#38bdf822', padding: '4px 10px', borderRadius: 6 }}>v = const</span>
            <span style={{ background: '#38bdf822', padding: '4px 10px', borderRadius: 6 }}>a = 0</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7 }}>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Осмислення</h3>
            <p>Це розширений варіант закону інерції Галілея. Важливим є векторний характер сил. Тільки якщо результуюча сила дорівнює нулю, можливий рівномірний прямолінійний рух.</p>
          </div>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Історичний аспект</h3>
            <p>До Ньютона панувала точка зору Аристотеля: «Об’єкт рухається тільки внаслідок дії сили». Ньютон спростував це, показавши, що сила потрібна для <em>зміни</em> швидкості, а не для її підтримки.</p>
          </div>
        </div>
        {/* --- Додаємо оригінальний український текст --- */}
        <div style={{ marginTop: 32, color: '#cbd5e1', lineHeight: 1.75 }}>
          <p>
            Перший закон Ньютона стверджує: «Існують такі системи відліку, що називаються
            інерціальними, в яких матеріальна точка або перебуває у стані спокою,
            або рухається прямолінійно та рівномірно, якщо векторна сума всіх зовнішніх
            сил, що діють на матеріальну точку, дорівнює нулю».
          </p>

          <pre style={{ fontFamily: 'monospace' }}>
ΣF = 0
v = const
a = 0
          </pre>

          <p>
            Осмислення першого закону Ньютона дозволяє дійти висновку, що це є дещо
            розширений варіант закону інерції Галілея. Важливим у цьому законі є вказівка
            на векторний характер сил, що саме за умови рівності нулю результуючої сили
            можливим стає реалізація рівномірного прямолінійного руху матеріальних точок.
          </p>

          <p>
            До Ньютона у фізиці панувала точка зору Аристотеля:
            «Механічний об’єкт рухається тільки внаслідок дії зовнішньої сили.
            Якщо ΣF = 0, то і швидкість v = 0».
            Це є помилковим уявленням.
          </p>
        </div>
      </div>
    ),
    2: (
      <div>
        <h2
          style={{
            borderBottom: '1px solid #334155',
            color: '#ef4444',
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: 28,
            paddingBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span>❷</span> Другий закон Ньютона (Закон динаміки)
        </h2>
        <div style={{
          background: '#1e293b',
          padding: 24,
          borderRadius: 16,
          borderLeft: '4px solid #ef4444',
          marginBottom: 32,
          boxShadow: '0 2px 8px #0f172a22',
          display: 'flex',
          flexDirection: 'row',
          gap: 32,
          alignItems: 'center'
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '1.15rem', color: '#cbd5e1', marginBottom: 12 }}>
              В інерціальних системах відліку прискорення тіла прямо пропорційне рівнодійній сил, що діють на нього, і обернено пропорційне його масі.
            </p>
          </div>
          <div style={{ background: '#0004', padding: 16, borderRadius: 10, textAlign: 'center', minWidth: 180 }}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Диференціальна форма:</p>
            <div style={{ fontSize: 28, fontFamily: 'serif', color: '#fbbf24' }}>
              m <span style={{ color: '#fff' }}>·</span> <span style={{ fontStyle: 'italic' }}>d²r / dt²</span> = F
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: '#ef4444', fontFamily: 'monospace' }}>a = F / m</div>
          </div>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7, columnCount: 2, columnGap: 32 }}>
          <p style={{ marginBottom: 20 }}>
            Другий закон вказує на <strong>причину</strong> зміни руху — силу. З закону випливає принцип незалежності механічних рухів: зміна імпульсу вздовж певної осі залежить тільки від сил, що діють вздовж цієї осі.
          </p>
          <p>
            Закон також передбачає адитивність мас. Якщо маса тіла незмінна, закон записується як <code>F = ma</code>. Під дією однакової сили легше тіло набуде більшого прискорення, ніж важче.
          </p>
        </div>
        {/* --- Додаємо оригінальний український текст --- */}
        <div style={{ marginTop: 32, color: '#cbd5e1', lineHeight: 1.75 }}>
          <p>
            Другий закон Ньютона визначає, що в інерціальних системах відліку
            швидкість зміни імпульсу матеріальної точки з часом дорівнює
            векторній сумі усіх зовнішніх сил, що діють на дану матеріальну точку.
          </p>

          <pre style={{ fontFamily: 'monospace' }}>
dp / dt = ΣF
          </pre>

          <p>
            У випадку незмінної маси тіла другий закон Ньютона спрощується і
            набуває вигляду:
          </p>

          <pre style={{ fontFamily: 'monospace' }}>
m · d²r / dt² = ΣF
a = ΣF / m
          </pre>

          <p>
            Другий закон Ньютона не є визначенням сили. Це фундаментальний закон
            механіки, оскільки він передбачає адитивність мас та принцип
            незалежності механічних рухів.
          </p>

          <p>
            Закон допускає оборотність часу: при заміні t → −t
            рівняння руху залишається справедливим.
          </p>
        </div>
      </div>
    ),
    3: (
      <div>
        <h2
          style={{
            borderBottom: '1px solid #334155',
            color: '#f59e0b',
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: 28,
            paddingBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span>❸</span> Третій закон Ньютона (Закон взаємодії)
        </h2>
        <div style={{ background: '#1e293b', padding: 24, borderRadius: 16, borderLeft: '4px solid #f59e0b', marginBottom: 32, boxShadow: '0 2px 8px #0f172a22' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: 28, fontFamily: 'monospace', color: '#fff', background: '#f59e0b22', padding: '10px 26px', borderRadius: 8 }}>F₁₂ = -F₂₁</span>
          </div>
          <p style={{ textAlign: 'center', color: '#cbd5e1', fontStyle: 'italic' }}>
            «Дії завжди відповідає рівна й протилежна протидія».
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, color: '#94a3b8', fontSize: '1rem' }}>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Природа взаємодії</h3>
            <p style={{ marginBottom: 8 }}>Сили виникають попарно. Якщо тіло A діє на тіло B, то B діє на A з такою ж силою.</p>
            <p>Важливо: ці сили <strong>прикладені до різних тіл</strong>, тому вони не зрівноважують одна одну (якщо розглядати рух кожного тіла окремо).</p>
          </div>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>Приклад ракети</h3>
            <p>
              У космосі ракета відштовхується від власних газів.
              <span style={{ color: '#f59e0b' }}> Сила F₂₁</span> (ракета штовхає газ назад) викликає
              <span style={{ color: '#ef4444' }}> силу F₁₂</span> (газ штовхає ракету вперед).
              Саме це змушує ракету рухатись без опори об землю чи повітря.
            </p>
          </div>
        </div>
        {/* --- Додаємо оригінальний український текст --- */}
        <div style={{ marginTop: 32, color: '#cbd5e1', lineHeight: 1.75 }}>
          <p>
            Третій закон Ньютона свідчить, що взаємодія матеріальних точок між собою
            відбувається в такий спосіб, що сила, з якою перша матеріальна точка
            діє на другу, дорівнює за модулем і протилежна за напрямком силі,
            що діє з боку другої матеріальної точки на першу.
          </p>

          <pre style={{ fontFamily: 'monospace' }}>
F12 = −F21
          </pre>

          <p>
            Сума усіх внутрішніх сил, що діють у замкненій системі,
            дорівнює нулю.
          </p>

          <pre style={{ fontFamily: 'monospace' }}>
F1 + F2 + ... = 0
          </pre>

          <p>
            Внутрішні сили не є причиною руху системи матеріальних точок як цілого.
            Лише наявність зовнішньої сили призводить до зміни руху системи.
          </p>

          <p>
            Сили взаємодії завжди антипаралельні, але не обовʼязково спрямовані
            вздовж прямої, що поєднує центри мас тіл.
          </p>
        </div>
      </div>
    )
  };

  // --- Стилі для лівої панелі ---
  const leftPanelBg = '#0f172a';
  const leftPanelBorder = '1px solid #1e293b';
  const leftPanelWidth = 360;

  // --- Стилі для кнопок перемикання ---
  const tabBtnStyle = (active: boolean) => ({
    flex: 1,
    padding: '9px 0',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 17,
    background: active ? '#38bdf8' : '#1e293b',
    color: active ? '#000' : '#94a3b8',
    border: 'none',
    marginRight: 6,
    cursor: active ? 'default' : 'pointer',
    transition: 'background 0.15s'
  });

  // --- Стилі для контролів ---
  const controlBlockStyle = {
    background: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24
  } as React.CSSProperties;

  // --- Стилі для label/value ---
  const labelStyle = { color: '#94a3b8', fontWeight: 600, fontSize: 15 };
  const valueStyle = { color: '#38bdf8', fontWeight: 700, fontSize: 15 };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0f172a',
      color: '#cbd5e1',
      fontFamily: 'sans-serif',
      overflow: 'hidden'
    }}>
      {/* Ліва панель */}
      <div
        style={{
          width: leftPanelWidth,
          background: leftPanelBg,
          borderRight: leftPanelBorder,
          padding: '36px 32px 24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          minWidth: leftPanelWidth,
          boxSizing: 'border-box'
        }}
      >
        <h2 style={{ color: '#38bdf8', marginBottom: 24, fontSize: '1.5rem', fontWeight: 700 }}>
          Закони Ньютона
        </h2>
        <div style={{ display: 'flex', width: '100%', marginBottom: 32, background: '#1e293b', borderRadius: 10, padding: 2, gap: 0 }}>
          {[1, 2, 3].map((n, idx) => (
            <button
              key={n}
              style={{
                ...tabBtnStyle(activeTab === n),
                marginRight: idx < 2 ? 6 : 0
              }}
              onClick={() => {
                setActiveTab(n as 1 | 2 | 3);
                handleL2Reset();
                setL3Active(false);
              }}
              disabled={activeTab === n}
            >
              {n}
            </button>
          ))}
        </div>
        {/* Контроли для 1 закону */}
        {activeTab === 1 && (
          <div style={{ width: '100%', ...controlBlockStyle }}>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>Стан тіла:</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setL1Velocity(0)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 7,
                  border: l1Velocity === 0 ? '2px solid #38bdf8' : '2px solid #334155',
                  background: l1Velocity === 0 ? '#38bdf822' : 'transparent',
                  color: l1Velocity === 0 ? '#38bdf8' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: l1Velocity === 0 ? 'default' : 'pointer',
                  transition: 'background 0.12s'
                }}
              >
                Спокій
              </button>
              <button
                onClick={() => setL1Velocity(1)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 7,
                  border: l1Velocity > 0 ? '2px solid #22c55e' : '2px solid #334155',
                  background: l1Velocity > 0 ? '#22c55e22' : 'transparent',
                  color: l1Velocity > 0 ? '#22c55e' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: l1Velocity > 0 ? 'default' : 'pointer',
                  transition: 'background 0.12s'
                }}
              >
                Рух (v=const)
              </button>
            </div>
          </div>
        )}
        {/* Контроли для 2 закону */}
        {activeTab === 2 && (
          <div style={{ width: '100%', ...controlBlockStyle }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#ef4444' }}>Сила (F)</span>
                <span style={valueStyle}>{l2Force} Н</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={l2Force}
                onChange={e => setL2Force(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#ef4444',
                  marginTop: 2,
                  marginBottom: 4
                }}
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#38bdf8' }}>Маса (m)</span>
                <span style={valueStyle}>{l2Mass} кг</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={l2Mass}
                onChange={e => setL2Mass(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#38bdf8',
                  marginTop: 2,
                  marginBottom: 4
                }}
              />
            </div>
            <button
              onClick={handleL2Reset}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 7,
                background: '#334155',
                color: '#cbd5e1',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                marginTop: 8,
                transition: 'background 0.13s'
              }}
            >
              Скинути позицію
            </button>
          </div>
        )}
        {/* Контроли для 3 закону */}
        {activeTab === 3 && (
          <div style={{ width: '100%', ...controlBlockStyle }}>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>Демонстрація реактивного руху:</div>
            <button
              onClick={() => setL3Active(true)}
              disabled={l3Active}
              style={{
                width: '100%',
                padding: '16px 0',
                borderRadius: 8,
                background: l3Active ? '#334155' : '#f59e0b',
                color: l3Active ? '#64748b' : '#000',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: l3Active ? 'default' : 'pointer',
                boxShadow: l3Active ? undefined : '0 1px 8px #f59e0b33',
                transition: 'background 0.14s'
              }}
            >
              {l3Active ? "В процесі..." : "ЗАПУСК ДВИГУНА"}
            </button>
          </div>
        )}
        <div style={{ flex: 1 }} />
      </div>
      {/* Права панель */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', background: '#0f172a' }}>
        {/* Canvas wrapper */}
        <div style={{
          height: '55vh',
          minHeight: 400,
          background: '#000',
          position: 'relative',
          borderBottom: '1px solid #1e293b',
          zIndex: 0
        }}>
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={40} />
            <color attach="background" args={["#020617"]} />
            <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 3} />
            {activeTab === 1 && <Law1Scene velocity={l1Velocity} />}
            {activeTab === 2 && <Law2Scene force={l2Force} mass={l2Mass} isReset={l2Reset} onReset={() => setL2Reset(false)} />}
            {activeTab === 3 && <Law3Scene active={l3Active} onFinish={() => setL3Active(false)} />}
          </Canvas>
          {/* Overlay */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(0,0,0,0.6)',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            color: '#94a3b8',
            pointerEvents: 'none'
          }}>
            Миша: Обертання / Наближення
          </div>
        </div>
        {/* Теорія блок */}
        <div style={{
          padding: '40px',
          maxWidth: 900,
          margin: '0 auto',
          color: '#cbd5e1',
          lineHeight: '1.7',
          fontSize: '1.05rem',
          flex: 1,
          overflowY: 'auto',
          width: '100%',
          background: '#0f172a'
        }}>
          {theoryBlocks[activeTab]}
        </div>
      </div>
    </div>
  );
}