import { Link } from "react-router-dom";
import NavCard from "../components/NavCard";

export default function PhysicsPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      {/* Кнопка Назад */}
      <Link to="/" style={{ color: "#58a6ff", textDecoration: "none", marginBottom: "30px", display: "inline-block", fontSize: "1.1rem" }}>
        ← На головну
      </Link>
      
      {/* Заголовок */}
      <header style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "15px", color: "white" }}>
          Фізика
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#8b949e" }}>
          Оберіть розділ для вивчення
        </p>
      </header>

      {/* Сітка меню (Grid) */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "30px" 
      }}>
        
        {/* 1. Класична фізика */}
        <NavCard 
          title="Класична фізика" 
          desc="Механіка, термодинаміка, оптика та закони Ньютона." 
          to="/physics/classic" 
          color="#f2cc60" // Жовтий
          icon="🔭"
        />
        
        {/* 2. Атомна та Ядерна фізика (веде на підменю) */}
        <NavCard 
          title="Атомна та Ядерна фізика" 
          desc="Будова атома, спектри, орбіталі та модельні задачі." 
          to="/physics/atomic" 
          color="#7ee787" // Зелений
          icon="⚛️"
        />
        
        {/* 3. Електродинаміка */}
        <NavCard 
          title="Електродинаміка" 
          desc="Електричні поля, струми, рівняння Максвелла." 
          to="/physics/electrodynamics" 
          color="#ffa657" // Помаранчевий
          icon="⚡"
        />
        
        {/* 4. Квантова фізика */}
        <NavCard 
          title="Квантова фізика" 
          desc="Фундаментальні принципи квантового світу та теорії." 
          to="/physics/quantum" 
          color="#d2a8ff" // Фіолетовий
          icon="🧠"
        />

      </div>
    </div>
  );
}