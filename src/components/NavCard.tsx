import { Link } from "react-router-dom";

interface NavCardProps {
  title: string;
  desc: string;
  to: string;
  color?: string;
  icon?: string;
}

export default function NavCard({ title, desc, to, color = "#58a6ff", icon }: NavCardProps) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        className="nav-card"
        style={{
          padding: "30px",
          background: "rgba(22, 27, 34, 0.8)", // Темный полупрозрачный фон
          borderRadius: "16px",
          border: `1px solid ${color}40`, // Полупрозрачная рамка цвета карточки
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transition: "transform 0.2s, border-color 0.2s, background 0.2s",
          cursor: "pointer",
          boxSizing: "border-box" // Важливо для відступів
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.background = "rgba(22, 27, 34, 1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = `${color}40`;
          e.currentTarget.style.background = "rgba(22, 27, 34, 0.8)";
        }}
      >
        <div>
          {icon && <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>{icon}</div>}
          <h2 style={{ color: color, margin: "0 0 10px 0", fontSize: "1.8rem" }}>{title}</h2>
          <p style={{ color: "#8b949e", lineHeight: "1.5", fontSize: "1rem", margin: 0 }}>{desc}</p>
        </div>
        
        <div style={{ 
          marginTop: "20px", 
          color: color, 
          fontWeight: "bold", 
          display: "flex", 
          alignItems: "center",
          fontSize: "0.9rem"
        }}>
          Перейти <span style={{ marginLeft: "8px", fontSize: "1.2rem" }}>→</span>
        </div>
      </div>
    </Link>
  );
}