import numpy as np
import matplotlib
matplotlib.use('Agg') # Обов'язково для серверної генерації
import matplotlib.pyplot as plt
from scipy import constants
from scipy import linalg
import io

# -------------------------------------------------------------------------
# 1. КОНСТАНТИ
# -------------------------------------------------------------------------
HBAR = constants.hbar
M_E = constants.m_e
M_P = constants.m_p
EV = constants.electron_volt

# Використовуємо темний стиль, як ви і хотіли, або дефолтний з налаштуваннями
plt.style.use('default') 

# -------------------------------------------------------------------------
# 2. МАТЕМАТИЧНЕ ЯДРО (Без змін)
# -------------------------------------------------------------------------

def safe_sqrt_complex(x):
    return np.sqrt(x + 0j)

def get_k(E, m, U=0.0):
    val = 2.0 * m * (E - U)
    return safe_sqrt_complex(val) / HBAR

class BarrierSolver:
    def __init__(self, m):
        self.m = float(m)

    def solve_step(self, E, U0, x):
        x = np.array(x, dtype=float)
        k1 = complex(get_k(E, self.m, 0.0))

        if E > U0:
            k2 = complex(get_k(E, self.m, U0))
            R_amp = (k1 - k2) / (k1 + k2)
            T_amp = 2.0 * k1 / (k1 + k2)

            psi = np.zeros_like(x, dtype=complex)
            left = x < 0
            right = x >= 0

            psi[left] = np.exp(1j * k1 * x[left]) + R_amp * np.exp(-1j * k1 * x[left])
            psi[right] = T_amp * np.exp(1j * k2 * x[right])

            # Для T і R
            k1_r = k1.real if abs(k1.real) > 1e-18 else 1e-18
            k2_r = k2.real if abs(k2.real) > 1e-18 else 1e-18
            T = (k2_r / k1_r) * (abs(T_amp)**2)
            R = abs(R_amp)**2
            return np.real(psi), np.abs(psi)**2, T, R
        else:
            k2 = get_k(E, self.m, U0)
            kappa = abs(complex(k2).imag)
            psi = np.zeros_like(x, dtype=complex)
            left = x < 0
            right = x >= 0
            
            psi[left] = np.exp(1j * k1 * x[left]) + np.exp(-1j * k1 * x[left])
            psi[right] = np.exp(-kappa * x[right])
            
            return np.real(psi), np.abs(psi)**2, 0.0, 1.0

    def solve_rectangular(self, E, U0, L, x):
        x = np.array(x, dtype=float)
        k1 = complex(get_k(E, self.m, 0.0))
        k2_complex = complex(get_k(E, self.m, U0))

        # Розрахунок коефіцієнтів T і R (аналітичний)
        T = 0.0
        R = 1.0
        try:
            if E > U0:
                k2r = k2_complex.real
                denom = 1.0 + (U0**2 * (np.sin(k2r * L)**2)) / (4.0 * E * (E - U0))
                T = 1.0 / denom if denom != 0 else 0.0
            else:
                kappa = abs(k2_complex.imag)
                if kappa * L > 100.0:
                    T = 0.0
                else:
                    denom = 1.0 + (U0**2 * (np.sinh(kappa * L)**2)) / (4.0 * E * (U0 - E))
                    T = 1.0 / denom
            R = max(0.0, 1.0 - T)
        except:
            T, R = 0.0, 1.0

        # Побудова хвильової функції
        psi = np.zeros_like(x, dtype=complex)
        left = x < 0
        mid = (x >= 0) & (x <= L)
        right = x > L

        # Амплітуди (Матричний метод для хвильової функції)
        try:
            k1c = k1
            k2c = k2_complex
            denom_t = 2.0 * k1c * k2c * np.cos(k2c * L) - 1j * (k1c**2 + k2c**2) * np.sin(k2c * L)
            
            if np.abs(denom_t) < 1e-16:
                t_amp = 0.0; r_amp = 1.0
            else:
                t_amp = (2.0 * k1c * k2c * np.exp(-1j * k1c * L)) / denom_t
                r_amp = (1j * (k2c**2 - k1c**2) * np.sin(k2c * L)) / denom_t

            # Зона 1 (ліворуч)
            if np.any(left):
                psi[left] = np.exp(1j * k1 * x[left]) + r_amp * np.exp(-1j * k1 * x[left])

            # Зона 2 (всередині)
            if np.any(mid):
                # Система рівнянь для A і B всередині бар'єра
                # psi(0) = 1 + r = A + B
                # psi'(0) = ik1(1-r) = ik2(A-B)
                val_0 = 1.0 + r_amp
                der_0 = 1j * k1 * (1.0 - r_amp)
                
                # M * [A, B] = [val_0, der_0]
                # row1: A + B = val_0
                # row2: ik2*A - ik2*B = der_0  => A - B = der_0 / (ik2)
                
                term = der_0 / (1j * k2c) if abs(k2c) > 1e-15 else 0
                Acoef = (val_0 + term) / 2.0
                Bcoef = (val_0 - term) / 2.0
                
                psi[mid] = Acoef * np.exp(1j * k2c * x[mid]) + Bcoef * np.exp(-1j * k2c * x[mid])

            # Зона 3 (праворуч)
            if np.any(right):
                psi[right] = t_amp * np.exp(1j * k1 * x[right])

        except Exception:
            pass

        return np.real(psi), np.abs(psi)**2, T, R

    # Подвійний бар'єр (додано для сумісності з main.py)
    def solve_double(self, E, U0, L, d, x):
        """
        Розв'язок для подвійного прямокутного бар'єра.
        Бар'єр 1: [0, L]
        Яма/Проміжок: [L, L+d]
        Бар'єр 2: [L+d, 2L+d]
        """
        x = np.array(x, dtype=float)
        
        # Хвильові вектори
        # k - поза бар'єрами (U=0)
        # q - всередині бар'єрів (U=U0)
        k = complex(get_k(E, self.m, 0.0))
        q = complex(get_k(E, self.m, U0))

        # Уникаємо ділення на нуль
        if abs(k) < 1e-9: k = 1e-9 + 0j
        if abs(q) < 1e-9: q = 1e-9 + 0j

        # Система лінійних рівнянь Ax = b для коефіцієнтів [r, A, B, C, D, F, G, t]
        # 8 невідомих, 4 границі (по 2 рівняння на границю: неперервність пси та похідної)
        
        M_sys = np.zeros((8, 8), dtype=complex)
        b_vec = np.zeros(8, dtype=complex)

        # 1. Границя x=0 (1 + r = A + B; ...)
        M_sys[0, :] = [1, -1, -1, 0, 0, 0, 0, 0]
        M_sys[1, :] = [-1j*k, -1j*q, 1j*q, 0, 0, 0, 0, 0]
        b_vec[0] = -1
        b_vec[1] = -1j*k

        # 2. Границя x=L
        exp_qL = np.exp(1j*q*L)
        exp_mqL = np.exp(-1j*q*L)
        M_sys[2, :] = [0, exp_qL, exp_mqL, -1, -1, 0, 0, 0]
        M_sys[3, :] = [0, 1j*q*exp_qL, -1j*q*exp_mqL, -1j*k, 1j*k, 0, 0, 0]

        # 3. Границя x=L+d
        exp_kd = np.exp(1j*k*d)
        exp_mkd = np.exp(-1j*k*d)
        M_sys[4, :] = [0, 0, 0, exp_kd, exp_mkd, -1, -1, 0]
        M_sys[5, :] = [0, 0, 0, 1j*k*exp_kd, -1j*k*exp_mkd, -1j*q, 1j*q, 0]

        # 4. Границя x=2L+d
        # Використовуємо exp_qL, бо ширина другого бар'єра теж L
        M_sys[6, :] = [0, 0, 0, 0, 0, exp_qL, exp_mqL, -1]
        M_sys[7, :] = [0, 0, 0, 0, 0, 1j*q*exp_qL, -1j*q*exp_mqL, -1j*k]

        # Розв'язок
        try:
            coeffs = linalg.solve(M_sys, b_vec)
            r, A, B, C_c, D_c, F, G, t = coeffs
        except Exception:
            return np.zeros_like(x), np.zeros_like(x), 0.0, 1.0

        # Побудова хвильової функції по зонах
        psi = np.zeros_like(x, dtype=complex)
        
        mask_1 = x < 0
        mask_2 = (x >= 0) & (x < L)
        mask_3 = (x >= L) & (x < L + d)
        mask_4 = (x >= L + d) & (x < 2*L + d)
        mask_5 = x >= 2*L + d

        # Падаюча + відбита
        psi[mask_1] = np.exp(1j*k*x[mask_1]) + r*np.exp(-1j*k*x[mask_1])
        # Бар'єр 1
        psi[mask_2] = A*np.exp(1j*q*x[mask_2]) + B*np.exp(-1j*q*x[mask_2])
        # Яма (координата відносно початку зони L)
        psi[mask_3] = C_c*np.exp(1j*k*(x[mask_3]-L)) + D_c*np.exp(-1j*k*(x[mask_3]-L))
        # Бар'єр 2 (координата відносно L+d)
        psi[mask_4] = F*np.exp(1j*q*(x[mask_4]-(L+d))) + G*np.exp(-1j*q*(x[mask_4]-(L+d)))
        # Пройшла хвиля (координата відносно 2L+d)
        psi[mask_5] = t*np.exp(1j*k*(x[mask_5]-(2*L+d)))

        return np.real(psi), np.abs(psi)**2, abs(t)**2, abs(r)**2
      

