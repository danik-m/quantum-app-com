// src/components/FiniteWellSimulator.tsx
import { useState } from "react";
import { getFiniteWellPlot, getInfiniteWellPlot } from "../api/quantum";

export default function FiniteWellSimulator() {
  const [U0, setU0] = useState(50); // eV
  const [n, setN] = useState(1);

  const [image, setImage] = useState<string | null>(null);

  const [wellType, setWellType] = useState("finite");
  const [particle, setParticle] = useState("electron");
  const [L_nm, setL_nm] = useState(1);

  


  async function update() {
    const L_m = L_nm * 1e-9;

    let mass = 9.109e-31;
    if (particle === "muon") mass = 206.768 * 9.109e-31;
    if (particle === "proton") mass = 1.6726219e-27;

    let imgUrl = null;

    if (wellType === "finite") {
      imgUrl = await getFiniteWellPlot(mass, L_m, U0, n);
    }

    if (wellType === "infinite") {
      imgUrl = await getInfiniteWellPlot(mass, L_m, n);
    }

  setImage(imgUrl);
}

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: "0" }}>
      
      {/* LEFT SIDEBAR */}
      <div style={{
        width: "280px",
        background: "#111",
        color: "white",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}>
        <h3>Налаштування</h3>

        {/* Type of well */}
        <label>Тип ями:</label>
        <select value={wellType} onChange={(e) => setWellType(e.target.value)}>
          <option value="finite">Кінцева яма</option>
          <option value="infinite">Нескінченна яма</option>
        </select>

        {/* Particle */}
        <label>Частинка:</label>
        <select value={particle} onChange={(e) => setParticle(e.target.value)}>
          <option value="electron">Електрон</option>
          <option value="muon">Мюон</option>
          <option value="proton">Протон</option>
        </select>

        {/* Length (L nm slider) */}
        <label>Довжина ями L (нм):</label>
        <input type="range" min={0.1} max={1.5} step={0.1} value={L_nm}
          onChange={(e) => setL_nm(Number(e.target.value))}
        />
        <div>{L_nm.toFixed(2)} нм</div>

        {/* Potential U0 only for finite well */}
        {wellType === "finite" && (
          <>
            <label>Глибина ями U₀ (еВ):</label>
            <input type="number" value={U0} onChange={(e) => setU0(Number(e.target.value))} />
          </>
        )}

        {/* quantum number n */}
        <label>Квантове число n:</label>
        <input type="range" min={1} max={10} value={n} onChange={(e) => setN(Number(e.target.value))} />
        <div>n = {n}</div>

        <button onClick={update}>Оновити</button>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flexGrow: 1, padding: "20px", color: "white" }}>
        <h2 style={{ textAlign: "center" }}>
          {wellType === "finite" ? "Кінцева потенціальна яма" : "Нескінченна потенціальна яма"}
        </h2>

        {image && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <img 
              src={image} 
              alt="well graph" 
              style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
            />
          </div>
        )}

        <div style={{ marginTop: "30px", padding: "20px", background: "#1a1a1a", borderRadius: "8px" }}>
          <h3>Опис моделі</h3>

          {wellType === "finite" ? (
            <>
              <h4>1. Основні властивості:</h4>
              <p>У кінцевій ямі хвильова функція проникає у бар’єр. З’являється тунелювання.</p>

              <h4>2. Приклади в природі:</h4>
              <p>Напівпровідники, квантові точки, ядерні потенціали.</p>

              <h4>3. Межі потенціалу U(x):</h4>
              <pre>
{`U(x) = 0,         0 < x < L
U(x) = U₀,      x < 0 або x > L`}
              </pre>
            </>
          ) : (
            <>
              <h4>1. Основні властивості:</h4>
              <p>Стінки нескінченно високі, хвиля строго нульова на межах.</p>

              <h4>2. Приклади в природі:</h4>
              <p>Моделі квантових коробок, апроксимація вузьких потенціальних ям.</p>

              <h4>3. Межі потенціалу U(x):</h4>
              <pre>
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