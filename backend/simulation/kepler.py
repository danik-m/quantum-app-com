import numpy as np

# Гравітаційна стала для масштабу симуляції
# Використовуємо Астрономічні Одиниці (AU), Роки та Маси Сонця.
# В цих одиницях G = 4 * pi^2
G_SIM = 4 * (np.pi ** 2)

def calculate_kepler_parameters(semi_major_axis_au, eccentricity, star_mass_solar=1.0):
    """
    Розраховує параметри орбіти згідно із законами Кеплера.
    """
    a = float(semi_major_axis_au)
    e = float(eccentricity)
    M = float(star_mass_solar)
    
    # 3-й закон: T = sqrt(a^3 / M)
    period_years = np.sqrt((a ** 3) / M)
    
    # Геометрія еліпса (1-й закон)
    b = a * np.sqrt(1 - e**2)
    p = a * (1 - e**2) # Фокальний параметр
    c = a * e # Відстань від центру до фокуса
    
    r_min = a * (1 - e)
    r_max = a * (1 + e)
    
    specific_energy = - (G_SIM * M) / (2 * a)
    specific_L = np.sqrt(p * G_SIM * M)

    return {
        "period_years": period_years,
        "semi_major_axis_au": a,
        "semi_minor_axis_au": b,
        "eccentricity": e,
        "focal_parameter_au": p,
        "perihelion_au": r_min,
        "aphelion_au": r_max,
        "specific_energy": specific_energy,
        "specific_angular_momentum": specific_L,
        "focus_distance_au": c
    }