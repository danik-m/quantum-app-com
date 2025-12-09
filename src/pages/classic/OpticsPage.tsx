import { Link } from "react-router-dom";

export default function OpticsPage() {
  return (
    <div style={{ padding: "40px", color: "white", textAlign: "center" }}>
      <Link to="/physics/classic" style={{ color: "#e3b341", marginBottom: "20px", display: "inline-block" }}>← Назад</Link>
      <h1 style={{ color: "#e3b341", fontSize: "3rem" }}>Оптика</h1>
      <p style={{ color: "#8b949e", fontSize: "1.2rem" }}>Геометрична оптика, лінзи, інтерференція та дифракція.</p>
      <div style={{ marginTop: "50px", fontSize: "4rem", opacity: 0.3 }}>🔦</div>
      <p style={{ marginTop: "20px", color: "#8b949e" }}>Розділ знаходиться в розробці.</p>
    </div>
  );
}