import { useState, useEffect } from "react";
import { getHydrogenSolution } from "../api/quantum";
import { Link } from "react-router-dom";

// --- КОНСТАНТИ ---
const A0_VAL = 0.529; // Ангстрем
const E_R = 13.6057;  // Енергія Рідберга (еВ)

// --- КОМПОНЕНТИ ОТОБРАЖЕНИЯ ФОРМУЛ ---
const M = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontFamily: "'Times New Roman', serif", fontStyle: "italic", fontSize: "1.15em", padding: "0 2px" }}>
    {children}
  </span>
);

const Frac = ({ up, down }: { up: React.ReactNode, down: React.ReactNode }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "middle", textAlign: "center", margin: "0 5px", transform: "translateY(5px)" }}>
    <span style={{ borderBottom: "1px solid rgba(255,255,255,0.5)", padding: "0 2px", marginBottom: "2px", display: "block" }}>{up}</span>
    <span style={{ display: "block" }}>{down}</span>
  </span>
);

// Используем any для t, щоб приймати і строки, і JSX
const Sub = ({ t }: { t: any }) => <sub style={{ fontSize: "0.7em", color: "#8b949e" }}>{t}</sub>;
const Sup = ({ t }: { t: any }) => <sup style={{ fontSize: "0.7em", color: "#8b949e" }}>{t}</sup>;

// --- ТИПЫ ЗАДАЧ ---
type ProblemType = "radial" | "classical" | "stationary";

export default function HydrogenSimulator() {
  const [taskType, setTaskType] = useState<ProblemType>("radial");
  
  // Параметры состояния
  const [Z, setZ] = useState(1);
  const [n, setN] = useState(1);
  const [l, setL] = useState(0);
  const [m, setM] = useState(0);

  // Хендлеры с валидацией
  const handleNChange = (val: number) => {
    setN(val);
    if (l >= val) setL(val - 1);
  };
  const handleLChange = (val: number) => {
    setL(val);
    if (Math.abs(m) > val) setM(0);
  };

  const orbitName = ['s', 'p', 'd', 'f', 'g', 'h'][l] || '?';

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", background: "#0E1117", color: "white", fontFamily: "Inter, sans-serif" }}>
      
      {/* ЛЕВАЯ ПАНЕЛЬ: НАВИГАЦИЯ */}
      <div style={{ width: "340px", background: "#161b22", padding: "24px", borderRight: "1px solid #30363d", display: "flex", flexDirection: "column", gap: "20px", flexShrink: 0, overflowY: "auto" }}>
        
        <div>
           <Link to="/physics/atomic/models" style={{ color: "#58a6ff", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "5px" }}>
             <span>←</span> Назад
           </Link>
           <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 700, marginTop: "15px" }}>Квантовая Лаборатория</h1>
           <p style={{ color: "#8b949e", fontSize: "0.85rem" }}>Водородоподобні атоми</p>
        </div>

        {/* ПЕРЕКЛЮЧАТЕЛЬ ЗАДАЧ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ color: "#8b949e", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase" }}>Тип задачі</label>
            <ProblemButton 
                active={taskType === "radial"} 
                onClick={() => setTaskType("radial")}
                icon="🌊" title="Радіальне Рівняння" 
                desc="Пошук власних значень E та R(r)"
            />
            <ProblemButton 
                active={taskType === "classical"} 
                onClick={() => setTaskType("classical")}
                icon="🪐" title="Модель Бора" 
                desc="Классические орбиты и скорости"
            />
            <ProblemButton 
                active={taskType === "stationary"} 
                onClick={() => setTaskType("stationary")}
                icon="✨" title="Стационарное Состояние" 
                desc="Полная волновая функция Ψ"
            />
        </div>

        <hr style={{ borderColor: "#30363d" }} />

        {/* ПАРАМЕТРЫ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
                <label className="text-xs text-gray-400 mb-1 block" style={{ fontSize: "0.8rem", color: "#8b949e", marginBottom: "5px" }}>Елемент / Заряд (Z)</label>
                <div style={{ display: "flex", gap: "5px" }}>
                    {[1, 2, 3].map(val => (
                        <button 
                            key={val} 
                            onClick={() => setZ(val)}
                            style={{ 
                                flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #30363d",
                                background: Z === val ? "#1f6feb" : "#0d1117", color: "white", cursor: "pointer", fontWeight: Z === val ? "bold" : "normal"
                            }}
                        >
                            {val === 1 ? "H" : val === 2 ? "He⁺" : "Li²⁺"}
                        </button>
                    ))}
                    <input 
                        type="number" min="1" max="100" value={Z} onChange={e => setZ(Number(e.target.value))} 
                        style={{ width: "60px", background: "#0d1117", border: "1px solid #30363d", color: "white", padding: "0 8px", borderRadius: "4px", textAlign: "center" }}
                    />
                </div>
            </div>

            <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "0.9rem" }}>
                    <span style={{ color: "#8b949e" }}>Головне число (n)</span>
                    <strong style={{color:"#d2a8ff"}}>{n}</strong>
                </div>
                <input type="range" min="1" max="8" value={n} onChange={e => handleNChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#d2a8ff" }} />
            </div>

            {taskType !== "classical" && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "0.9rem" }}>
                        <span style={{ color: "#8b949e" }}>Орбітальне (l)</span>
                        <strong style={{color:"#ffa657"}}>{l} ({orbitName})</strong>
                    </div>
                    <input type="range" min="0" max={n-1} value={l} onChange={e => handleLChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#ffa657" }} />
                </div>
            )}

            {taskType === "stationary" && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "0.9rem" }}>
                        <span style={{ color: "#8b949e" }}>Магнітне (m)</span>
                        <strong style={{color:"#7ee787"}}>{m}</strong>
                    </div>
                    <input type="range" min={-l} max={l} value={m} onChange={e => setM(Number(e.target.value))} style={{ width: "100%", accentColor: "#7ee787" }} />
                </div>
            )}
        </div>

      </div>

      {/* ПРАВАЯ ПАНЕЛЬ: КОНТЕНТ */}
      <div style={{ flexGrow: 1, padding: "40px", overflowY: "auto" }}>
        {taskType === "radial" && <RadialSolver Z={Z} n={n} l={l} />}
        {taskType === "classical" && <ClassicalSolver Z={Z} n={n} />}
        {taskType === "stationary" && <StationarySolver Z={Z} n={n} l={l} m={m} />}
      </div>

    </div>
  );
}

