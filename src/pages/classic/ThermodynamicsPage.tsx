import { Link } from "react-router-dom";

export default function ThermodynamicsPage() {
  return (
    <div style={{ padding: "40px", color: "white", textAlign: "center" }}>
      <Link to="/physics/classic" style={{ color: "#ff7b72", marginBottom: "20px", display: "inline-block" }}>← Назад</Link>
      <h1 style={{ color: "#ff7b72", fontSize: "3rem" }}>Термодинаміка</h1>
      <p style={{ color: "#8b949e", fontSize: "1.2rem" }}>Теплові двигуни, ентропія та закони термодинаміки.</p>
      <div style={{ marginTop: "50px", fontSize: "4rem", opacity: 0.3 }}>🌡️</div>
      <p style={{ marginTop: "20px", color: "#8b949e" }}>Розділ знаходиться в розробці.</p>
    </div>
  );
}