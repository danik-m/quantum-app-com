import math

# Конвертаційні коефіцієнти (до стандартних SI: кг, м, м/с, Н)
MASS_TO_KG = {
    'kg': 1.0,
    'g': 0.001,
    'dag': 0.01,
    'gr': 0.00006479891,  # grains
    'dr': 0.00177185,     # drachms
    'oz': 0.0283495,      # ounces
    'lb': 0.453592,       # pounds
    'st': 6.35029         # stones
}

DIST_TO_METER = {
    'm': 1.0,
    'mm': 0.001,
    'cm': 0.01,
    'km': 1000.0,
    'in': 0.0254,
    'ft': 0.3048,
    'yd': 0.9144,
    'mi': 1609.34
}

VELOCITY_TO_MS = {
    'm/s': 1.0,
    'km/h': 0.277778,
    'ft/s': 0.3048,
    'mph': 0.44704,
    'ft/min': 0.00508,
    'm/min': 0.0166667
}

FORCE_FROM_NEWTON = {
    'N': 1.0,
    'kN': 0.001,
    'pdl': 7.23301,       # poundals
    'lbf': 0.224809       # pounds-force
}

def calculate_centrifugal_physics(mass_val, mass_unit, radius_val, radius_unit, velocity_val, velocity_unit):
    """
    Виконує розрахунок відцентрової сили та конвертацію результатів.
    Вхідні дані конвертуються в SI, рахуються, а потім конвертуються у всі запитані формати.
    """
    
    # 1. Конвертація в SI (kg, m, m/s)
    m_kg = mass_val * MASS_TO_KG.get(mass_unit, 1.0)
    r_m = radius_val * DIST_TO_METER.get(radius_unit, 1.0)
    v_ms = velocity_val * VELOCITY_TO_MS.get(velocity_unit, 1.0)

    # 2. Фізичні розрахунки
    # F = mv^2 / r
    # a = v^2 / r
    # omega = v / r
    
    if r_m == 0:
        return {"error": "Radius cannot be zero"}

    force_N = (m_kg * (v_ms ** 2)) / r_m
    acc_ms2 = (v_ms ** 2) / r_m
    omega_rad_s = v_ms / r_m
    
    # Ефективна вага (те саме що сила в даному контексті, але в одиницях маси на Землі)
    # Effective Mass = Force / g_earth
    g_earth = 9.80665
    effective_mass_kg = force_N / g_earth

    # 3. Форматування результатів для всіх одиниць
    
    results = {
        "physics": {
            "force_N": force_N,
            "acc_ms2": acc_ms2,
            "omega_rad_s": omega_rad_s,
            "g_force": acc_ms2 / g_earth
        },
        "conversions": {
            "mass": {},
            "radius": {},
            "velocity": {},
            "angular_velocity": {},
            "force": {},
            "effective_mass": {},
            "acceleration": {}
        }
    }

    # Заповнення маси
    for unit, coef in MASS_TO_KG.items():
        results["conversions"]["mass"][unit] = m_kg / coef

    # Заповнення радіусу
    for unit, coef in DIST_TO_METER.items():
        results["conversions"]["radius"][unit] = r_m / coef
    # Додатково ft / in (комбіноване)
    feet = int(r_m / 0.3048)
    inches = ((r_m / 0.3048) - feet) * 12
    results["conversions"]["radius"]["ft_in"] = f"{feet} ft {inches:.1f} in"
    # Додатково m / cm
    meters_part = int(r_m)
    cm_part = (r_m - meters_part) * 100
    results["conversions"]["radius"]["m_cm"] = f"{meters_part} m {cm_part:.1f} cm"

    # Заповнення лінійної швидкості
    for unit, coef in VELOCITY_TO_MS.items():
        results["conversions"]["velocity"][unit] = v_ms / coef

    # Заповнення кутової швидкості
    results["conversions"]["angular_velocity"]["rad/s"] = omega_rad_s
    results["conversions"]["angular_velocity"]["rpm"] = omega_rad_s * (60 / (2 * math.pi))
    results["conversions"]["angular_velocity"]["Hz"] = omega_rad_s / (2 * math.pi)

    # Заповнення сили
    for unit, coef in FORCE_FROM_NEWTON.items():
        results["conversions"]["force"][unit] = force_N * coef

    # Заповнення ефективної маси
    for unit, coef in MASS_TO_KG.items():
        results["conversions"]["effective_mass"][unit] = effective_mass_kg / coef

    # Заповнення прискорення
    results["conversions"]["acceleration"]["m/s2"] = acc_ms2
    results["conversions"]["acceleration"]["g"] = acc_ms2 / g_earth

    return results