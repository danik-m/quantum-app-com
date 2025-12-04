# simulation/wells.py
import numpy as np
import matplotlib.pyplot as plt
from scipy import constants
from scipy import optimize
from scipy.integrate import simpson
import io
import base64

# Константы
HBAR = constants.hbar
EV = constants.electron_volt
M_E = constants.m_e
M_P = constants.m_p

plt.style.use('dark_background')

# ===================== МАТЕМАТИЧЕСКОЕ ЯДРО =====================
def solve_finite_well_energies(m, L, U0_joule):
    if U0_joule <= 0 or L <= 0:
        return []

    try:
        eta = L/2.0 * np.sqrt(2.0 * m * U0_joule) / HBAR
    except:
        return []

    if eta < 1e-6:
        return []

    max_n = min(200, int(np.ceil(eta / (np.pi/2.0))) + 5)
    roots_z = []
    eps = 1e-8

    def even_eq(z):
        inside = np.clip((eta/z)**2 - 1.0, 0.0, None)
        return np.tan(z) - np.sqrt(inside)

    def odd_eq(z):
        inside = np.clip((eta/z)**2 - 1.0, 0.0, None)
        return -1.0/np.tan(z) - np.sqrt(inside)

    for n in range(max_n):
        a = n * np.pi/2.0 + eps
        b = min((n + 1) * np.pi/2.0 - eps, eta - eps)
        if a >= b:
            continue

        for eq, parity in [(even_eq, 'even'), (odd_eq, 'odd')]:
            try:
                fa, fb = eq(a), eq(b)
                if np.isfinite(fa) and np.isfinite(fb) and fa * fb <= 0:
                    root = optimize.brentq(eq, a, b, xtol=1e-12)
                    if 0 < root < eta:
                        roots_z.append((parity, root))
            except:
                pass

    energies = []
    for parity, z in roots_z:
        E = (HBAR ** 2 * (2.0 * z / L) ** 2) / (2.0 * m)
        if E < U0_joule:
            kappa = np.sqrt(2.0 * m * (U0_joule - E)) / HBAR
            energies.append({
                'E': float(E),
                'k': 2.0 * z / L,
                'kappa': float(kappa),
                'parity': parity
            })

    return sorted(energies, key=lambda x: x['E'])


def solve_inf_well_energies(m, L, n_max=10):
    energies = []
    for n in range(1, n_max + 1):
        E = (n**2 * np.pi**2 * HBAR**2) / (2.0 * m * L**2)
        energies.append({
            'E': E,
            'n': n,
            'parity': 'even' if n % 2 == 1 else 'odd'
        })
    return energies


def get_wavefunction_finite(x_math, energy_data, L):
    psi = np.zeros_like(x_math)
    k, kappa, parity = energy_data['k'], energy_data['kappa'], energy_data['parity']
    a = L / 2.0
    val_edge = np.cos(k*a) if parity == 'even' else np.sin(k*a)

    for i, x in enumerate(x_math):
        if abs(x) <= a:
            psi[i] = np.cos(k*x) if parity == 'even' else np.sin(k*x)
        else:
            exponent = kappa * (a - abs(x))
            if exponent < -700:
                val = 0.0
            else:
                val = val_edge * np.exp(exponent)
            psi[i] = val if (parity == 'even' or x > 0) else -val

    norm = np.sqrt(simpson(psi**2, x_math))
    return psi / norm if norm > 0 else psi


def get_wavefunction_inf(x_plot, n, L):
    psi = np.zeros_like(x_plot)
    mask = (x_plot >= 0) & (x_plot <= L)
    psi[mask] = np.sqrt(2.0 / L) * np.sin(n * np.pi * x_plot[mask] / L)
    return psi


# ===================== ВИЗУАЛИЗАЦИЯ =====================
def _setup_fig():
    fig, ax = plt.subplots(figsize=(12, 7))
    fig.patch.set_facecolor('#0E1117')
    ax.set_facecolor('#0E1117')
    for spine in ax.spines.values():
        spine.set_color('#444444')
    ax.tick_params(colors='white')
    ax.grid(True, linestyle='--', alpha=0.3, color='gray')
    return fig, ax


