import numpy as np
import matplotlib.pyplot as plt
import io
import base64

def simulate_wavepacket(E_val=50.0, width_val=2.0):
    # Физика
    x = np.linspace(-10, 10, 500)
    V = np.zeros_like(x)
    V[(x > -width_val/2) & (x < width_val/2)] = 30
    psi = np.exp(-(x + 5)**2) * np.exp(1j * E_val * x / 10.0)
    prob = np.abs(psi)**2

    # График
    plt.figure(figsize=(8, 4))
    plt.plot(x, V, 'r-', label='V(x) Potential', alpha=0.5)
    plt.plot(x, prob * 20, 'b-', label='|Psi|^2 Probability')
    plt.title(f"Quantum Simulation (E={E_val})")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()

    # Сохранение в память
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')