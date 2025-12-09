import { Link } from "react-router-dom";
import NavCard from "../components/NavCard";

export default function QuantumPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      
      <Link to="/physics" style={{ color: "#d2a8ff", textDecoration: "none", marginBottom: "30px", display: "inline-block", fontSize: "1.1rem" }}>
        ← Назад до розділів фізики
      </Link>
      
      <header style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: 800, marginBottom: "15px", color: "#d2a8ff" }}>
          Квантова Фізика
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#8b949e" }}>
          Фундаментальні принципи та парадокси
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
        
        {/* НОВА КАРТКА ШТЕРНА-ГЕРЛАХА */}
        <NavCard 
          title="Експеримент Белла" 
          desc="Перевірка порушення нерівностей Белла. Чи грає Бог у кості? Кореляції та заплутаність." 
          to="/simulation/bell" 
          color="#d2a8ff" 
          icon="🔗"
        />
          <NavCard 
          title="Експеримент Штерна-Герлаха" 
          desc="Демонстрація квантування спіну. Розщеплення атомного пучка в магнітному полі." 
          to="/simulation/stern-gerlach" 
          color="#e74c3c" 
          icon="🧲"
        />

        {/* Заглушка для майбутнього теоретичного курсу */}
        <div style={{ 
          padding: "30px", 
          background: "rgba(22, 27, 34, 0.5)", 
          borderRadius: "16px", 
          border: "1px dashed #30363d", 
          color: "#8b949e",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "15px", opacity: 0.5 }}>📚</div>
          <h3 style={{ margin: "0 0 10px 0", color: "#8b949e" }}>Теоретичний курс</h3>
          <p style={{ fontSize: "0.9rem" }}>Принципи суперпозиції, заплутаність та інтерпретації (в розробці).</p>
        </div>

      </div>
    </div>
  );
}