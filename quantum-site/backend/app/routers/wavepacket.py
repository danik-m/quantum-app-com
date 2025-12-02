# File: backend/logic/wavepacket_core.py
"""
Чистый вычислительный модуль для волнового пакета — без Streamlit.
Экспортирует функцию `simulate_wavepacket_json(...)`, принимающую энергию E (в эВ)
и возвращающую JSON-совместимый словарь с результатами:
 - transmission: коэффициент прохождения (float 0..1)
 - reflection: коэффициент отражения (float 0..1)
 - max_prob: максимум плотности вероятности (float)
 - x: список координат (нм, downsampled)
 - prob: список плотности вероятности (downsampled)
 - image_base64: PNG (base64) с графиком (опционально)

Как использовать: импортируйте функцию в FastAPI и возвращайте её результат как JSON.
"""

import numpy as np
from scipy import constants
from scipy.integrate import simpson
from scipy.sparse import diags
from scipy.sparse.linalg import splu
import matplotlib.pyplot as plt
import io
import base64

# Физические константы
HBAR = constants.hbar
M_E = constants.m_e
EV = constants.electron_volt


def _make_potential(x, n_barriers=2, width_nm=2.0, gap_nm=6.0, U0_ev=80.0):
    width = width_nm * 1e-9
    gap = gap_nm * 1e-9
    Nx = x.size
    V = np.zeros(Nx, dtype=np.complex128)
    total_span = n_barriers * width + max(0, n_barriers - 1) * gap
    start_x = -total_span / 2 + width / 2
    for i in range(n_barriers):
        left = start_x + i * (width + gap)
        right = left + width
        mask = (x >= left) & (x <= right)
        V[mask] = U0_ev * EV
    return V


def _apply_absorber(V, x, absorb_width=20e-9, gamma_max=1e-17):
    # добавляем мнимую часть в V по краям для поглощения
    left_mask = x < (x[0] + absorb_width)
    right_mask = x > (x[-1] - absorb_width)
    if np.any(left_mask):
        dist_left = (x[left_mask] - x[0]) / absorb_width
        V[left_mask] += -1j * gamma_max * (1 - np.cos(np.pi * dist_left))**2
    if np.any(right_mask):
        dist_right = (x[right_mask] - (x[-1] - absorb_width)) / absorb_width
        V[right_mask] += -1j * gamma_max * (1 - np.cos(np.pi * dist_right))**2
    return V


def simulate_wavepacket_json(E_ev=60.0,
                             U0_ev=80.0,
                             width_nm=2.0,
                             gap_nm=6.0,
                             n_barriers=2,
                             Nx=1500,
                             steps=800,
                             dt=4e-18,
                             absorber=True,
                             downsample=5,
                             return_image=True):
    """Выполнить симуляцию и вернуть JSON-совместимый результат.

    Параметры:
      E_ev: энергия пакета в эВ (float)
      U0_ev: высота барьера (эВ)
      width_nm, gap_nm, n_barriers: геометрия
      Nx: число точек по x
      steps: число временных шагов (схема Crank-Nicolson)
      dt: временной шаг
      absorber: использовать ли поглотитель по краям
      downsample: шаг при выдаче массива x/prob (чтобы уменьшить размер)
      return_image: включать ли base64 изображения

    Возвращает dict, пригодный для JSON.
    """
    # Пространственная сетка
    L = 2.2e-7
    x = np.linspace(-L/2, L/2, Nx)
    dx = x[1] - x[0]

    # Потенциал
    V = _make_potential(x, n_barriers=n_barriers, width_nm=width_nm, gap_nm=gap_nm, U0_ev=U0_ev)
    if absorber:
        V = _apply_absorber(V, x)

    # Начальный пакет
    k0 = np.sqrt(2 * M_E * E_ev * EV) / HBAR
    x0 = -100e-9
    sigma = 6e-9
    psi = np.exp(-((x - x0)**2) / (4 * sigma**2)) * np.exp(1j * k0 * x)
    psi /= np.sqrt(simpson(np.abs(psi)**2, x=x))

    # Crank-Nicolson коэффициент
    r = 1j * HBAR * dt / (2 * M_E * dx**2)
    main_A = 1 + 2*r + 1j*dt*V/(2*HBAR)
    main_B = 1 - 2*r - 1j*dt*V/(2*HBAR)
    off = -r

    A = diags([off*np.ones(Nx-1), main_A, off*np.ones(Nx-1)], [-1,0,1], format='csc')
    B = diags([off*np.ones(Nx-1), main_B, off*np.ones(Nx-1)], [-1,0,1], format='csc')

    # Наложим простые Dirichlet-условия (psi=0) на границы, чтобы избежать проблем с LU
    A = A.tolil()
    B = B.tolil()
    A[0, :] = 0
    A[0, 0] = 1
    A[-1, :] = 0
    A[-1, -1] = 1
    B[0, :] = 0
    B[0, 0] = 1
    B[-1, :] = 0
    B[-1, -1] = 1
    A = A.tocsc()
    B = B.tocsc()

    lu = splu(A)

    # Временная эволюция
    for step in range(steps):
        rhs = B.dot(psi)
        psi = lu.solve(rhs)
        if step % 50 == 0:
            norm = simpson(np.abs(psi)**2, x=x)
            psi /= np.sqrt(norm)

    prob = np.abs(psi)**2

    # Разбиение: левое/правое для коэффициентов
    mid = np.searchsorted(x, 0.0)
    left_prob = simpson(prob[:mid], x=x[:mid])
    right_prob = simpson(prob[mid:], x=x[mid:])
    total = left_prob + right_prob
    # нормируем на случай численных ошибок
    if total == 0:
        transmission = 0.0
        reflection = 0.0
    else:
        transmission = float(right_prob / total)
        reflection = float(left_prob / total)

    max_prob = float(prob.max())

    # Подготовка массивов для отдачи клиенту (downsample)
    xs = (x*1e9)[::downsample].tolist()  # в нм
    probs = prob[::downsample].tolist()

    result = {
        "transmission": transmission,
        "reflection": reflection,
        "max_prob": max_prob,
        "x_nm": xs,
        "prob": probs,
    }

    # График
    if return_image:
        fig, ax = plt.subplots(figsize=(8,4))
        ax.plot(x*1e9, np.real(V)/EV, label='V (eV)')
        ax.plot(x*1e9, prob/ (prob.max() if prob.max()>0 else 1.0) * max(0.5, U0_ev/2.0), label='|psi|^2 (scaled)')
        ax.axvline(0.0, color='gray', lw=0.7)
        ax.set_xlabel('x (nm)')
        ax.legend()
        plt.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=120)
        plt.close(fig)
        buf.seek(0)
        encoded = base64.b64encode(buf.read()).decode('ascii')
        result['image_base64'] = encoded

    return result


# Если модуль запускается напрямую, показать примерной запуск
if __name__ == '__main__':
    out = simulate_wavepacket_json(E_ev=60.0, steps=400)
    print({k: out[k] for k in ('transmission','reflection','max_prob')})
