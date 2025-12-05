import numpy as np
import matplotlib.pyplot as plt
from scipy.sparse import diags
from scipy.sparse.linalg import splu
from scipy import constants
from scipy.integrate import simps
import io

# Фізичні константи
HBAR = constants.hbar
M_E = constants.m_e
EV = constants.electron_volt

class WavePacketSimulator:
    def __init__(self):
        # Параметри за замовчуванням або стан "порожньо"
        self.is_initialized = False
        self.psi = None
        self.x = None
        self.V = None
        self.lu = None
        self.B = None
        self.dt = None
        self.t = 0.0
        self.barriers = []
        self.U0_ev = 0
        self.energy_ev = 0

    def init_simulation(self, energy_ev, U0_ev, width_nm, gap_nm, n_barriers, use_absorber):
        # Сітка
        Nx = 1500 # Трохи менше точок для швидкості передачі по мережі
        L = 2.2e-7
        self.x = np.linspace(-L/2, L/2, Nx)
        dx = self.x[1] - self.x[0]
        self.dt = 4e-18
        self.t = 0.0
        self.U0_ev = U0_ev
        self.energy_ev = energy_ev

        # Побудова потенціалу
        self.V = np.zeros(Nx, dtype=np.complex128)
        width = width_nm * 1e-9
        gap = gap_nm * 1e-9
        total_span = n_barriers * width + max(0, n_barriers - 1) * gap
        start_x = -total_span / 2 + width / 2

        self.barriers = []
        for i in range(int(n_barriers)):
            left = start_x + i * (width + gap)
            right = left + width
            mask = (self.x >= left) & (self.x <= right)
            self.V[mask] = U0_ev * EV
            self.barriers.append((left * 1e9, right * 1e9))

        # Поглинаюча зона
        if use_absorber:
            absorb_width = 20e-9
            gamma_max = 1e-17
            left_mask = self.x < (self.x[0] + absorb_width)
            right_mask = self.x > (self.x[-1] - absorb_width)

            if np.any(left_mask):
                dist_left = (self.x[left_mask] - (self.x[0])) / absorb_width
                self.V[left_mask] += -1j * gamma_max * (1 - np.cos(np.pi * dist_left))**2
            if np.any(right_mask):
                dist_right = ((self.x[right_mask]) - (self.x[-1] - absorb_width)) / absorb_width
                self.V[right_mask] += -1j * gamma_max * (1 - np.cos(np.pi * dist_right))**2

        # Початковий пакет
        k0 = np.sqrt(2 * M_E * energy_ev * EV) / HBAR
        x0 = -80e-9 # Трохи ближче
        sigma = 6e-9
        self.psi = np.exp(-((self.x - x0) ** 2) / (4 * sigma ** 2)) * np.exp(1j * k0 * self.x)
        self.psi /= np.sqrt(simps(np.abs(self.psi) ** 2, self.x))

        # Crank-Nicolson
        r = 1j * HBAR * self.dt / (2 * M_E * dx**2)
        main_A = 1 + 2*r + 1j*self.dt*self.V/(2*HBAR)
        main_B = 1 - 2*r - 1j*self.dt*self.V/(2*HBAR)
        off = -r

        A = diags([off*np.ones(Nx-1), main_A, off*np.ones(Nx-1)], [-1,0,1], format="csc")
        B = diags([off*np.ones(Nx-1), main_B, off*np.ones(Nx-1)], [-1,0,1], format="csc")

        # Граничні умови
        A = A.tolil()
        B = B.tolil()
        A[-1, :] = 0; A[-1, -1] = 1
        B[0, :] = 0; B[0, 0] = 1
        B[-1, :] = 0; B[-1, -1] = 1
        
        A = A.tocsc()
        self.B = B.tocsc()
        self.lu = splu(A)
        self.is_initialized = True

    def step(self, steps=50):
        if not self.is_initialized: return
        
        # Робимо декілька фізичних кроків за один виклик API для швидкості
        for _ in range(steps):
            rhs = self.B.dot(self.psi)
            self.psi = self.lu.solve(rhs)
            self.t += self.dt
        
        # Ренормалізація іноді потрібна
        norm = simps(np.abs(self.psi) ** 2, self.x)
        self.psi /= np.sqrt(norm)

    def get_frame(self):
        if not self.is_initialized: return None

        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor('#0e1117')
        ax.set_facecolor('#0e1117')

        # Потенціал
        ax.plot(self.x * 1e9, np.real(self.V) / EV, lw=2, color='white', alpha=0.5, label="U(x)")
        ax.axhline(self.energy_ev, color='red', ls='--', lw=1, alpha=0.7, label="Energy")

        for l, r_ in self.barriers:
            ax.axvspan(l, r_, color='orange', alpha=0.3)

        # Пакет
        prob = np.abs(self.psi) ** 2
        scale_factor = max(0.5, self.U0_ev / 2.0) if self.U0_ev > 0 else 1.0
        if prob.max() > 0:
            prob_plot = prob / prob.max() * scale_factor
        else:
            prob_plot = prob

        ax.plot(self.x * 1e9, prob_plot, color='cyan', lw=2)
        ax.fill_between(self.x * 1e9, prob_plot, color='cyan', alpha=0.3)

        ax.set_ylim(0, max(np.max(prob_plot) * 1.5, self.U0_ev * 1.2, self.energy_ev * 1.2))
        ax.set_xlim(self.x[0] * 1e9, self.x[-1] * 1e9)
        ax.set_xlabel("x (нм)", color='white')
        ax.set_title(f"t = {self.t * 1e15:.1f} фс", color='white')
        
        # Стилізація
        ax.tick_params(colors='white')
        for spine in ax.spines.values():
            spine.set_color('white')

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight') # DPI менше для швидкості
        plt.close(fig)
        buf.seek(0)
        return buf.read()

# Глобальний екземпляр (спрощено для демо)
simulator = WavePacketSimulator()
