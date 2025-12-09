import { Link } from "react-router-dom";
import NavCard from "../components/NavCard"; // Правильний шлях для файлу в src/pages/

export default function ClassicPhysicsPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", color: "white", minHeight: "100vh" }}>
      {/* Кнопка повернення */}
      <Link to="/physics" style={{ color: "#f2cc60", textDecoration: "none", marginBottom: "30px", display: "inline-block", fontSize: "1.1rem" }}>
        ← Назад до розділів
      </Link>
      
      {/* Заголовок */}
      <header style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ fontSize: "3.5rem", marginBottom: "15px", color: "#f2cc60" }}>Класична фізика</h1>
        <p style={{ fontSize: "1.2rem", lineHeight: "1.6", color: "#c9d1d9" }}>
          Фундаментальні закони макросвіту: від яблука Ньютона до електростанцій.
        </p>
      </header>

      {/* Сітка навігації */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px" }}>
        
        {/* 1. МЕХАНІКА - Веде на сторінку MechanicsPage */}
        <NavCard 
          title="Механіка"
          desc="Кінематика, динаміка, гравітація, обертальний рух та закони збереження."
          to="/physics/classic/mechanics" 
          color="#79c0ff"
          icon="⚙️"
        />

        {/* 2. ТЕРМОДИНАМІКА */}
        <NavCard 
          title="Термодинаміка"
          desc="Теплота, температура, ентропія, ідеальний газ та теплові двигуни."
          to="/physics/classic/thermodynamics" 
          color="#ff7b72"
          icon="🌡️"
        />
        
        {/* 3. ЕЛЕКТРИКА І МАГНЕТИЗМ */}
        <NavCard 
          title="Електрика і Магнетизм"
          desc="Електричні кола, поля, закон Кулона, сила Лоренца та індукція."
          to="/physics/classic/electromagnetism" 
          color="#d2a8ff"
          icon="⚡"
        />

        {/* 4. ОПТИКА */}
        <NavCard 
          title="Оптика"
          desc="Геометрична оптика, лінзи, дзеркала, заломлення світла та інтерференція."
          to="/physics/classic/optics" 
          color="#e3b341"
          icon="🔦"
        />

      </div>
    </div>
  );
}