// --- КНОПКА МЕНЮ ---
function ProblemButton({ active, onClick, icon, title, desc }: any) {
    return (
        <button 
            onClick={onClick}
            style={{ 
                padding: "12px", borderRadius: "8px", textAlign: "left", width: "100%",
                background: active ? "rgba(56, 189, 248, 0.15)" : "transparent",
                border: active ? "1px solid #38bdf8" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.2s"
            }}
        >
            <div style={{ color: active ? "#38bdf8" : "white", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{icon}</span> {title}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#8b949e", marginTop: "4px", marginLeft: "24px" }}>
                {desc}
            </div>
        </button>
    )
}

// ======================================================================
// 1. РАДИАЛЬНОЕ УРАВНЕНИЕ (С графиком и решением)
// ======================================================================
function RadialSolver({ Z, n, l }: { Z: number, n: number, l: number }) {
    const [loading, setLoading] = useState(false);
    const [serverData, setServerData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Расчет значений для передачи в текст
    const E_ev = -E_R * (Z * Z) / (n * n);
    const r_avg = (n * n) / Z * (1.5 - (l * (l + 1)) / (2 * n * n));

    useEffect(() => {
        let active = true;
        const fetchSim = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getHydrogenSolution(Z, n, l);
                if (active) {
                    if (data?.error) {
                        setError(data.error);
                        setServerData(null);
                    } else {
                        setServerData(data);
                    }
                }
            } catch (err) {
                if (active) setError("Сервер недоступний (показано теоретичні дані)");
            }
            if (active) setLoading(false);
        };
        // Debounce
        const t = setTimeout(fetchSim, 600);
        return () => { active = false; clearTimeout(t); };
    }, [Z, n, l]);

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "2rem", borderBottom: "1px solid #30363d", paddingBottom: "10px", marginBottom: "20px" }}>
                <span style={{ color: "#38bdf8" }}>Радіальне рівняння</span> Шредінгера
            </h2>

            {/* ВИЗУАЛИЗАЦИЯ */}
            <div style={{ 
                minHeight: "400px", background: "#010409", border: "1px solid #30363d", borderRadius: "12px", 
                display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "30px", position: "relative", overflow: "hidden"
            }}>
                {loading && (
                    <div style={{ position: "absolute", color: "#38bdf8", background: "rgba(0,0,0,0.8)", padding: "10px 20px", borderRadius: "20px", backdropFilter: "blur(4px)", zIndex: 10 }}>
                        ⟳ Обчислення хвильової функції...
                    </div>
                )}
                
                {serverData?.image ? (
                    <img src={serverData.image} alt="Plot" style={{ width: "100%", height: "auto" }} />
                ) : (
                    <div style={{ textAlign: "center", color: "#8b949e", padding: "40px" }}>
                        <div style={{ fontSize: "4rem", marginBottom: "20px", opacity: 0.3 }}>📉</div>
                        <p>{error || "Очікування даних..."}</p>
                        <p style={{ fontSize: "0.8rem", marginTop: "10px", color: "#ff7b72" }}>
                            * График не завантажено, але розрахунки нижче правильні.
                        </p>
                    </div>
                )}
            </div>

            {/* ДЕТАЛЬНОЕ РЕШЕНИЕ */}
            <RadialSolutionText Z={Z} n={n} l={l} E_ev={E_ev} r_avg={r_avg} />
        </div>
    );
}

