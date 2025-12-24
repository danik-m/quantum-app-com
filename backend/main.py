from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import matplotlib
import scipy.integrate

# --- 1. SYSTEM CONFIGURATION ---
matplotlib.use('Agg')

# --- 2. COMPATIBILITY PATCH (SCIPY) ---
if not hasattr(scipy.integrate, 'simpson'):
    if hasattr(scipy.integrate, 'simps'):
        scipy.integrate.simpson = scipy.integrate.simps
elif not hasattr(scipy.integrate, 'simps'):
    scipy.integrate.simps = scipy.integrate.simps

# --- 3. SIMULATION IMPORTS ---
try:
    from simulation.wells import plot_finite_well, plot_inf_well, solve_finite_well_energies, M_E, EV
except ImportError as e:
    print(f"Error importing wells: {e}")

try:
    from simulation.barriers import plot_step_barrier, plot_rectangular_barrier, plot_double_barrier
except ImportError as e:
    print(f"Error importing barriers: {e}")

try:
    from simulation.wavepacket import simulator
except ImportError as e:
    print(f"Error importing wavepacket: {e}")

try:
    from simulation.oscillator import plot_harmonic_oscillator
except ImportError as e:
    print(f"Error importing oscillator: {e}")

# Import hydrogen explicitly
try:
    from simulation.hydrogen import get_hydrogen_solution
except ImportError as e:
    print(f"Error importing hydrogen: {e}")
    # Define fallback if import fails
    def get_hydrogen_solution(*args, **kwargs):
        return {"error": "Module not loaded"}

from simulation.bell import calculate_bell_outcome
from simulation.stern_gerlach import generate_atom_batch
from simulation.centrifugal import calculate_centrifugal_physics

# Optional modules
try:
    from simulation.gyroscope import calculate_gyroscope_physics
except ImportError:
    pass
try:
    from simulation.kepler import calculate_kepler_parameters
except ImportError:
    pass

# Import Newton module
try:
    from simulation import newton
except ImportError as e:
    print(f"Error importing newton: {e}")


# --- APP SETUP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS (Required for Newton's Laws) ---
class NewtonLaw1Params(BaseModel):
    velocity: float
    friction: float

class NewtonLaw2Params(BaseModel):
    mass: float
    force: float

class NewtonLaw3Params(BaseModel):
    mass1: float
    mass2: float
    velocity1: float
    velocity2: float


@app.get("/")
def root():
    return {"status": "Quantum Server Running"}

# ==========================================
# 1. POTENTIAL WELLS
# ==========================================
@app.get("/finite-well/data")
async def finite_well_data(m: float = Query(M_E), L: float = Query(1e-9), U0_ev: float = Query(50.0)):
    try:
        energies = solve_finite_well_energies(m, L, U0_ev * EV)
        return {"energies": energies}
    except Exception as e:
        return {"error": str(e)}

@app.get("/finite-well/plot")
async def finite_well_plot(m: float = Query(M_E), L: float = Query(1e-9), U0_ev: float = Query(50.0), n: int = Query(1, ge=1)):
    try:
        png_bytes = plot_finite_well(m, L, U0_ev, n)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

@app.get("/infinite-well/plot")
async def infinite_well_plot(m: float = Query(M_E), L: float = Query(1e-9), n: int = Query(1, ge=1)):
    try:
        png_bytes = plot_inf_well(m, L, n)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# 2. QUANTUM BARRIERS
# ==========================================
@app.get("/barrier/step/plot")
async def barrier_step_plot(m: float = Query(M_E), E_ev: float = Query(5.0), U0_ev: float = Query(50.0)):
    try:
        png_bytes = plot_step_barrier(m, E_ev * EV, U0_ev * EV)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

@app.get("/barrier/rect/plot")
async def barrier_rect_plot(m: float = Query(M_E), E_ev: float = Query(5.0), U0_ev: float = Query(50.0), L: float = Query(1e-9)):
    try:
        png_bytes = plot_rectangular_barrier(m, E_ev * EV, U0_ev * EV, L)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

@app.get("/barrier/double/plot")
async def barrier_double_plot(m: float = Query(M_E), E_ev: float = Query(5.0), U0_ev: float = Query(50.0), L: float = Query(1e-9), d: float = Query(0.5e-9)):
    try:
        png_bytes = plot_double_barrier(m, E_ev * EV, U0_ev * EV, L, d)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# 3. WAVE PACKET
