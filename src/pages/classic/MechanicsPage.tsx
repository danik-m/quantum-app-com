import { Link } from "react-router-dom";
import NavCard from "../../components/NavCard"; 

export default function MechanicsPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh", color: "white" }}>
      
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
        
        {/* КАРТКА СИМУЛЯТОРА ВІДЦЕНТРОВОЇ СИЛИ */}
        <NavCard 
          title="Відцентрова Сила"
          desc="Симулятор станції 'Endurance'. Розрахунок штучної гравітації та ефекту Коріоліса."
          to="/simulation/centrifugal"
          color="#f2cc60" 
          icon="🎡"
        />

        {/* НОВА КАРТКА ГІРОСКОПА */}
        <NavCard 
          title="Гіроскоп"
          desc="Інтерактивна модель прецесії дзиґи. Дослідіть вплив спіну, маси та кута нахилу на стійкість."
          to="/classic/gyroscope" 
          color="#e74c3c"
          icon="🌪️"
        />
        {/* 👇 НОВА КАРТКА */}
        <NavCard 
          title="Закони Кеплера"
          desc="Орбітальна механіка. Еліптичні орбіти, зміна швидкості планети та залежність періоду від радіуса."
          to="/classic/kepler" 
          color="#4ade80"
          icon="🪐"
        />
        {/* КАРТКА СИМУЛЯТОРА ЗАКОНІВ НЬЮТОНА (НОВА) */}
        <NavCard 
          title="Закони Ньютона"
          desc="Інтерактивна лабораторія: Інерція, F=ma та Дія-Протидія. 3D візуалізація сил та руху."
          to="/classic/newton" 
          color="#3b82f6"
          icon="🍎"
        />

      </div>
    </div>
  );
}