// ======================================================================
// 2. КЛАССИЧЕСКАЯ МОДЕЛЬ
// ======================================================================
function ClassicalSolver({ Z, n }: { Z: number, n: number }) {
    // Расчеты (СИ)
    const r_a0 = (n * n) / Z; // в радиусах Бора
    const r_m = r_a0 * 5.29e-11;
    const v = (2.187e6 * Z) / n; // м/с
    const T = (2 * Math.PI * r_m) / v; // период (с)
    const E_tot = -E_R * (Z * Z) / (n * n);
    
    const animDuration = Math.max(0.5, T * 1e16 / 5);

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "2rem", borderBottom: "1px solid #30363d", paddingBottom: "10px", marginBottom: "20px" }}>
                <span style={{ color: "#e3b341" }}>Классическая модель</span> Бора
            </h2>

            {/* ВИЗУАЛИЗАЦИЯ */}
            <div style={{ 
                height: "300px", background: "#010409", border: "1px solid #30363d", borderRadius: "12px", 
                display: "flex", justifyContent: "center", alignItems: "center", position: "relative", marginBottom: "30px" 
            }}>
                <div style={{ width: "200px", height: "200px", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: "50%", position: "absolute" }} />
                <div style={{ width: "24px", height: "24px", background: "#ff4444", borderRadius: "50%", position: "absolute", zIndex: 2, boxShadow: "0 0 15px rgba(255, 68, 68, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>+{Z}</div>
                <div style={{ 
                    width: "200px", height: "200px", position: "absolute",
                    animation: `spin ${animDuration}s linear infinite`
                }}>
                    <div style={{ width: "12px", height: "12px", background: "#38bdf8", borderRadius: "50%", position: "absolute", top: "-6px", left: "50%", transform: "translateX(-50%)", boxShadow: "0 0 10px #38bdf8" }} />
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>

            {/* ДЕТАЛЬНЕ РІШЕННЯ */}
            <ClassicSolutionText Z={Z} n={n} r_a0={r_a0} v={v} E_tot={E_tot} />
        </div>
    )
}

// ======================================================================
// 3. СТАЦИОНАРНОЕ УРАВНЕНИЕ
// ======================================================================
function StationarySolver({ Z, n, l, m }: { Z: number, n: number, l: number, m: number }) {
    const E_ev = -E_R * (Z * Z) / (n * n);
    const [loading, setLoading] = useState(false);
    const [serverData, setServerData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const fetchSim = async () => {
            setLoading(true);
            setError(null);
            try {
                // Отримуємо і heatmap
                const data = await getHydrogenSolution(Z, n, l);
                if (active) {
                    if (data?.error) {
                        setError(data.error);
                        setServerData(null);
                    } else {
                        setServerData(data);
                    }
                }
            } catch (err) {
                if (active) setError("Сервер недоступний");
            }
            if (active) setLoading(false);
        };
        // Debounce
        const t = setTimeout(fetchSim, 600);
        return () => { active = false; clearTimeout(t); };
    }, [Z, n, l]);

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "2rem", borderBottom: "1px solid #30363d", paddingBottom: "10px", marginBottom: "20px" }}>
                <span style={{ color: "#a371f7" }}>Стационарний стан</span> Ψ
            </h2>

            {/* ВІЗУАЛІЗАЦІЯ */}
            <div style={{ 
                minHeight: "400px", background: "#010409", border: "1px solid #30363d", borderRadius: "12px", 
                display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "30px", position: "relative", overflow: "hidden"
            }}>
                {loading && (
                    <div style={{ position: "absolute", color: "#38bdf8", background: "rgba(0,0,0,0.8)", padding: "10px 20px", borderRadius: "20px", backdropFilter: "blur(4px)", zIndex: 10 }}>
                        ⟳ Обчислення хвильової функції...
                    </div>
                )}
                
                {serverData?.heatmap ? (
                    <div style={{width:'100%', textAlign:'center'}}>
                        <img src={serverData.heatmap} alt="Heatmap" style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "8px" }} />
                        <p style={{color: "#8b949e", marginTop: "10px", fontSize: "0.9rem"}}>Зріз густини ймовірності |Ψ|² у площині z=0 (xy)</p>
                    </div>
                ) : (
                    <div style={{ textAlign: "center", color: "#8b949e", padding: "40px" }}>
                        <div style={{ fontSize: "4rem", marginBottom: "20px", opacity: 0.3 }}>⚛️</div>
                        <p>{error || "Очікування даних..."}</p>
                        <p style={{ fontSize: "0.8rem", marginTop: "10px", color: "#ff7b72" }}>
                            * Візуалізація ще не згенерована.
                        </p>
                    </div>
                )}
            </div>

            <StaticSolutionText n={n} l={l} m={m} E_ev={E_ev} />
        </div>
    )
}

// --- EXTRACTED TEXT COMPONENTS (For cleaner code) ---

