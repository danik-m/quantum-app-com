import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Star background animation
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

    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2,
        speed: Math.random() * 0.3 + 0.1,
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
      <canvas
        ref={canvasRef}
        id="stars"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          background: "transparent",
        }}
      />

      <header style={{ padding: "30px", textAlign: "center" }}>
        <h1 style={{ fontSize: "52px", fontWeight: 800, letterSpacing: "2px" }}>
          Quantum Lab
        </h1>
        <h2 style={{ marginTop: "-10px", fontWeight: 300, opacity: 0.7 }}>
          Interactive Atomic Physics & Quantum Mechanics Playground
        </h2>
      </header>

      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "25px",
          padding: "40px",
          maxWidth: "1300px",
          margin: "auto",
        }}
      >
        <HomeCard title="Atomic Structure" desc="Interactive periodic table and atomic electron shell animations." to="/atoms" />
        <HomeCard title="3D Orbitals" desc="View electron orbitals (s, p, d, f) rendered in real 3D." to="/orbitals" />
        <HomeCard title="Spectroscopy" desc="Energy levels, transitions, photon emission, absorption spectra." to="/spectra" />
        <HomeCard title="Schrödinger Solver" desc="Solve quantum wells, barriers, oscillators, wave packets." to="/schrodinger" />
        <HomeCard title="Quantum Simulations" desc="Unified modules: wells, barriers, oscillators, wavepackets." to="/simulations" />
        <HomeCard title="API Docs" desc="FastAPI documentation for all backend solvers." to="/api-docs" />
      </div>

      <footer style={{ textAlign: "center", padding: "20px", opacity: 0.6, fontSize: "14px" }}>
        © 2025 Quantum Lab — Built for research, education and simulation
      </footer>
    </div>
  );
}

function HomeCard({
  title,
  desc,
  to,
}: {
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: "none",
        color: "white",
      }}
    >
      <div
        className="card"
        style={{
          padding: "28px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(6px)",
          transition: "0.35s",
          cursor: "pointer",
          minHeight: "160px",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
        }
      >
        <div style={{ fontSize: "22px", fontWeight: 600, marginBottom: "8px" }}>
          {title}
        </div>
        <div style={{ opacity: 0.65, fontSize: "15px", lineHeight: 1.45 }}>
          {desc}
        </div>
      </div>
    </Link>
  );
}