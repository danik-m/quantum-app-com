from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import base64

# Імпорт модулів симуляції
from simulation.wells import (
    plot_finite_well,
    plot_inf_well,
    solve_finite_well_energies,
    M_E,
    EV
)
# Імпорт функцій для бар'єрів (оновлений модуль)
from simulation.barriers import (
    plot_step_barrier, 
    plot_rectangular_barrier, 
    plot_double_barrier
)
# Імпорт симулятора хвильового пакету (глобальний об'єкт)
from simulation.wavepacket import simulator


# Імпорт симулятора осцилятора (глобальний об'єкт)
from simulation.oscillator import plot_harmonic_oscillator
app = FastAPI()
# 6. Експеримент Белла (глобальний об'єкт bell_sim)
from simulation.bell import calculate_bell_outcome

# --------------------
# CORS (ОБОВ'ЯЗКОВО!)
# --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Дозволяємо запити з будь-якого джерела (для React)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. ПОТЕНЦІАЛЬНІ ЯМИ (Wells)
# ==========================================

@app.get("/finite-well/data")
async def finite_well_data(
    m: float = Query(M_E),
    L: float = Query(1e-9),
    U0_ev: float = Query(50.0),
):
    try:
        energies = solve_finite_well_energies(m, L, U0_ev * EV)
        return {"energies": energies}
    except Exception as e:
        return {"error": str(e)}

@app.get("/finite-well/plot")
async def finite_well_plot(
    m: float = Query(M_E),
    L: float = Query(1e-9),
    U0_ev: float = Query(50.0),
    n: int = Query(1, ge=1),
):
    try:
        png_bytes = plot_finite_well(m, L, U0_ev, n)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

@app.get("/infinite-well/plot")
async def infinite_well_plot(
    m: float = Query(M_E),
    L: float = Query(1e-9),
    n: int = Query(1, ge=1),
):
    try:
        png_bytes = plot_inf_well(m, L, n)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}


# ==========================================
# 2. КВАНТОВІ БАР'ЄРИ (Barriers)
# ==========================================

@app.get("/barrier/step/plot")
async def barrier_step_plot(
    m: float = Query(M_E),
    E_ev: float = Query(5.0),  # Енергія частинки
    U0_ev: float = Query(50.0), # Висота бар'єра
):
    try:
        png_bytes = plot_step_barrier(m, E_ev * EV, U0_ev * EV)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

@app.get("/barrier/rect/plot")
async def barrier_rect_plot(
    m: float = Query(M_E),
    E_ev: float = Query(5.0),
    U0_ev: float = Query(50.0),
    L: float = Query(1e-9), # Ширина бар'єра
):
    try:
        png_bytes = plot_rectangular_barrier(m, E_ev * EV, U0_ev * EV, L)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

@app.get("/barrier/double/plot")
async def barrier_double_plot(
    m: float = Query(M_E),
    E_ev: float = Query(5.0),
    U0_ev: float = Query(50.0),
    L: float = Query(1e-9),
    d: float = Query(0.5e-9), # Відстань між бар'єрами
):
    try:
        png_bytes = plot_double_barrier(m, E_ev * EV, U0_ev * EV, L, d)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}


# ==========================================
# 3. ХВИЛЬОВИЙ ПАКЕТ (Wave Packet Animation)
# ==========================================

@app.get("/wavepacket/init")
async def init_wavepacket(
    energy_ev: float = Query(60.0),
    U0_ev: float = Query(80.0),
    width_nm: float = Query(2.0),
    gap_nm: float = Query(6.0),
    n_barriers: int = Query(2),
):
    """Ініціалізація симуляції з новими параметрами"""
    try:
        simulator.init_simulation(energy_ev, U0_ev, width_nm, gap_nm, n_barriers, use_absorber=True)
        return {"status": "initialized", "message": "Simulation started"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/wavepacket/next")
async def next_wavepacket_frame(
    steps: int = Query(50) # Кількість кроків фізики на один кадр
):
    """Розрахунок наступного кадру анімації"""
    try:
        # 1. Робимо кроки в часі
        simulator.step(steps)
        
        # 2. Отримуємо картинку
        png_bytes = simulator.get_frame()
        
        if png_bytes is None:
            return {"error": "Not initialized. Call /wavepacket/init first."}
        
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}
    # ==========================================
# 4. ГАРМОНІЧНИЙ ОСЦИЛЯТОР (Oscillator)
# ==========================================
@app.get("/oscillator/plot")
async def oscillator_plot(
    m: float = Query(M_E),
    omega: float = Query(5e15), 
    n: int = Query(0, ge=0),
):
    try:
        png_bytes = plot_harmonic_oscillator(m, omega, n)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}
    

# --- BELL EXPERIMENT (3D) ---
@app.get("/bell/run")
async def run_bell(angle_a: float = 0.0, angle_b: float = 45.0):
    # Повертає результат вимірювання (JSON)
    return calculate_bell_outcome(angle_a, angle_b)