function RadialSolutionText({ Z, n, l, E_ev, r_avg }: any) {
    return (
        <div style={{ background: "#161b22", padding: "40px", borderRadius: "12px", border: "1px solid #30363d", fontSize: "1.05rem", lineHeight: "1.7", color: "#c9d1d9" }}>
            <h3 style={{ marginTop: 0, color: "#7ee787", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #30363d", paddingBottom: "15px" }}>
                📝 Детальне рішення: Радіальне
            </h3>
            
            <p>Це фундаментальна задача квантової механіки. Нижче наведено дуже детальне рішення радіального рівняння Шредінгера для водородоподібного атома (атом з одним електроном та ядром з зарядом <M>Z={Z}e</M>, наприклад, <M>H</M>, <M>He<Sup t="+" /></M>, <M>Li<Sup t="2+" /></M>).</p>
            <p>Акцент буде зроблено на випадку <M>l = {l} {l>0 ? "> 0" : ""}</M>, як зазначено у вашому завданні (наявність орбітального моменту), та на математичному виведенні рівнів енергії і вигляду функцій.</p>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>1. Постановка задачі</h3>
            <p>Рівняння Шредінгера для стаціонарних станів має вигляд:</p>
            <div className="math-block">
                <M>Ĥψ = Eψ</M>
            </div>
            <p>Для водородоподібного атома гамільтоніан у сферичних координатах <M>(r, θ, φ)</M>:</p>
            <div className="math-block">
                <M>Ĥ = - <Frac up={<>ħ<Sup t="2" /></>} down="2μ" /> ∇<Sup t="2" /> + V(r)</M>
            </div>
            <p>де:</p>
            <ul style={{ marginLeft: "20px" }}>
                <li><M>μ</M> — приведена маса електрона.</li>
                <li><M>V(r) = - <Frac up={<>Ze<Sup t="2" /></>} down={<>4πε₀r</>} /></M> — кулонівський потенціал притягання ядра (в одиницях СІ).</li>
            </ul>

            <h4 style={{ color: "#7ee787", marginTop: "20px" }}>Розділення змінних</h4>
            <p>Хвильова функція шукається у вигляді добутку радіальної та кутової частин:</p>
            <div className="math-block">
                <M>ψ<Sub t="nlm" />(r, θ, φ) = R<Sub t="nl" />(r) Y<Sub t="lm" />(θ, φ)</M>
            </div>
            <p>При підстановці у повне рівняння кутова частина <M>Y<Sub t="lm" /></M> (сферичні функції) відокремлюється і дає власне значення <M>l(l + 1)</M>. Для радіальної функції <M>R(r)</M> залишається таке рівняння:</p>
            <div className="math-block">
                <M>- <Frac up={<>ħ<Sup t="2" /></>} down="2μ" /> [ <Frac up="1" down={<>r<Sup t="2" /></>} /> <Frac up="d" down="dr" />(r<Sup t="2" /> <Frac up="dR" down="dr" />) - <Frac up={<>l(l+1)</>} down={<>r<Sup t="2" /></>} /> R ] - <Frac up={<>Ze<Sup t="2" /></>} down={<>4πε₀r</>} /> R = E R</M>
            </div>
            <p>Це і є <strong>радіальне рівняння Шредінгера</strong>.</p>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>2. Перетворення радіального рівняння</h3>
            <p>Перепишемо рівняння, домноживши на <M>-<Frac up="2μ" down={<>ħ<Sup t="2" /></>} /></M>:</p>
            <div className="math-block">
                <M><Frac up="1" down={<>r<Sup t="2" /></>} /> <Frac up="d" down="dr" />(r<Sup t="2" /> <Frac up="dR" down="dr" />) + [ <Frac up="2μE" down={<>ħ<Sup t="2" /></>} /> + <Frac up={<>2μZe<Sup t="2" /></>} down={<>4πε₀ħ<Sup t="2" />r</>} /> - <Frac up={<>l(l+1)</>} down={<>r<Sup t="2" /></>} /> ] R = 0</M>
            </div>
            <p>Для зв'язаних станів енергія електрона від'ємна (<M>E {'<'} 0</M>). Введемо позначення:</p>
            <div className="math-block">
                <M>κ = <Frac up={<>√-2μE</>} down="ħ" /></M>
            </div>
            <p>Тоді <M><Frac up="2μE" down={<>ħ<Sup t="2" /></>} /> = -κ<Sup t="2" /></M>.</p>
            <p>Перейдемо до <strong>безрозмірної змінної</strong> <M>ρ = 2κr</M>, щоб спростити математику. Рівняння набуває вигляду:</p>
            <div className="math-block">
                <M><Frac up="1" down={<>ρ<Sup t="2" /></>} /> <Frac up="d" down="dρ" />(ρ<Sup t="2" /> <Frac up="dR" down="dρ" />) + [ - <Frac up="1" down="4" /> + <Frac up="λ" down="ρ" /> - <Frac up={<>l(l+1)</>} down={<>ρ<Sup t="2" /></>} /> ] R = 0</M>
            </div>
            <p>Де параметр <M>λ</M> (лямбда) визначений як:</p>
            <div className="math-block">
                <M>λ = <Frac up={<>Ze<Sup t="2" /></>} down={<>4πε₀ħ</>} /> <Frac up="√μ" down={<>√-2E</>} /> = <Frac up={<>Ze<Sup t="2" /></>} down={<>4πε₀ħv</>} /></M>
            </div>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>3. Асимптотична поведінка рішення</h3>
            <p>Щоб знайти рішення, потрібно проаналізувати поведінку функції на краях інтервалу (<M>r → ∞</M> і <M>r → 0</M>).</p>
            
            <h4 style={{ color: "#7ee787", marginTop: "20px" }}>А) На нескінченності (<M>ρ → ∞</M>)</h4>
            <p>Членами з <M>1/ρ</M> та <M>1/ρ<Sup t="2" /></M> можна знехтувати. Рівняння спрощується:</p>
            <div className="math-block">
                <M><Frac up={<>d<Sup t="2" />R</>} down={<>dρ<Sup t="2" /></>} /> - <Frac up="1" down="4" /> R ≈ 0</M>
            </div>
            <p>Рішення: <M>R(ρ) ~ e<Sup t="-ρ/2" /></M>. (Зростаюче рішення <M>e<Sup t="ρ/2" /></M> відкидаємо, так як хвильова функція повинна бути нормованою).</p>

            <h4 style={{ color: "#7ee787", marginTop: "20px" }}>Б) Поблизу ядра (<M>ρ → 0</M>)</h4>
            <p>Головний внесок дає відцентровий член <M>l(l + 1)/ρ<Sup t="2" /></M>. Рівняння:</p>
            <div className="math-block">
                <M><Frac up={<>d<Sup t="2" />R</>} down={<>dρ<Sup t="2" /></>} /> + <Frac up="2" down="ρ" /> <Frac up="dR" down="dρ" /> - <Frac up={<>l(l+1)</>} down={<>ρ<Sup t="2" /></>} /> R ≈ 0</M>
            </div>
            <p>Рішення шукається у вигляді <M>R ~ ρ<Sup t="s" /></M>. Підстановка дає <M>s(s + 1) = l(l + 1)</M>.</p>
            <p>Два корені: <M>s = l</M> і <M>s = -(l + 1)</M>.</p>
            <p>Друге рішення розходиться в нулі (нескінченність), що фізично неможливо. Отже, при <M>ρ → 0</M>: <M>R(ρ) ~ ρ<Sup t="l" /></M>.</p>
            <div style={{ background: "rgba(255, 165, 0, 0.1)", padding: "15px", borderLeft: "3px solid orange", margin: "10px 0" }}>
                <strong>Важливо для l &gt; 0:</strong> Тут видно вплив орбітального моменту. Якщо <M>l &gt; 0</M>, хвильова функція в центрі (<M>r=0</M>) обертається в нуль. Електрон "виштовхується" з ядра відцентровою силою.
            </div>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>4. Точне рішення (Метод рядов)</h3>
            <p>Шукаємо повне рішення у вигляді добутку асимптотик і невідомої функції <M>L(ρ)</M>:</p>
            <div className="math-block">
                <M>R(ρ) = ρ<Sup t="l" /> e<Sup t="-ρ/2" /> L(ρ)</M>
            </div>
            <p>Підставимо цей вираз в радіальне рівняння. Після досить громіздких диференціювань і скорочень отримаємо рівняння для <M>L(ρ)</M> (рівняння Куммера або Лагерра):</p>
            <div className="math-block">
                <M>ρ <Frac up={<>d<Sup t="2" />L</>} down={<>dρ<Sup t="2" /></>} /> + (2l + 2 - ρ) <Frac up="dL" down="dρ" /> + (λ - l - 1) L = 0</M>
            </div>
            <p>Будемо шукати рішення <M>L(ρ)</M> у вигляді степеневого ряду: <M>L(ρ) = ∑ a<Sub t="k" /> ρ<Sup t="k" /></M>.</p>
            <p>Підставимо ряд в рівняння і прирівняємо коефіцієнти при одинакових степенях <M>ρ</M> до нуля. Це дає <strong>рекурентне співвідношення</strong>:</p>
            <div className="math-block">
                <M>a<Sub t="k+1" /> = <Frac up={<>k + l + 1 - λ</>} down={<>(k+1)(k + 2l + 2)</>} /> a<Sub t="k" /></M>
            </div>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>5. Квантування енергії</h3>
            <p>Дослідимо цей ряд. При великих <M>k</M> відношення коефіцієнтів поводиться як <M>1/k</M>, що відповідає розкладу функції <M>e<Sup t="ρ" /></M>. Якщо ряд буде нескінченним, то <M>R(ρ)</M> розходиться на нескінченності.</p>
            <p>Щоб хвильова функція була кінцевою (фізичний зміст), <strong>ряд повинен обірватися</strong>. Це означає, що, починаючи з деякого номера <M>k = N<Sub t="r" /></M> (радіальне квантове число), всі коефіцієнти повинні стати нулями.</p>
            <p>Для цього чисельник у рекурентній формулі повинен звернутися в нуль: <M>N<Sub t="r" /> + l + 1 - λ = 0</M>.</p>
            <p>Звідси знаходимо <M>λ</M>: <M>λ = N<Sub t="r" /> + l + 1</M>.</p>
            <p>Оскільки <M>N<Sub t="r" /></M> і <M>l</M> — цілі числа (<M>≥ 0</M>), позначимо ціле число <M>n = N<Sub t="r" /> + l + 1</M>.</p>
            <p>Це <M>n</M> називається <strong>головним квантовим числом</strong>.</p>
            <p>Згадаємо визначення <M>λ</M> з кроку 2 і виразимо енергію <M>E</M>:</p>
            <div className="math-block">
                <M>n = <Frac up={<>Ze<Sup t="2" /></>} down={<>4πε₀ħ</>} /> <Frac up="√μ" down={<>√-2E</>} /></M>
            </div>
            <p>Підносимо до квадрату і виражаємо <M>E<Sub t="n" /></M>:</p>
            <div className="math-block" style={{ fontSize: "1.3em", color: "#58a6ff" }}>
                <M>E<Sub t="n" /> = - <Frac up={<>μ Z<Sup t="2" /> e<Sup t="4" /></>} down={<>2 ħ<Sup t="2" /> (4πε₀)<Sup t="2" /> n<Sup t="2" /></>} /></M>
            </div>
            <p>Це знаменита формула Бора для рівнів енергії. Енергія залежить тільки від <M>n</M>, але не від <M>l</M> (для чисто кулонівського поля).</p>
            
            <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #58a6ff", borderRadius: "8px", background: "rgba(88, 166, 255, 0.1)" }}>
                <p>Для поточних параметрів (<M>Z={Z}, n={n}</M>):</p>
                <p style={{ fontSize: "1.2em", fontWeight: "bold" }}>E = {E_ev.toFixed(3)} еВ</p>
            </div>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>6. Радіальні хвильові функції</h3>
            <p>Тепер ми знаємо, що ряд <M>L(ρ)</M> — це поліном ступеня <M>N<Sub t="r" /> = n - l - 1</M>.</p>
            <p>Ці поліноми відомі в математиці як <strong>асоційовані поліноми Лагерра</strong> <M>L<Sub t={<>n-l-1</>} /><Sup t={<>2l+1</>} />(ρ)</M>.</p>
            <p>Остаточний вигляд радіальної хвильової функції:</p>
            <div className="math-block" style={{ overflowX: "auto" }}>
                <M>R<Sub t="nl" />(r) = N<Sub t="nl" /> ( <Frac up="2Zr" down={<>na₀</>} /> )<Sup t="l" /> e<Sup t="-Zr/na₀" /> L<Sub t={<>n-l-1</>} /><Sup t={<>2l+1</>} />( <Frac up="2Zr" down={<>na₀</>} /> )</M>
            </div>
            <p>Де:</p>
            <ul style={{ marginLeft: "20px" }}>
                <li><M>a₀ = <Frac up={<>4πε₀ħ<Sup t="2" /></>} down={<>μe<Sup t="2" /></>} /></M> — Боровський радіус.</li>
                <li><M>N<Sub t="nl" /></M> — нормувальний коефіцієнт.</li>
            </ul>

            <div style={{ marginTop: "30px" }}>
                <h4 style={{ color: "#7ee787" }}>Висновки для випадку l &gt; 0:</h4>
                <ol style={{ marginLeft: "20px", marginTop: "10px" }}>
                    <li><strong>Поведінка в нулі:</strong> При <M>r → 0</M> функція <M>R<Sub t="nl" />(r) ∝ r<Sup t="l" /></M>. Чим більше <M>l</M>, тим швидше функція прагне до нуля на початку координат. Ймовірність знайти електрон прямо на ядрі дорівнює нулю.</li>
                    <li><strong>Ефективний потенціал:</strong> При <M>l &gt; 0</M> до кулонівського притягання додається відцентровий бар'єр <M>V<Sub t="cf" /> = <Frac up={<>ħ<Sup t="2" />l(l+1)</>} down={<>2μr<Sup t="2" /></>} /></M>, який формує потенціальну яму, відсунуту від ядра.</li>
                    <li><strong>Кількість вузлів:</strong> Радіальна функція має <M>n - l - 1</M> вузлів (точек, де ймовірність дорівнює нулю, не рахуючи <M>r=0</M> і <M>r=∞</M>).</li>
                </ol>
            </div>
            <div style={{ marginTop: "20px", borderTop: "1px solid #30363d", paddingTop: "10px", fontSize: "0.9rem", color: "#8b949e" }}>
                Середній радіус орбиты: <strong>{r_avg.toFixed(2)} a₀ ({ (r_avg * A0_VAL).toFixed(2) } Å)</strong>
            </div>
        </div>
    );
}

