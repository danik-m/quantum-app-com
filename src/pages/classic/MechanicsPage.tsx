import { Link } from "react-router-dom";
import NavCard from "../../components/NavCard"; // Виправлено шлях (../../)

export default function MechanicsPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh", color: "white" }}>
      
      {/* Хлібні крихти назад */}
      <Link to="/physics/classic" style={{ color: "#79c0ff", textDecoration: "none", marginBottom: "30px", display: "inline-block", fontSize: "1.1rem" }}>
        ← Назад до Класичної фізики
      </Link>
      
      <header style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "15px", color: "#79c0ff" }}>
          Механіка
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#8b949e" }}>
          Вивчайте рух, сили та закони Ньютона через інтерактивні симуляції.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px" }}>
        
        {/* КАРТКА СИМУЛЯТОРА */}
        <NavCard 
          title="Відцентрова Сила"
          desc="Симулятор станції 'Endurance' з Interstellar. Розрахунок штучної гравітації, конвертер одиниць та вектори сил."
          to="/simulation/centrifugal"
          color="#f2cc60" // Жовтий акцент
          icon="🎡"
        />

        {/* Місце для майбутніх симуляцій */}
        <div style={{ 
          background: "rgba(22, 27, 34, 0.5)", 
          border: "1px dashed #30363d", 
          borderRadius: "16px", 
          padding: "30px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          color: "#8b949e",
          minHeight: "200px"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "15px", opacity: 0.5 }}>🌪️</div>
          <h3>Гіроскоп</h3>
          <p style={{ fontSize: "0.9rem" }}>Незабаром...</p>
        </div>

      </div>
    </div>
  );
}