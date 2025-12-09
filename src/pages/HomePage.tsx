import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let stars: { x: number; y: number; r: number; speed: number }[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5,
        speed: Math.random() * 0.2 + 0.05,
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
      });
      requestAnimationFrame(animate);
    }
    animate();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: -1 }} />

      <header style={{ padding: "60px", textAlign: "center", marginTop: "40px" }}>
        <h1 style={{ fontSize: "64px", fontWeight: 800, letterSpacing: "2px", background: "linear-gradient(90deg, #fff, #aaa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Science Lab
        </h1>
        <h2 style={{ marginTop: "10px", fontWeight: 300, opacity: 0.8, fontSize: "1.5rem", color: "#ccc" }}>
          Оберіть напрямок досліджень
        </h2>
      </header>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
        gap: "40px", 
        padding: "40px", 
        maxWidth: "1000px", 
        margin: "auto" 
      }}>
        
        {/* БЛОК 1: МАТЕМАТИКА */}
        <Link to="/mathematics" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "50px",
            background: "rgba(22, 27, 34, 0.8)",
            borderRadius: "20px",
            border: "2px solid #d2a8ff",
            backdropFilter: "blur(10px)",
            textAlign: "center",
            transition: "transform 0.2s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📐</div>
            <h2 style={{ fontSize: "2.5rem", color: "#d2a8ff", margin: 0 }}>Математика</h2>
            <p style={{ color: "#aaa", marginTop: "15px" }}>Алгебра, Геометрія, Аналіз</p>
          </div>
        </Link>

        {/* БЛОК 2: ФІЗИКА */}
        <Link to="/physics" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "50px",
            background: "rgba(22, 27, 34, 0.8)",
            borderRadius: "20px",
            border: "2px solid #58a6ff",
            backdropFilter: "blur(10px)",
            textAlign: "center",
            transition: "transform 0.2s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>⚛️</div>
            <h2 style={{ fontSize: "2.5rem", color: "#58a6ff", margin: 0 }}>Фізика</h2>
            <p style={{ color: "#aaa", marginTop: "15px" }}>Від механіки до квантової теорії</p>
          </div>
        </Link>

      </div>
    </div>
  );
}