# -------------------------------------------------------------------------
# 3. ВІЗУАЛІЗАЦІЯ (Адаптовано для повернення BytesIO)
# -------------------------------------------------------------------------

def plot_setup(ax, title, U_max):
    # Налаштування як у вас було
    ax.set_title(title, color='white', fontsize=14)
    ax.set_xlabel("x (м)", color='white')
    ax.set_ylabel("Енергія / Ψ", color='white')
    
    ymin = -abs(U_max) * 0.15
    ymax = abs(U_max) * 1.6 + 1e-30
    ax.set_ylim(ymin, ymax)
    
    ax.tick_params(colors='white')
    for spine in ['left', 'bottom', 'right', 'top']:
        ax.spines[spine].set_color('white')
    
    # Темний фон
    ax.set_facecolor('#0e1117')
    fig = ax.figure
    fig.patch.set_facecolor('#0e1117')
    ax.grid(True, linestyle=':', alpha=0.3, color='gray')

def draw_arrow(ax, x1, x2, y, text, color='white'):
    if abs(x2 - x1) < 1e-20: return
    ax.annotate('', xy=(x1, y), xytext=(x2, y), arrowprops=dict(arrowstyle='<->', color=color))
    ax.text((x1 + x2) / 2.0, y, text, ha='center', va='bottom', color=color,
            bbox=dict(facecolor='#0e1117', alpha=0.9, edgecolor='none', boxstyle='round,pad=0.1'))