def plot_finite_well(m: float, L: float, U0_ev: float, n: int = 1) -> bytes:
    U0_joule = U0_ev * EV
    energies = solve_finite_well_energies(m, L, U0_joule)
    if not energies or n > len(energies):
        raise ValueError("No states or invalid n")

    state = energies[n-1]
    E_ev = state['E'] / EV

    fig, ax = _setup_fig()
    x = np.linspace(-2*L, 2*L, 3000)
    x_math = x - L/2.0

    # Потенциал
    U_pot = np.where((x >= 0) & (x <= L), 0, U0_ev)
    ax.plot(x, U_pot, color='white', linewidth=2.5)
    ax.fill_between(x, 0, U0_ev, where=(x <= 0), color='#4A90E2', alpha=0.3)
    ax.fill_between(x, 0, U0_ev, where=(x >= L), color='#4A90E2', alpha=0.3)
    ax.text(0, U0_ev * 1.05, f"U₀ = {U0_ev:.1f} eV", color='white', fontsize=12)

    # Хвильовая функция
    psi = get_wavefunction_finite(x_math, state, L)
    prob = psi**2
    psi_norm = psi / np.max(np.abs(psi)) if np.max(np.abs(psi)) > 0 else psi
    prob_norm = prob / np.max(prob)

    scale = E_ev * 0.4 if E_ev > 1e-3 else 1.0
    psi_shifted = E_ev + psi_norm * scale
    prob_shifted = E_ev + prob_norm * scale

    ax.hlines(E_ev, x[0], x[-1], colors='red', linestyles='--', alpha=0.8)
    ax.text(x[-1], E_ev, f"  Eₙ = {E_ev:.3e} eV  (n={n})", color='red', va='center', fontsize=12, fontweight='bold')

    ax.plot(x, psi_shifted, color='cyan', linewidth=2.2, label='ψ(x)')
    ax.fill_between(x, E_ev, psi_shifted, color='cyan', alpha=0.15)
    ax.plot(x, prob_shifted, color='lime', linestyle=':', linewidth=2, label='|ψ|²')

    ax.set_ylim(-U0_ev * 0.1, U0_ev * 1.4)
    ax.set_xlim(x[0], x[-1])
    ax.set_title(f"Кінцева потенціальна яма — стан n = {n}", color='white', fontsize=16, pad=20)
    ax.legend(loc='upper right', facecolor='#262730', labelcolor='white')

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def plot_inf_well(m: float, L: float, n: int = 1) -> bytes:
    energies = solve_inf_well_energies(m, L, n_max=10)
    state = energies[n-1]
    E_ev = state['E'] / EV

    fig, ax = _setup_fig()
    x = np.linspace(0, L, 2000)

    # Стенки
    ax.axvline(0, color='white', linewidth=4)
    ax.axvline(L, color='white', linewidth=4)
    ymax = E_ev * 2 if n <= 3 else energies[-1]['E']/EV * 1.3
    ax.fill_betweenx([-ymax, ymax], 0, L, color='#0E1117', alpha=1)
    ax.hlines(0, 0, L, color='white', linewidth=1.5)

    # Волновая функция
    psi = get_wavefunction_inf(x, n, L)
    prob = psi**2
    psi_norm = psi / np.max(np.abs(psi)) if np.max(np.abs(psi)) > 0 else psi
    prob_norm = prob / np.max(prob)

    scale = E_ev * 0.4 if E_ev > 1e-3 else 1.0
    psi_shifted = E_ev + psi_norm * scale
    prob_shifted = E_ev + prob_norm * scale

    ax.hlines(E_ev, 0, L, colors='red', linestyles='--', alpha=0.8)
    ax.text(L, E_ev, f"  Eₙ = {E_ev:.3e} eV  (n={n})", color='red', va='center', fontsize=12, fontweight='bold')

    ax.plot(x, psi_shifted, color='cyan', linewidth=2.2)
    ax.fill_between(x, E_ev, psi_shifted, color='cyan', alpha=0.15)
    ax.plot(x, prob_shifted, color='lime', linestyle=':', linewidth=2)

    ax.set_ylim(-ymax * 0.1, ymax * 1.2)
    ax.set_xlim(0, L)
    ax.set_title(f"Нескінченна потенціальна яма — стан n = {n}", color='white', fontsize=16, pad=20)

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf.read()