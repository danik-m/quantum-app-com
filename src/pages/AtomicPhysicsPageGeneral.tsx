import { Link } from "react-router-dom";
import NavCard from "../components/NavCard";

export default function AtomicPhysicsPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      
      <Link to="/physics" style={{ color: "#7ee787", textDecoration: "none", marginBottom: "30px", display: "inline-block", fontSize: "1.1rem" }}>
        ← Назад до розділів фізики
      </Link>
      
      <header style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "15px", color: "#7ee787" }}>
          Атомна та Ядерна фізика
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#8b949e" }}>
          Дослідження мікросвіту: від електронів до ядер
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
        
        {/* --- ГОЛОВНА КАРТКА ДЛЯ СИМУЛЯЦІЙ --- */}
        <NavCard 
          title="Модельні задачі" 
          desc="Інтерактивні симулятори: Потенціальні ями, Бар'єри, Хвильові пакети." 
          to="/physics/atomic/models" 
          color="#58a6ff" 
          icon="📉"
        />

        <NavCard 
          title="Спектроскопія" 
          desc="Вивчення спектрів випромінювання та поглинання атомів." 
          to="/spectra" 
          color="#ff7b72" 
          icon="🌈"
        />
        
        <NavCard 
          title="3D Орбіталі" 
          desc="Візуалізація електронних хмар s, p, d, f." 
          to="/orbitals" 
          color="#d2a8ff" 
          icon="🌌"
        />
        
        <NavCard 
          title="Атомна структура" 
          desc="Інтерактивна таблиця Менделєєва та будова атомів." 
          to="/atoms" 
          color="#7ee787" 
          icon="⚛️"
        />

      </div>
    </div>
  );
}
