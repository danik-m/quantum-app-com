import { useState, useEffect, useRef } from "react";
import { initWavePacket, getNextWavePacketFrame } from "../api/quantum";

export default function WavePacketSimulator() {
  // --- СТАН ПАРАМЕТРІВ ---
  const [energy, setEnergy] = useState(60);
  const [U0, setU0] = useState(80);
  const [width, setWidth] = useState(2.0);
  const [gap, setGap] = useState(6.0);
  const [barriers, setBarriers] = useState(2);
  
  // --- СТАН АНІМАЦІЇ ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Готовий до запуску");
  
  // Ref для таймера (щоб зупиняти цикл запитів)
  const intervalRef = useRef<number | null>(null);

  // --- ЛОГІКА ЗАПУСКУ ---
  async function handleStart() {
    setStatusText("Ініціалізація на сервері...");
    // 1. Спочатку ініціалізуємо бекенд
    await initWavePacket(energy, U0, width, gap, barriers);
    setStatusText("Симуляція активна");
    // 2. Запускаємо цикл на фронтенді
    setIsPlaying(true);
  }

  // --- ЛОГІКА ЗУПИНКИ ---
  function handleStop() {
    setIsPlaying(false);
    setStatusText("Зупинено");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // --- ЕФЕКТ АНІМАЦІЇ ---
  // Поки isPlaying === true, ми просимо нові кадри
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(async () => {
        // Просимо сервер розрахувати 50 кроків фізики і дати картинку
        const frame = await getNextWavePacketFrame(50); 
        if (frame) {
          setImage(frame);
        }
      }, 100); // Оновлюємо картинку кожні 100 мс (10 FPS)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    // Очищення при виході зі сторінки
    return () => { 
      if (intervalRef.current) clearInterval(intervalRef.current); 
    };
  }, [isPlaying]);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", minHeight: "100vh", background: "#0E1117", color: "white" }}>
      
      {/* --- ЛІВА ПАНЕЛЬ НАЛАШТУВАНЬ --- */}
      <div style={{ 
        width: "320px", 
        background: "#161b22", 
        padding: "20px", 
        borderRight: "1px solid #30363d", 
        display: "flex", 
        flexDirection: "column", 
        gap: "20px",
        flexShrink: 0
      }}>
        <h3 style={{ borderBottom: "1px solid #30363d", paddingBottom: "10px", color: "#58a6ff", marginTop: 0 }}>
          Налаштування Пакету
        </h3>

        {/* Енергія */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Енергія частинки E (еВ):
          </label>
          <input 
            type="range" min={10} max={200} step={5} value={energy} 
            style={{ width: "100%", cursor: "pointer" }} 
            onChange={(e) => setEnergy(Number(e.target.value))} 
            disabled={isPlaying} // Блокуємо під час симуляції
          />
          <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>{energy} еВ</div>
        </div>

        {/* Висота бар'єру */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Висота бар'єру U₀ (еВ):
          </label>
          <input 
            type="range" min={0} max={200} step={5} value={U0} 
            style={{ width: "100%", cursor: "pointer" }} 
            onChange={(e) => setU0(Number(e.target.value))} 
            disabled={isPlaying}
          />
          <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>{U0} еВ</div>
        </div>

        {/* Ширина бар'єру */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Ширина бар'єру (нм):
          </label>
          <input 
            type="range" min={0.5} max={5.0} step={0.1} value={width} 
            style={{ width: "100%", cursor: "pointer" }} 
            onChange={(e) => setWidth(Number(e.target.value))} 
            disabled={isPlaying}
          />
          <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>{width} нм</div>
        </div>

        {/* Проміжок */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Відстань між бар'єрами (нм):
          </label>
          <input 
            type="range" min={1.0} max={10.0} step={0.5} value={gap} 
            style={{ width: "100%", cursor: "pointer" }} 
            onChange={(e) => setGap(Number(e.target.value))} 
            disabled={isPlaying}
          />
          <div style={{ textAlign: "right", color: "#58a6ff", fontWeight: "bold" }}>{gap} нм</div>
        </div>

        {/* Кількість бар'єрів */}
        <div>
          <label style={{ display: "block", color: "#8b949e", marginBottom: "5px", fontSize: "0.9rem" }}>
            Кількість бар'єрів:
          </label>
          <select 
            style={{ width: "100%", padding: "8px", background: "#0d1117", color: "white", border: "1px solid #30363d", borderRadius: "6px" }} 
            value={barriers} 
            onChange={(e) => setBarriers(Number(e.target.value))}
            disabled={isPlaying}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>

        {/* Кнопки керування */}
        <div style={{ marginTop: "20px" }}>
          {!isPlaying ? (
            <button 
              onClick={handleStart} 
              style={{ 
                width: "100%", padding: "12px", background: "#238636", color: "white", 
                border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "16px",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#2ea043"}
              onMouseOut={(e) => e.currentTarget.style.background = "#238636"}
            >
              ▶ ЗАПУСТИТИ
            </button>
          ) : (
            <button 
              onClick={handleStop} 
              style={{ 
                width: "100%", padding: "12px", background: "#da3633", color: "white", 
                border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "16px",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f85149"}
              onMouseOut={(e) => e.currentTarget.style.background = "#da3633"}
            >
              ⏹ СТОП
            </button>
          )}
        </div>
        
        <div style={{ fontSize: "0.85rem", color: "#8b949e", marginTop: "10px", lineHeight: "1.4" }}>
          <strong style={{color: "white"}}>Примітка:</strong><br/>
          Симуляція виконується на Python-сервері. Браузер отримує нові кадри кожні 100 мс.
        </div>
      </div>

      {/* --- ОСНОВНА ЧАСТИНА З ГРАФІКОМ --- */}
      <div style={{ flexGrow: 1, padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
        
        <h2 style={{ marginBottom: "10px", textAlign: "center", fontSize: "2rem" }}>
          Динаміка хвильового пакету
        </h2>
        
        <p style={{ color: isPlaying ? "#58a6ff" : "#8b949e", marginBottom: "20px", fontWeight: "bold" }}>
          Статус: {statusText}
        </p>
        
        <div style={{ 
          width: "100%", maxWidth: "1000px", 
          background: "#0d1117", border: "2px solid #30363d", 
          borderRadius: "12px", padding: "10px", 
          minHeight: "500px", 
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(0,0,0,0.3)"
        }}>
          {image ? (
            <img 
              src={image} 
              alt="Simulation Frame" 
              style={{ width: "100%", height: "auto", borderRadius: "8px" }} 
            />
          ) : (
            <div style={{ color: "#8b949e", textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🌊</div>
              <p style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Графік відсутній</p>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                Налаштуйте параметри зліва та натисніть "ЗАПУСТИТИ",<br/>
                щоб побачити еволюцію квантової частинки.
              </p>
            </div>
          )}
        </div>
        
        {/* Додаткова інформація під графіком */}
        <div style={{ marginTop: "40px", maxWidth: "800px", color: "#c9d1d9", lineHeight: "1.6" }}>
          <h3 style={{ borderBottom: "1px solid #30363d", paddingBottom: "10px" }}>Як це працює?</h3>
          <p>
            Цей модуль вирішує <strong>нестаціонарне рівняння Шредінгера</strong> методом скінченних різниць (Crank-Nicolson).
          </p>
          <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
            <li><strong style={{color: "#79c0ff"}}>Синя область:</strong> Ймовірність знаходження частинки $|\Psi(x)|^2$.</li>
            <li><strong style={{color: "orange"}}>Помаранчеві зони:</strong> Потенціальні бар'єри.</li>
            <li><strong style={{color: "#ff7b72"}}>Червона лінія:</strong> Середня кінетична енергія пакету.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}