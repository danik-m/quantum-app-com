import numpy as np

def calculate_gyroscope_physics(mass_kg, radius_m, length_m, rpm, theta_deg):
    """
    Розраховує фізику важкого гіроскопа (дзиґи).
    
    Параметри:
    mass_kg -- маса диска (кг)
    radius_m -- радіус диска (м)
    length_m -- відстань від точки опори до центру мас (м)
    rpm -- швидкість обертання диска (об/хв)
    theta_deg -- кут нахилу осі до вертикалі (градуси)
    """
    
    # Конвертація одиниць
    omega_s = rpm * (2 * np.pi / 60)  # спін в рад/с
    theta_rad = np.radians(theta_deg)
    g = 9.81
    
    # 1. Момент інерції суцільного диска: I = 0.5 * m * r^2
    I_disk = 0.5 * mass_kg * (radius_m ** 2)
    
    # 2. Момент імпульсу (власний): L = I * omega
    L_spin = I_disk * omega_s
    
    # 3. Момент сили тяжіння (Torque): M = m * g * l * sin(theta)
    # Це зовнішній момент, що викликає прецесію
    torque = mass_kg * g * length_m * np.sin(theta_rad)
    
    # 4. Кутова швидкість прецесії: Omega = M / (L * sin(theta))
    # Для швидкого гіроскопа: Omega = (mgl) / (I * omega)
    # Зверніть увагу: sin(theta) скорочується в наближенні швидкого обертання,
    # але формула Omega_precession = Torque / (L_spin * sin(theta)) є загальною для вектору.
    
    if L_spin > 1e-6 and np.sin(theta_rad) > 1e-6:
        omega_precession = torque / (L_spin * np.sin(theta_rad))
    else:
        omega_precession = 0.0

    # Період прецесії
    T_precession = (2 * np.pi / omega_precession) if omega_precession > 0 else 0

    return {
        "I_kgm2": I_disk,
        "L_kgm2s": L_spin,
        "torque_Nm": torque,
        "omega_precession_rad_s": omega_precession,
        "T_precession_s": T_precession,
        "omega_spin_rad_s": omega_s
    }