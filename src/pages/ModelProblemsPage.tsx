import { Link } from "react-router-dom";

export default function SchrodingerPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f24", color: "white", padding: "40px" }}>
      
      <Link to="/" style={{ color: "#58a6ff", textDecoration: "none", display: "inline-block", marginBottom: "20px" }}>
        ← На головну
      </Link>

      <header style={{ textAlign: "center", marginBottom: "60px" }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: "800", marginBottom: "15px", background: "linear-gradient(90deg, #7ee787, #58a6ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Лабораторія Шредінгера
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#8b949e", maxWidth: "700px", margin: "0 auto" }}>
          Оберіть тип квантової системи для моделювання. Ви можете дослідити стаціонарні стани в ямах, розсіювання на бар'єрах або еволюцію хвильового пакету в часі.
        </p>
      </header>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
        gap: "30px", 
        maxWidth: "1200px", 
        margin: "0 auto" 
      }}>

        {/* --- КАРТКА 1: ПОТЕНЦІАЛЬНІ ЯМИ --- */}
        <SimulationCard 
          title="📦 Потенціальні Ями"
          desc="Дослідження зв'язаних станів електрона у кінцевій та нескінченній ямах. Енергетичні рівні та хвильові функції."
          link="/simulation/well"
          color="#7ee787" // Green
          icon="📊"
        />

        {/* --- КАРТКА 2: КВАНТОВІ БАР'ЄРИ --- */}
        <SimulationCard 
          title="🚧 Квантові Бар'єри"
          desc="Моделювання тунельного ефекту та надбар'єрного відбиття. Сходинка, прямокутний та подвійний бар'єри."
          link="/simulation/barrier"
          color="#f2cc60" // Yellow
          icon="🧱"
        />

        {/* --- КАРТКА 3: ХВИЛЬОВИЙ ПАКЕТ --- */}
        <SimulationCard 
          title="🌊 Хвильовий Пакет"
          desc="Анімація руху гаусового хвильового пакету. Спостерігайте за розпливанням та інтерференцією в реальному часі."
          link="/simulation/wavepacket"
          color="#58a6ff" // Blue
          icon="🎬"
        />
         {/* 4. ОСЦИЛЯТОР (НОВЕ) */}
        <SimulationCard
          title="〰️ Гармонічний Осцилятор"
          desc="Квантування енергії в параболічному потенціалі. Поліноми Ерміта та нульові коливання."
          link="/simulation/oscillator"
          color="#d2a8ff"
          icon="🧲"
        />

      </div>
    </div>
  );
}

// Компонент картки для чистоти коду
function SimulationCard({ title, desc, link, color, icon }: { title: string, desc: string, link: string, color: string, icon: string }) {
  return (
    <Link to={link} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: "16px",
        padding: "30px",
        height: "100%",
        transition: "transform 0.2s, border-color 0.2s",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "#30363d";
      }}
      >
        <div>
          <div style={{ fontSize: "3rem", marginBottom: "20px" }}>{icon}</div>
          <h2 style={{ color: color, margin: "0 0 15px 0", fontSize: "1.8rem" }}>{title}</h2>
          <p style={{ color: "#c9d1d9", lineHeight: "1.6", fontSize: "1rem" }}>{desc}</p>
        </div>
        
        <div style={{ 
          marginTop: "25px", 
          color: color, 
          fontWeight: "bold", 
          display: "flex", 
          alignItems: "center",
          fontSize: "0.9rem"
        }}>
          Запустити симуляцію <span style={{ marginLeft: "8px", fontSize: "1.2rem" }}>→</span>
        </div>
      </div>
    </Link>
  );
}