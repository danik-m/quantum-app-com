import numpy as np
import matplotlib
matplotlib.use('Agg') # Для роботи на сервері без вікна
import matplotlib.pyplot as plt
import math
import io
from scipy.special import hermite, factorial
from scipy import constants

# --- КОНСТАНТИ ---
HBAR = constants.hbar
M_E = constants.m_e
EV = constants.electron_volt

# Стиль
plt.style.use('default')

# --- МАТЕМАТИКА ---

def calc_harmonic_energy(omega, n):
    """E_n = hbar * omega * (n + 0.5)"""
    return HBAR * omega * (n + 0.5)

def psi_oscillator(x, m, omega, n):
    """Хвильова функція (Поліноми Ерміта)"""
    # alpha = 1 / x_0, де x_0 = sqrt(hbar / (m*omega))
    # x_0 - характеристична довжина осцилятора
    val = np.sqrt(m * omega / HBAR)
    xi = val * x
    
    # Нормувальний коефіцієнт: N_n = 1 / sqrt(2^n * n! * sqrt(pi) * x_0)
    # Оскільки val = 1/x_0, то sqrt(val/sqrt(pi)) коректно.
    
    # Захист від переповнення факторіалу для великих n
    if n > 100: n = 100
    
    norm_coef = 1.0 / np.sqrt((2**n) * math.factorial(n)) * np.sqrt(val / np.sqrt(np.pi))
    
    Hn = hermite(n)
    psi = norm_coef * np.exp(-0.5 * xi**2) * Hn(xi)
    return psi

# --- ВІЗУАЛІЗАЦІЯ ---

def plot_harmonic_oscillator(m, omega, n):
    # Розрахунок енергії
    E_n = calc_harmonic_energy(omega, n)
    
    # Класичні точки повороту: E = 0.5 * m * w^2 * x^2  => x = sqrt(2E / mw^2)
    if m > 0 and omega > 0:
        x_turn = np.sqrt(2.0 * E_n / (m * omega**2))
    else:
        x_turn = 1e-9

    # Межі графіка (трохи ширше за класичну область, щоб бачити "хвости" хвилі)
    # Для вищих рівнів амплітуда росте, беремо запас
    x_lim = x_turn * 3.5 if n == 0 else x_turn * 1.8
    x = np.linspace(-x_lim, x_lim, 1000)

    # Потенціал
    U = 0.5 * m * omega**2 * x**2

    # Хвильова функція
    psi = psi_oscillator(x, m, omega, n)
    prob = psi**2

    # --- Побудова Графіка ---
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Налаштування стилю (Темний)
    ax.set_facecolor('#0e1117')
    fig.patch.set_facecolor('#0e1117')
    ax.tick_params(colors='white')
    for spine in ax.spines.values():
        spine.set_color('white')
    ax.grid(True, linestyle=':', alpha=0.3, color='gray')
    
    ax.set_title(f"Гармонічний Осцилятор (n={n})", color='white', fontsize=14)
    ax.set_xlabel("x (м)", color='white')
    ax.set_ylabel("Енергія / Ψ", color='white')

    # 1. Потенціал
    ax.plot(x, U, color='white', linewidth=2, label='U(x)')
    
    # 2. Рівень енергії
    ax.hlines(E_n, -x_lim, x_lim, colors='red', linestyles='--', linewidth=1.5, label=f'E_{n} = {E_n/EV:.3f} еВ')

    # 3. Масштабування хвильової функції для відображення на фоні енергії
    # Знаходимо "висоту" для малювання: приблизно відстань між рівнями hbar*omega
    hw = HBAR * omega
    scale = hw * 0.6
    
    # Нормуємо psi для візуалізації, щоб максимум був ~scale
    psi_max = np.max(np.abs(psi))
    if psi_max > 0:
        psi_plot = E_n + (psi / psi_max) * scale
        prob_plot = E_n + (prob / np.max(prob)) * scale
    else:
        psi_plot = E_n + psi
        prob_plot = E_n + prob

    # 4. Малювання хвилі
    ax.plot(x, psi_plot, color='cyan', linewidth=2, label=r'$\Psi(x)$')
    ax.plot(x, prob_plot, color='magenta', linestyle=':', linewidth=2, label=r'$|\Psi|^2$')
    
    # Заливка ймовірності
    ax.fill_between(x, E_n, prob_plot, color='magenta', alpha=0.2)

    # Ліміти Y
    ax.set_ylim(0, E_n + hw * 1.5)
    
    ax.legend(loc='upper right', facecolor='#0e1117', labelcolor='white')

    # Збереження в байт-потік
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf.read()