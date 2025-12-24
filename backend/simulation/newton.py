import numpy as np
from typing import Dict, List, Any, Tuple

class NewtonLawsSimulation:
    """
    Клас для моделювання трьох законів Ньютона.
    Забезпечує точні фізичні розрахунки для перевірки або генерації траєкторій.
    """

    def __init__(self):
        self.g = 9.81

    def calculate_law_1(self, v0: float, friction_coeff: float, dt: float, duration: float) -> Dict[str, Any]:
        """
        1-й закон: Тіло рухається рівномірно прямолінійно, якщо сума сил = 0.
        Якщо є тертя, то виникає сила, що сповільнює тіло.
        """
        steps = int(duration / dt)
        t = np.linspace(0, duration, steps)
        
        # Якщо тертя немає (інерціальна система, ізольована)
        if friction_coeff == 0:
            v = np.full_like(t, v0)
            a = np.zeros_like(t)
            x = v0 * t
        else:
            # Сила тертя F_fr = -mu * m * g * sign(v)
            # a = F_fr / m = -mu * g * sign(v)
            # Ми припускаємо, що рух одновимірний вздовж осі X
            
            # Час до зупинки: t_stop = |v0| / |a|
            deceleration = friction_coeff * self.g
            if v0 == 0:
                t_stop = 0
            else:
                t_stop = abs(v0) / deceleration
            
            v = []
            x = []
            a = []
            
            current_x = 0
            current_v = v0
            
            for time_step in t:
                if time_step >= t_stop:
                    acc = 0
                    vel = 0
                else:
                    acc = -np.sign(v0) * deceleration
                    vel = v0 + acc * time_step
                
                # Точніше інтегрування для позиції: x = x0 + v0*t + 0.5*a*t^2 (для ділянки руху)
                if time_step <= t_stop:
                    pos = v0 * time_step + 0.5 * (-np.sign(v0) * deceleration) * (time_step**2)
                else:
                    # Позиція зупинки
                    pos = v0 * t_stop + 0.5 * (-np.sign(v0) * deceleration) * (t_stop**2)

                v.append(vel)
                x.append(pos)
                a.append(acc)

        return {
            "time": t.tolist(),
            "position": x if isinstance(x, list) else x.tolist(),
            "velocity": v if isinstance(v, list) else v.tolist(),
            "acceleration": a if isinstance(a, list) else a.tolist()
        }

    def calculate_law_2(self, force: float, mass: float, dt: float, duration: float) -> Dict[str, Any]:
        """
        2-й закон: F = ma => a = F/m.
        Повертає кінематичні характеристики при постійній силі.
        """
        if mass <= 0:
            raise ValueError("Маса повинна бути додатною")
            
        acceleration = force / mass
        steps = int(duration / dt)
        t = np.linspace(0, duration, steps)
        
        # v = v0 + at (припускаємо v0=0)
        v = acceleration * t
        # x = x0 + v0t + 0.5at^2
        x = 0.5 * acceleration * t**2
        
        a = np.full_like(t, acceleration)
        
        momentum = mass * v # p = mv
        
        return {
            "time": t.tolist(),
            "acceleration": a.tolist(),
            "velocity": v.tolist(),
            "position": x.tolist(),
            "momentum": momentum.tolist(),
            "force": force
        }

    def calculate_law_3(self, m1: float, m2: float, v1_initial: float, v2_initial: float) -> Dict[str, Any]:
        """
        3-й закон: Дія дорівнює протидії.
        Моделюємо абсолютно пружний удар двох тіл.
        Сили взаємодії діють лише в момент контакту, F12 = -F21.
        Зміна імпульсу dp1/dt = -dp2/dt.
        """
        # Швидкості після удару (1D пружне зіткнення)
        v1_final = ((m1 - m2) * v1_initial + 2 * m2 * v2_initial) / (m1 + m2)
        v2_final = ((2 * m1) * v1_initial + (m2 - m1) * v2_initial) / (m1 + m2)
        
        # Імпульси
        p1_initial = m1 * v1_initial
        p2_initial = m2 * v2_initial
        p1_final = m1 * v1_final
        p2_final = m2 * v2_final
        
        delta_p1 = p1_final - p1_initial
        delta_p2 = p2_final - p2_initial
        
        # Сила це швидкість зміни імпульсу. F_avg * delta_t = delta_p
        # F12 = delta_p1 / dt, F21 = delta_p2 / dt
        # Оскільки delta_p1 = -delta_p2, то F12 = -F21
        
        return {
            "body1": {
                "mass": m1,
                "v_initial": v1_initial,
                "v_final": v1_final,
                "delta_p": delta_p1
            },
            "body2": {
                "mass": m2,
                "v_initial": v2_initial,
                "v_final": v2_final,
                "delta_p": delta_p2
            },
            "verification": {
                "momentum_conserved": np.isclose(p1_initial + p2_initial, p1_final + p2_final),
                "action_reaction_valid": np.isclose(delta_p1, -delta_p2)
            }
        }