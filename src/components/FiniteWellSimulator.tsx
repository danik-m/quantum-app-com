import { useState } from "react";
import { 
  getFiniteWellPlot, 
  getInfiniteWellPlot,
} from "../api/quantum";

export default function FiniteWellSimulator() {
  // --- СТАН ПАРАМЕТРІВ ---
  const [wellType, setWellType] = useState("finite"); // 'finite' або 'infinite'
  const [particle, setParticle] = useState("electron");
  
  const [U0, setU0] = useState(50);      // Глибина ями (еВ)
  const [L_nm, setL_nm] = useState(1.0); // Ширина ями (нм)
  const [n, setN] = useState(1);         // Квантове число (рівень енергії)

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- ЛОГІКА ОНОВЛЕННЯ ---
  async function update() {
    setLoading(true);
    const L_m = L_nm * 1e-9; // Конвертація нм -> м

    // Вибір маси частинки
    let mass = 9.109e-31;
    if (particle === "muon") mass = 206.768 * 9.109e-31;
    if (particle === "proton") mass = 1.6726219e-27;

    let imgUrl: string | null = null;

    try {
      if (wellType === "finite") {
        imgUrl = await getFiniteWellPlot(mass, L_m, U0, n);
      } else {
        imgUrl = await getInfiniteWellPlot(mass, L_m, n);
      }
      setImage(imgUrl);
    } catch (e) {
      console.error("Помилка отримання графіка:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", minHeight: "100vh", background: "#0E1117", color: "white" }}>
      
      {/* --- ЛІВА ПАНЕЛЬ НАЛАШТУВАНЬ --- */}
      <div style={{ 
        width: "320px", 
        background: "#161b22", 
        padding: "20px", 
        borderRight: "1px solid #30363d", 
        display: "flex", 
        flexDirection: "column", 
        gap: "20px",
        flexShrink: 0
      }}>
        <h3 style={{ borderBottom: "1px solid #30363d", paddingBottom: "10px", color: "#58a6ff", marginTop: 0 }}>
          Потенціальні Ями
        </h3>

        {/* Тип ями */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Тип ями:
          </label>
          <select 
            style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }}
            value={wellType} 
            onChange={(e) => {
              setWellType(e.target.value);
              setImage(null);
            }}
          >
            <option value="finite">Кінцева яма</option>
            <option value="infinite">Нескінченна яма</option>
          </select>
        </div>

        {/* Частинка */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Частинка:
          </label>
          <select 
            style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }}
            value={particle} 
            onChange={(e) => setParticle(e.target.value)}
          >
            <option value="electron">Електрон</option>
            <option value="muon">Мюон</option>
            <option value="proton">Протон</option>
          </select>
        </div>

        {/* Ширина ями */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Ширина ями L (нм):
          </label>
          <input 
            type="range" min={0.1} max={5.0} step={0.1} value={L_nm} 
            style={{ width: "100%", cursor: "pointer" }} 
            onChange={(e) => setL_nm(Number(e.target.value))} 
          />
          <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>{L_nm.toFixed(2)} нм</div>
        </div>

        {/* Глибина ями (тільки для кінцевої) */}
        {wellType === "finite" && (
          <div>
            <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
              Глибина ями U₀ (еВ):
            </label>
            <input 
              type="number" value={U0} 
              style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }}
              onChange={(e) => setU0(Number(e.target.value))} 
            />
          </div>
        )}

        {/* Квантове число */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Квантове число n:
          </label>
          <input 
            type="range" min={1} max={10} value={n} 
            style={{ width: "100%", cursor: "pointer" }} 
            onChange={(e) => setN(Number(e.target.value))} 
          />
          <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>n = {n}</div>
        </div>

        {/* Кнопка оновлення */}
        <button 
          onClick={update} 
          disabled={loading}
          style={{ 
            marginTop: "10px", padding: "12px", background: loading ? "#238636aa" : "#238636", color: "white", 
            border: "none", borderRadius: "6px", cursor: loading ? "wait" : "pointer", fontWeight: "bold", fontSize: "16px",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.background = "#2ea043")}
          onMouseOut={(e) => !loading && (e.currentTarget.style.background = "#238636")}
        >
          {loading ? "Завантаження..." : "Побудувати графік"}
        </button>

      </div>

      {/* --- ОСНОВНА ЧАСТИНА З ГРАФІКОМ --- */}
      <div style={{ flexGrow: 1, padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
        
        <h2 style={{ marginBottom: "30px", textAlign: "center", fontSize: "2rem" }}>
          {wellType === "finite" ? "Кінцева потенціальна яма" : "Нескінченна потенціальна яма"}
        </h2>

        <div style={{ 
          width: "100%", maxWidth: "1000px", 
          background: "#0d1117", border: "2px solid #30363d", 
          borderRadius: "12px", padding: "10px", 
          minHeight: "500px", 
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(0,0,0,0.3)"
        }}>
          {image ? (
            <img 
              src={image} 
              alt="Quantum Well Plot" 
              style={{ width: "100%", height: "auto", borderRadius: "8px" }} 
            />
          ) : (
            <div style={{ color: "#8b949e", textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📊</div>
              <p style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Графік відсутній</p>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                Натисніть "Побудувати графік", щоб побачити хвильову функцію та рівні енергії.
              </p>
            </div>
          )}
        </div>

        {/* ОПИС МОДЕЛІ (Вбудований, без зовнішніх імпортів) */}
        <div style={{ marginTop: "40px", maxWidth: "800px", background: "#161b22", padding: "25px", borderRadius: "12px", border: "1px solid #30363d", color: "#c9d1d9", lineHeight: "1.6" }}>
          <h3 style={{ color: "#58a6ff", marginTop: 0, borderBottom: "1px solid #30363d", paddingBottom: "10px", marginBottom: "15px" }}>
            Опис моделі
          </h3>

          {wellType === "finite" ? (
            <>
              <h4 style={{color: "white", marginBottom: "5px"}}>1. Основні властивості:</h4>
              <p>
                Кінцева потенціальна яма — це більш реалістична модель, ніж нескінченна. 
                Головна особливість: хвильова функція <strong>проникає</strong> у стінки (бар'єр), навіть якщо енергія частинки менша за висоту стінок ($E &lt; U_0$). 
                Це явище називається квантовим тунелюванням.
              </p>

              <h4 style={{color: "white", marginBottom: "5px", marginTop: "15px"}}>2. Рівні енергії:</h4>
              <p>
                Рівні енергії знаходяться шляхом розв'язання трансцендентних рівнянь. Кількість зв'язаних станів є скінченною і залежить від глибини ями $U_0$ та ширини $L$.
              </p>

              <h4 style={{color: "white", marginBottom: "5px", marginTop: "15px"}}>3. Межі потенціалу U(x):</h4>
              <pre style={{background: "#0d1117", padding: "10px", borderRadius: "6px", overflowX: "auto", fontFamily: "monospace", border: "1px solid #30363d"}}>
{`U(x) = 0,         0 < x < L
U(x) = U₀,      x < 0 або x > L`}
              </pre>
            </>
          ) : (
            <>
              <h4 style={{color: "white", marginBottom: "5px"}}>1. Основні властивості:</h4>
              <p>
                Стінки мають нескінченно високий потенціал. Частинка суворо замкнена всередині ями. 
                Ймовірність знайти частинку за межами ями дорівнює нулю ($\Psi = 0$ на стінках).
              </p>

              <h4 style={{color: "white", marginBottom: "5px", marginTop: "15px"}}>2. Рівні енергії:</h4>
              <p>
                Енергія квантується строго за формулою $E_n \sim n^2$. Кількість рівнів — нескінченна.
              </p>

              <h4 style={{color: "white", marginBottom: "5px", marginTop: "15px"}}>3. Межі потенціалу U(x):</h4>
              <pre style={{background: "#0d1117", padding: "10px", borderRadius: "6px", overflowX: "auto", fontFamily: "monospace", border: "1px solid #30363d"}}>
{`U(x) = 0,          0 < x < L
U(x) = ∞,        x ≤ 0 або x ≥ L`}
              </pre>
            </>
          )}
        </div>

      </div>
    </div>
  );
}