# ==========================================
@app.get("/wavepacket/init")
async def init_wavepacket(energy_ev: float = Query(60.0), U0_ev: float = Query(80.0), width_nm: float = Query(2.0), gap_nm: float = Query(6.0), n_barriers: int = Query(2)):
    try:
        simulator.init_simulation(energy_ev, U0_ev, width_nm, gap_nm, n_barriers, use_absorber=True)
        return {"status": "initialized", "message": "Simulation started"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/wavepacket/next")
async def next_wavepacket_frame(steps: int = Query(50)):
    try:
        simulator.step(steps)
        png_bytes = simulator.get_frame()
        if png_bytes is None:
            return {"error": "Not initialized"}
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# 4. HARMONIC OSCILLATOR
# ==========================================
@app.get("/oscillator/plot")
async def oscillator_plot(m: float = Query(M_E), omega: float = Query(5e15), n: int = Query(0, ge=0)):
    try:
        png_bytes = plot_harmonic_oscillator(m, omega, n)
        b64 = base64.b64encode(png_bytes).decode()
        return {"image": b64}
    except Exception as e:
        return {"error": str(e)}

# ==========================================
# 5. EXPERIMENTS
# ==========================================
@app.get("/stern-gerlach/shoot")
async def shoot_stern_gerlach(batch_size: int = 10, gradient: float = 1000.0):
    return generate_atom_batch(batch_size, gradient)

@app.get("/bell/run")
async def run_bell(angle_a: float = 0.0, angle_b: float = 45.0):
    return calculate_bell_outcome(angle_a, angle_b)

# ==========================================
# 6. CLASSICAL PHYSICS
# ==========================================
@app.get("/classic/centrifugal")
async def calc_centrifugal(mass: float, mass_unit: str, radius: float, radius_unit: str, velocity: float, velocity_unit: str):
    return calculate_centrifugal_physics(mass, mass_unit, radius, radius_unit, velocity, velocity_unit)

@app.get("/classic/gyroscope")
async def calc_gyroscope(mass: float, radius: float, length: float, rpm: float, theta: float):
    if 'calculate_gyroscope_physics' in globals():
        return calculate_gyroscope_physics(mass, radius, length, rpm, theta)
    return {"error": "Module not loaded"}

@app.get("/classic/kepler")
async def calc_kepler(a_au: float, e: float, m_star: float):
    if 'calculate_kepler_parameters' in globals():
        return calculate_kepler_parameters(a_au, e, m_star)
    return {"error": "Module not loaded"}

# ==========================================
# 7. HYDROGEN ATOM (UPDATED)
# ==========================================
@app.get("/hydrogen/solve")
async def solve_hydrogen(Z: int = Query(1, ge=1, le=118), n: int = Query(1, ge=1, le=20), l: int = Query(0, ge=0)):
    if l >= n:
        return {"error": f"l ({l}) must be < n ({n})"}
    
    try:
        # Get data from simulation module
        data = get_hydrogen_solution(Z, n, l)
        
        if "error" in data:
            return data
            
        # Get Radial Plot
        radial_b64 = None
        if "radial_png" in data and isinstance(data["radial_png"], str):
            radial_b64 = data["radial_png"]
        elif "image_bytes" in data and isinstance(data["image_bytes"], str):
            radial_b64 = data["image_bytes"]
            
        # Get Heatmap Plot (Statioanry State)
        heatmap_b64 = None
        if "heatmap_png" in data and isinstance(data["heatmap_png"], str):
            heatmap_b64 = data["heatmap_png"]
        
        return {
            "energy_ev": data.get("energy", 0.0), 
            "avg_radius": data.get("avg_radius_a0", 0.0), 
            "image": radial_b64, # Default/Radial
            "heatmap": heatmap_b64 # Stationary 2D slice
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Server processing error: {str(e)}"}
    
# --- NEWTON'S LAWS ENDPOINTS ---

@app.post("/api/classic/newton/law1")
async def simulate_newton_law1(params: NewtonLaw1Params):
    return newton.calculate_law1(params.velocity, params.friction)

@app.post("/api/classic/newton/law2")
async def simulate_newton_law2(params: NewtonLaw2Params):
    return newton.calculate_law2(params.mass, params.force)

@app.post("/api/classic/newton/law3")
async def simulate_newton_law3(params: NewtonLaw3Params):
    return newton.calculate_law3(params.mass1, params.mass2, params.velocity1, params.velocity2)