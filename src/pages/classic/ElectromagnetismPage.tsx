import { Link } from "react-router-dom";

export default function ElectromagnetismPage() {
  return (
    <div style={{ padding: "40px", color: "white", textAlign: "center" }}>
      <Link to="/physics/classic" style={{ color: "#d2a8ff", marginBottom: "20px", display: "inline-block" }}>← Назад</Link>
      <h1 style={{ color: "#d2a8ff", fontSize: "3rem" }}>Електрика і Магнетизм</h1>
      <p style={{ color: "#8b949e", fontSize: "1.2rem" }}>Закони Ома, Кірхгофа, магнітні поля та індукція.</p>
      <div style={{ marginTop: "50px", fontSize: "4rem", opacity: 0.3 }}>⚡</div>
      <p style={{ marginTop: "20px", color: "#8b949e" }}>Розділ знаходиться в розробці.</p>
    </div>
  );
}