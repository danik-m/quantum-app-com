# backend/main.py
from fastapi import FastAPI, Query
from simulation.wells import plot_finite_well, plot_inf_well, M_E, EV
import base64

app = FastAPI()

@app.get("/finite-well/plot")
async def finite_well_plot(
    m: float = Query(M_E),
    L: float = Query(1e-9),
    U0_ev: float = Query(50.0),  # ← правильна назва параметра!
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