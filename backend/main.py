from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from simulation.wells import (
    plot_finite_well,
    plot_inf_well,
    solve_finite_well_energies,
    M_E,
    EV
)
import base64

app = FastAPI()

# --------------------
# CORS (ОБЯЗАТЕЛЬНО!)
# --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # можно ограничить ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# DATA endpoint
# --------------------
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

# --------------------
# FINITE WELL PLOT
# --------------------
@app.get("/finite-well/plot")
async def finite_well_plot(
    m: float = Query(M_E),
    L: float = Query(1e-9),
    U0_ev: float = Query(50.0),
    n: int = Query(1, ge=1),
):
    try:
        # ВАЖНО — здесь передаём U0_ev, потому что wells.py сам конвертирует в Джоулі
        png_bytes = plot_finite_well(m, L, U0_ev, n)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

# --------------------
# INFINITE WELL PLOT
# --------------------
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