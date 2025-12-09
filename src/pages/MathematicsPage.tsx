import { Link } from "react-router-dom";

export default function MathematicsPage() {
  return (
    <div style={{ padding: "40px", color: "white", textAlign: "center" }}>
      <Link to="/" style={{ color: "#d2a8ff", marginBottom: "20px", display: "inline-block" }}>← На головну</Link>
      <h1 style={{ color: "#d2a8ff" }}>Математика</h1>
      <p>Цей розділ знаходиться в розробці...</p>
    </div>
  );
}