import { useState } from "react";
import { 
  getStepBarrierPlot, 
  getRectBarrierPlot, 
  getDoubleBarrierPlot 
} from "../api/quantum";

export default function BarrierSimulator() {
  // --- СТАН ПАРАМЕТРІВ ---
  const [barrierType, setBarrierType] = useState("step"); // step, rect, double
  const [particle, setParticle] = useState("electron");
  
  const [E, setE] = useState(5.0);   // Енергія частинки (еВ)
  const [U0, setU0] = useState(10.0); // Висота бар'єра (еВ)
  const [L_nm, setL_nm] = useState(1.0); // Ширина бар'єра (нм)
  const [d_nm, setD_nm] = useState(0.5); // Відстань між бар'єрами (нм)

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- ЛОГІКА ОНОВЛЕННЯ ---
  async function update() {
    setLoading(true);
    const L_m = L_nm * 1e-9;
    const d_m = d_nm * 1e-9;

    // Визначаємо масу
    let mass = 9.109e-31;
    if (particle === "muon") mass = 206.768 * 9.109e-31;
    if (particle === "proton") mass = 1.6726219e-27;

    let imgUrl: string | null = null;

    try {
      if (barrierType === "step") {
        imgUrl = await getStepBarrierPlot(mass, E, U0);
      } else if (barrierType === "rect") {
        imgUrl = await getRectBarrierPlot(mass, E, U0, L_m);
      } else if (barrierType === "double") {
        imgUrl = await getDoubleBarrierPlot(mass, E, U0, L_m, d_m);
      }
      setImage(imgUrl);
    } catch (e) {
      console.error("Помилка завантаження графіка:", e);
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
        flexShrink: 0,
        overflowY: "auto"
      }}>
        <h3 style={{ borderBottom: "1px solid #30363d", paddingBottom: "10px", color: "#58a6ff", marginTop: 0 }}>
          Квантові Бар'єри
        </h3>

        {/* Тип бар'єра */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Тип перешкоди:
          </label>
          <select 
            style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }}
            value={barrierType} 
            onChange={(e) => {
              setBarrierType(e.target.value);
              setImage(null); // Скидаємо графік при зміні типу
            }}
          >
            <option value="step">Потенціальна сходинка</option>
            <option value="rect">Прямокутний бар'єр</option>
            <option value="double">Подвійний бар'єр</option>
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

        {/* Енергія частинки */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Енергія частинки E (еВ):
          </label>
          <input 
            type="number" step="0.1" value={E} 
            style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }}
            onChange={(e) => setE(Number(e.target.value))} 
          />
        </div>

        {/* Висота бар'єра */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Висота бар'єра U₀ (еВ):
          </label>
          <input 
            type="number" step="0.1" value={U0} 
            style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }}
            onChange={(e) => setU0(Number(e.target.value))} 
          />
        </div>

        {/* Ширина бар'єра (тільки для rect та double) */}
        {barrierType !== "step" && (
          <div>
            <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
              Ширина бар'єра L (нм):
            </label>
            <input 
              type="range" min={0.1} max={5.0} step={0.1} value={L_nm} 
              style={{ width: "100%", cursor: "pointer" }} 
              onChange={(e) => setL_nm(Number(e.target.value))} 
            />
            <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>{L_nm.toFixed(2)} нм</div>
          </div>
        )}

        {/* Відстань між бар'єрами (тільки для double) */}
        {barrierType === "double" && (
          <div>
            <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
              Відстань d (нм):
            </label>
            <input 
              type="range" min={0.1} max={5.0} step={0.1} value={d_nm} 
              style={{ width: "100%", cursor: "pointer" }} 
              onChange={(e) => setD_nm(Number(e.target.value))} 
            />
            <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>{d_nm.toFixed(2)} нм</div>
          </div>
        )}

        {/* Кнопка */}
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
          {barrierType === "step" ? "Потенціальна сходинка" : 
           barrierType === "rect" ? "Прямокутний бар'єр" : 
           "Подвійний бар'єр (Тунельний ефект)"}
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
              alt="Simulation Result" 
              style={{ width: "100%", height: "auto", borderRadius: "8px" }} 
            />
          ) : (
            <div style={{ color: "#8b949e", textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🚧</div>
              <p style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Графік відсутній</p>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                Натисніть "Побудувати графік", щоб побачити результат взаємодії частинки з бар'єром.
              </p>
            </div>
          )}
        </div>

        {/* Опис */}
        <div style={{ marginTop: "40px", maxWidth: "800px", color: "#c9d1d9", lineHeight: "1.6", background: "#161b22", padding: "20px", borderRadius: "8px", border: "1px solid #30363d" }}>
          <h3 style={{ color: "#58a6ff", marginTop: 0 }}>Фізичний зміст</h3>
          {barrierType === "step" && (
            <p>
              Якщо енергія частинки <strong>E &gt; U₀</strong>, вона частково проходить і частково відбивається (квантове відбиття).<br/>
              Якщо <strong>E &lt; U₀</strong>, частинка повністю відбивається, але проникає вглиб бар'єра на невелику відстань.
            </p>
          )}
          {barrierType === "rect" && (
            <p>
              Класично частинка з <strong>E &lt; U₀</strong> не може пройти бар'єр. Квантово існує ненульова ймовірність проходження (<strong>тунелювання</strong>).
              Чим ширший бар'єр (L) і чим вищий потенціал (U₀), тим менша ймовірність тунелювання.
            </p>
          )}
          {barrierType === "double" && (
            <p>
              Система з двох бар'єрів демонструє явище <strong>резонансного тунелювання</strong>. При певних енергіях прозорість подвійного бар'єра може різко зростати до 100%, навіть якщо енергія частинки менша за висоту бар'єрів.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}