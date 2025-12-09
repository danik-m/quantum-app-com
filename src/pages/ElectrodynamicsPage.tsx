import { Link } from "react-router-dom";

export default function ElectrodynamicsPage() {
  return (
    <div style={{ padding: "40px", color: "white", textAlign: "center" }}>
      <Link to="/physics" style={{ color: "#ffa657", marginBottom: "20px", display: "inline-block" }}>← Назад до фізики</Link>
      <h1 style={{ color: "#ffa657" }}>Електродинаміка</h1>
      <p>Розділ в розробці...</p>
    </div>
  );
}