import { useState } from "react";
// Переконайтеся, що ви додали getOscillatorPlot у api/quantum.ts
import { getOscillatorPlot } from "../api/quantum"; 

export default function OscillatorSimulator() {
  const [particle, setParticle] = useState("electron");
  const [omegaExp, setOmegaExp] = useState(15); // Степінь (10^15)
  const [omegaBase, setOmegaBase] = useState(5.0); // База
  const [n, setN] = useState(0);

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function update() {
    setLoading(true);
    
    // Маса
    let mass = 9.109e-31;
    if (particle === "muon") mass = 206.768 * 9.109e-31;
    if (particle === "proton") mass = 1.6726219e-27;

    // Частота = base * 10^exp
    const omega = omegaBase * Math.pow(10, omegaExp);

    // Виклик API (переконайтесь, що він є у api/quantum.ts)
    const imgUrl = await getOscillatorPlot(mass, omega, n);
    setImage(imgUrl);
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", minHeight: "100vh", background: "#0E1117", color: "white" }}>
      
      {/* ЛІВА ПАНЕЛЬ */}
      <div style={{ width: "320px", background: "#161b22", padding: "20px", borderRight: "1px solid #30363d", display: "flex", flexDirection: "column", gap: "20px", flexShrink: 0 }}>
        <h3 style={{ borderBottom: "1px solid #30363d", paddingBottom: "10px", color: "#d2a8ff", marginTop: 0 }}>
          Гармонічний Осцилятор
        </h3>

        {/* Частинка */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>Частинка:</label>
          <select 
            style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }}
            value={particle} onChange={(e) => setParticle(e.target.value)}
          >
            <option value="electron">Електрон</option>
            <option value="muon">Мюон</option>
            <option value="proton">Протон</option>
          </select>
        </div>

        {/* Частота */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Частота ω (рад/с):
          </label>
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            <input 
              type="number" step="0.1" value={omegaBase} 
              style={{ width: "60px", padding: "5px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "4px" }}
              onChange={(e) => setOmegaBase(Number(e.target.value))} 
            />
            <span>× 10 ^</span>
            <input 
              type="number" step="1" value={omegaExp} 
              style={{ width: "50px", padding: "5px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "4px" }}
              onChange={(e) => setOmegaExp(Number(e.target.value))} 
            />
          </div>
          <div style={{ textAlign: "right", color: "#d2a8ff", fontSize: "0.8rem", marginTop: "5px" }}>
            {(omegaBase * Math.pow(10, omegaExp)).toExponential(2)} рад/с
          </div>
        </div>

        {/* Рівень n */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Квантовий рівень n:
          </label>
          <input 
            type="range" min={0} max={15} step={1} value={n} 
            style={{ width: "100%", cursor: "pointer" }} 
            onChange={(e) => setN(Number(e.target.value))} 
          />
          <div style={{ textAlign: "right", color: "#d2a8ff", fontWeight: "bold" }}>n = {n}</div>
        </div>

        <button 
          onClick={update} 
          disabled={loading}
          style={{ 
            marginTop: "10px", padding: "12px", background: loading ? "#238636aa" : "#238636", color: "white", 
            border: "none", borderRadius: "6px", cursor: loading ? "wait" : "pointer", fontWeight: "bold", fontSize: "16px",
            transition: "background 0.2s"
          }}
        >
          {loading ? "Завантаження..." : "Побудувати графік"}
        </button>
      </div>

      {/* ПРАВА ПАНЕЛЬ (Графік) */}
      <div style={{ flexGrow: 1, padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
        <h2 style={{ marginBottom: "30px", textAlign: "center", fontSize: "2rem" }}>Квантовий Осцилятор</h2>
        
        <div style={{ 
          width: "100%", maxWidth: "1000px", 
          background: "#0d1117", border: "2px solid #30363d", 
          borderRadius: "12px", padding: "10px", 
          minHeight: "500px", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(0,0,0,0.3)"
        }}>
          {image ? (
            <img src={image} alt="Oscillator Plot" style={{ width: "100%", height: "auto", borderRadius: "8px" }} />
          ) : (
            <div style={{ color: "#8b949e", textAlign: "center" }}>
              <div style={{ fontSize: "4rem", marginBottom: "20px" }}>〰️</div>
              <p style={{ fontSize: "1.2rem" }}>Графік відсутній</p>
              <p style={{ opacity: 0.7 }}>Натисніть "Побудувати графік"</p>
            </div>
          )}
        </div>

        {/* Опис */}
        <div style={{ marginTop: "40px", maxWidth: "800px", background: "#161b22", padding: "20px", borderRadius: "8px", border: "1px solid #30363d", color: "#c9d1d9", lineHeight: "1.6" }}>
          <h3 style={{ color: "#d2a8ff", marginTop: 0 }}>Про модель</h3>
          <p>
            <strong>Квантовий гармонічний осцилятор</strong> — це модель частинки в параболічному потенціалі $U(x) \sim x^2$.
            Вона описує коливання атомів у молекулах, фонони та багато іншого.
          </p>
          <ul style={{ paddingLeft: "20px" }}>
            <li>Рівні енергії розташовані на рівних відстанях: $E_n = \hbar\omega(n + 1/2)$.</li>
            <li>Існує <strong>нульова енергія</strong> при $n=0$.</li>
            <li>Хвильові функції описуються поліномами Ерміта.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}