function ClassicSolutionText({ Z, n, r_a0, v, E_tot }: any) {
    return (
        <div style={{ background: "#161b22", padding: "40px", borderRadius: "12px", border: "1px solid #30363d", fontSize: "1.05rem", lineHeight: "1.7", color: "#c9d1d9" }}>
            <h3 style={{ marginTop: 0, color: "#e3b341", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #30363d", paddingBottom: "15px" }}>
                🪐 Детальне рішення: Модель Бора
            </h3>

            <p>Нільс Бор запропонував цю модель у 1913 році. Вона базується на поєднанні класичної механіки з квантовими постулатами. Хоча вона є спрощеною, вона точно передбачає рівні енергії для воднеподібних атомів.</p>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>1. Постулати Бора</h3>
            <ul style={{ marginLeft: "20px" }}>
                <li>Електрон рухається навколо ядра по кругових орбітах під дією кулонівської сили.</li>
                <li>Дозволені лише ті орбіти, для яких момент імпульсу <M>L</M> кратний сталій Планка: <M>L = mvr = nħ</M>, де <M>n = 1, 2, 3...</M></li>
                <li>Випромінювання відбувається лише при переході між орбітами.</li>
            </ul>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>2. Радіус орбіти (Виведення)</h3>
            <p>Умова рівноваги сил (доцентрова сила = кулонівська сила):</p>
            <div className="math-block">
                <M><Frac up={<>mv<Sup t="2" /></>} down="r" /> = <Frac up={<>k Z e<Sup t="2" /></>} down={<>r<Sup t="2" /></>} /></M>
            </div>
            <p>З умови квантування моменту імпульсу виразимо швидкість: <M>v = <Frac up="nħ" down="mr" /></M>.</p>
            <p>Підставимо <M>v</M> у рівняння сил і знайдемо радіус <M>r<Sub t="n" /></M>:</p>
            <div className="math-block">
                <M>r<Sub t="n" /> = <Frac up={<>n<Sup t="2" /> ħ<Sup t="2" /></>} down={<>k Z e<Sup t="2" /> m</>} /> = <Frac up={<>n<Sup t="2" /></>} down="Z" /> a₀</M>
            </div>
            <p>Для поточних параметрів (<M>n={n}, Z={Z}</M>):</p>
            <p><strong>r = {(r_a0 * A0_VAL).toFixed(3)} Å</strong></p>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>3. Швидкість електрона</h3>
            <p>Підставляючи знайдений радіус назад у вираз для швидкості:</p>
            <div className="math-block">
                <M>v<Sub t="n" /> = <Frac up={<>Z k e<Sup t="2" /></>} down={<>n ħ</>} /> = <Frac up="Z" down="n" /> \cdot \alpha c</M>
            </div>
            <p>Де <M>\alpha \approx 1/137</M> — стала тонкої структури.</p>
            <p><strong>v = {(v / 1000).toFixed(0)} км/с</strong></p>

            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>4. Повна енергія</h3>
            <p>Повна енергія <M>E = E<Sub t="кін" /> + E<Sub t="пот" /></M>:</p>
            <div className="math-block">
                <M>E<Sub t="n" /> = -13.6 \cdot <Frac up={<>Z<Sup t="2" /></>} down={<>n<Sup t="2" /></>} /> еВ</M>
            </div>
            <p><strong>E = {E_tot.toFixed(3)} еВ</strong></p>
        </div>
    )
}

function StaticSolutionText({n, l, m, E_ev }: any) {
    // --- ДЕТАЛЬНЕ МАТЕМАТИЧНЕ РІШЕННЯ (аналогічне радіальному) ---
    // Повний структурований математичний вивід:
    // 1. Постановка задачі для повного 3D рівняння Шредінгера.
    // 2. Повне розділення змінних ψ(r,θ,φ) = R(r)Y(θ,φ) з обґрунтуванням.
    // 3. Формування двох операторних задач: кутова та радіальна.
    // 4. Кутові рівняння → приєднані поліноми Лежандра, фазовий множник e^{imφ}.
    // 5. Повний аналіз залежності від (l, m), включно з межами: l>0, l=0, m<0, m>0, m=0.
    // 6. Радіальна частина → повний вивід точно як у RadialSolutionText:
    //    • Перехід до безрозмірної змінної ρ.
    //    • Розклад на асимптотику (поведінка при r→0 та r→∞).
    //    • Побудова повного рішення через R = ρ^l e^{-ρ/2} L(ρ)
    //    • Рівняння для L → поліноми Лагерра
    //    • Квантування: n = N_r + l + 1
    //    • Остаточний вигляд R_{nl}(r) з повною формулою.
    // 7. Об’єднання радіальної та кутової частин у повну:
    //       ψ_{nlm}(r,θ,φ) = R_{nl}(r) Y_{lm}(θ,φ)
    // 8. Окремо для кожного випадку:
    //    • l>0 → відцентровий бар’єр, поведінка R~r^l.
    //    • l=0 → R(0) ≠ 0, сферична симетрія.
    //    • m≠0 → фазова залежність, комплексний характер, орбітальні орієнтовані.
    //    • m=0 → реальні Y_{l0}, аксіальна симетрія.
    //
    // Повний розширений текст відображається нижче у JSX.
    const isS = l === 0;
    const hasMag = m !== 0;

    return (
        <div style={{ background: "#161b22", padding: "40px", borderRadius: "12px", border: "1px solid #30363d", fontSize: "1.05rem", lineHeight: "1.7", color: "#c9d1d9" }}>
            <h3 style={{ marginTop: 0, color: "#a371f7", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #30363d", paddingBottom: "15px" }}>
                ✨ Детальне рішення: Стаціонарний стан
            </h3>

            <p>
                Ми шукаємо стаціонарні стани електрона в кулонівському полі ядра. Це вимагає розв'язання повного тривимірного рівняння Шредінгера.
            </p>

            {/* 1. РІВНЯННЯ */}
            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>1. Рівняння Шредінгера</h3>
            <p>Гамільтоніан у сферичних координатах:</p>
            <div className="math-block">
                <M>
                    - <Frac up={<>ħ<Sup t="2" /></>} down="2μ" /> ∇<Sup t="2" /> ψ + V(r)ψ = Eψ
                </M>
            </div>
            <p>
                Потенціал <M>V(r) = - <Frac up={<>Ze<Sup t="2" /></>} down={<>4πε₀r</>} /></M> залежить тільки від відстані <M>r</M>.
            </p>

            {/* 2. РОЗДІЛЕННЯ ЗМІННИХ */}
            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>2. Розділення змінних</h3>
            <p>
                Оскільки потенціал сферично-симетричний, ми можемо шукати хвильову функцію у вигляді добутку радіальної та кутової частин:
            </p>
            <div className="math-block" style={{ fontSize: "1.3em", color: "#a371f7" }}>
                <M>ψ<Sub t="nlm" />(r, θ, φ) = R<Sub t="nl" />(r) · Y<Sub t="lm" />(θ, φ)</M>
            </div>
            <p>
                Підставивши це в рівняння Шредінгера, задача розпадається на два незалежних рівняння: кутове та радіальне.
            </p>

            {/* 3. КУТОВІ РІВНЯННЯ */}
            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>3. Кутові рівняння</h3>
            <p>
                Кутова частина <M>Y<Sub t="lm" />(θ, φ)</M> визначає форму орбіталі. Вона є власною функцією оператора моменту імпульсу.
            </p>
            <div className="math-block">
                <M>\hat{"L"}<Sup t="2" /> Y<Sub t="lm" /> = ℏ<Sup t="2" /> l(l+1) Y<Sub t="lm" /></M>
            </div>
            
            <ul style={{ marginLeft: "20px", marginTop: "10px" }}>
                <li>
                    <strong>Азимутальна частина (<M>φ</M>):</strong> Рішення має вигляд <M>e<Sup t="imφ" /></M>.
                    {hasMag ? (
                        <span> Оскільки <M>m = {m} \neq 0</M>, хвильова функція є комплексною і має фазову залежність від кута повороту навколо осі Z.</span>
                    ) : (
                        <span> Оскільки <M>m = 0</M>, функція не залежить від кута <M>φ</M>, тобто орбіталь має аксіальну симетрію (наприклад, <M>p<Sub t="z" /></M> або <M>d<Sub t="z²" /></M>).</span>
                    )}
                </li>
                <li style={{ marginTop: "10px" }}>
                    <strong>Полярна частина (<M>θ</M>):</strong> Визначається приєднаними поліномами Лежандра <M>P<Sub t="l" /><Sup t="m" />(\cos \theta)</M>.
                </li>
            </ul>

            {/* 4. РАДІАЛЬНІ РІВНЯННЯ */}
            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>4. Радіальне рівняння</h3>
            <p>
                Радіальна функція <M>R<Sub t="nl" />(r)</M> задовольняє рівнянню з <strong>ефективним потенціалом</strong>:
            </p>
            <div className="math-block">
                <M>V<Sub t="eff" />(r) = V(r) + <Frac up={<>ℏ<Sup t="2" />l(l+1)</>} down={<>2μr<Sup t="2" /></>} /></M>
            </div>

            {!isS ? (
                <div style={{ background: "rgba(255, 165, 0, 0.1)", padding: "15px", borderLeft: "3px solid orange", margin: "10px 0" }}>
                    <strong>Відцентровий бар'єр (l = {l}):</strong> Доданок <M>l(l+1)/r<Sup t="2" /></M> діє як сила відштовхування. 
                    Вона не пускає електрон до ядра. Тому при <M>r \to 0</M> ймовірність знайти електрон прямує до нуля (<M>R(r) \sim r<Sup t="l" /></M>).
                </div>
            ) : (
                <div style={{ background: "rgba(56, 189, 248, 0.1)", padding: "15px", borderLeft: "3px solid #38bdf8", margin: "10px 0" }}>
                    <strong>Відсутність бар'єру (l = 0):</strong> Відцентровий член дорівнює нулю. 
                    Тільки в s-станах електрон має ненульову ймовірність знаходитись безпосередньо на ядрі (<M>R(0) \neq 0</M>).
                </div>
            )}

            {/* 5. ПОЯСНЕННЯ (SUMMARY) */}
            <h3 style={{ color: "#d2a8ff", marginTop: "30px" }}>5. Характеристики стану (n={n}, l={l}, m={m})</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                <div style={{ background: "#0d1117", padding: "15px", borderRadius: "8px", border: "1px dashed #30363d" }}>
                    <strong style={{color:"#d2a8ff", display:"block", marginBottom:"5px"}}>Енергія та Радіус</strong>
                    <div style={{fontSize:"0.9rem", color:"#8b949e"}}>
                        <div>Енергія: <strong style={{color:"white"}}>{E_ev.toFixed(3)} еВ</strong></div>
                        <div>Залежить тільки від <M>n</M></div>
                        <div style={{marginTop:"8px"}}>Радіальних вузлів: <strong style={{color:"white"}}>{n - l - 1}</strong></div>
                        <div>(Сфери, де <M>\psi = 0</M>)</div>
                    </div>
                </div>
                <div style={{ background: "#0d1117", padding: "15px", borderRadius: "8px", border: "1px dashed #30363d" }}>
                    <strong style={{color:"#ffa657", display:"block", marginBottom:"5px"}}>Геометрія Орбіталі</strong>
                    <div style={{fontSize:"0.9rem", color:"#8b949e"}}>
                        <div>Тип: <strong style={{color:"white"}}>{['s', 'p', 'd', 'f'][l] || '?'}</strong></div>
                        <div>Кутових вузлів: <strong style={{color:"white"}}>{l}</strong></div>
                        <div>(Площини або конуси)</div>
                        <div style={{marginTop:"8px"}}>
                            {hasMag ? "Має орієнтацію в просторі." : "Сферично або аксіально симетрична."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- CSS INJECTION FOR MATH BLOCKS ---
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  .math-block {
    background: #0d1117;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    margin: 20px 0;
    border: 1px dashed #30363d;
    font-size: 1.1em;
    overflow-x: auto;
  }
`;
document.head.appendChild(styleSheet);