def finalize_plot(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf.read()

# --- Експортні функції для main.py ---

def plot_step_barrier(m, E, U0):
    solver = BarrierSolver(m)
    x = np.linspace(-2e-9, 2e-9, 1000)
    psi_real, psi_prob, T, R = solver.solve_step(E, U0, x)

    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Заголовок з T і R
    title = f"Сходинка: T={T:.4f}, R={R:.4f}"
    plot_setup(ax, title, max(E, U0))

    # Малюємо потенціал
    U_viz = np.where(x >= 0, U0, 0.0)
    ax.plot(x, U_viz, 'w-', lw=2, label='U(x)')
    ax.axhline(E, color='r', ls='--', label=f'E = {E/EV:.2f} еВ')

    # Масштабування для краси
    scale = (abs(E) + 0.5 * abs(U0) + 1e-20)
    
    psi_norm = np.max(np.abs(psi_real))
    if psi_norm > 0:
        psi_plot = E + psi_real / psi_norm * scale * 0.5
    else:
        psi_plot = E + psi_real

    prob_norm = np.max(psi_prob)
    if prob_norm > 0:
        prob_plot = E + psi_prob / prob_norm * scale * 0.5
    else:
        prob_plot = E + psi_prob

    ax.plot(x, psi_plot, color='cyan', alpha=0.9, label=r'Re($\Psi$)')
    ax.plot(x, prob_plot, color='lime', ls=':', lw=2, label=r'$|\Psi|^2$')
    
    ax.legend(loc='upper right', facecolor='#0e1117', labelcolor='white')
    return finalize_plot(fig)

def plot_rectangular_barrier(m, E, U0, L):
    solver = BarrierSolver(m)
    # Трохи ширший діапазон для огляду
    x = np.linspace(-1.5 * L - 1e-9, 2.5 * L + 1e-9, 1200)
    psi_real, psi_prob, T, R = solver.solve_rectangular(E, U0, L, x)

    fig, ax = plt.subplots(figsize=(10, 6))
    
    title = f"Прямокутний бар'єр: T={T:.4e}, R={R:.4f}"
    plot_setup(ax, title, max(E, U0))

    # Потенціал
    U_viz = np.zeros_like(x)
    U_viz[(x >= 0) & (x <= L)] = U0
    ax.plot(x, U_viz, 'w-', lw=2, label='U(x)')
    ax.axhline(E, color='r', ls='--', label=f'E = {E/EV:.2f} еВ')

    # Масштабування
    scale = max(abs(U0), abs(E)) * 0.6
    
    psi_norm = np.max(np.abs(psi_real))
    if psi_norm > 0:
        psi_plot = E + psi_real / psi_norm * scale
    else:
        psi_plot = E + psi_real

    prob_norm = np.max(psi_prob)
    if prob_norm > 0:
        prob_plot = E + psi_prob / prob_norm * scale
    else:
        prob_plot = E + psi_prob

    ax.plot(x, psi_plot, color='cyan', alpha=0.9, label=r'Re($\Psi$)')
    ax.plot(x, prob_plot, color='lime', ls=':', lw=2, label=r'$|\Psi|^2$')
    
    draw_arrow(ax, 0.0, L, U0 * 1.05, f"L = {L*1e9:.1f} нм")
    ax.legend(loc='upper right', facecolor='#0e1117', labelcolor='white')
    
    return finalize_plot(fig)

def plot_double_barrier(m, E, U0, L, d):
    solver = BarrierSolver(m)
    
    total_width = 2*L + d
    margin = max(total_width, 2e-9)
    x = np.linspace(-margin, total_width + margin, 1500)
    
    psi_real, psi_prob, T, R = solver.solve_double(E, U0, L, d, x)

    fig, ax = plt.subplots(figsize=(10, 6))
    title = f"Подвійний бар'єр: T={T:.4e}, R={R:.4f}"
    plot_setup(ax, title, max(E, U0))

    # Потенціал
    U_viz = np.zeros_like(x)
    U_viz[(x >= 0) & (x <= L)] = U0
    U_viz[(x >= L+d) & (x <= 2*L+d)] = U0
    
    ax.plot(x, U_viz, 'w-', lw=2, label='U(x)')
    ax.axhline(E, color='r', ls='--', label=f'E = {E/EV:.2f} еВ')

    # Масштабування
    scale = (abs(E) + 0.5 * abs(U0) + 1e-20)
    psi_norm = np.max(np.abs(psi_real))
    
    psi_plot = E + psi_real / (psi_norm if psi_norm > 0 else 1) * scale * 0.5
    prob_plot = E + psi_prob / (np.max(psi_prob) if np.max(psi_prob) > 0 else 1) * scale * 0.5

    ax.plot(x, psi_plot, color='cyan', alpha=0.9, label=r'Re($\Psi$)')
    ax.plot(x, prob_plot, color='lime', ls=':', lw=2, label=r'$|\Psi|^2$')
    
    # Розміри
    draw_arrow(ax, 0.0, L, U0 * 1.05, "L")
    draw_arrow(ax, L, L+d, U0 * 0.5, "d", color='gray')
    draw_arrow(ax, L+d, 2*L+d, U0 * 1.05, "L")

    ax.legend(loc='upper right', facecolor='#0e1117', labelcolor='white')
    return finalize_plot(fig)