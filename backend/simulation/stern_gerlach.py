import numpy as np
from scipy import constants

# Константи
K_B = constants.k
M_AG = 1.79e-25    # Маса срібла
T_OVEN = 1000.0    # Температура печі
MU_B = constants.physical_constants['Bohr magneton'][0]

def generate_atom_batch(batch_size=5, gradient=1000.0):
    """
    Генерує партію атомів.
    """
    atoms = []
    
    # Найімовірніша швидкість (термальна)
    v_mp = np.sqrt(2 * K_B * T_OVEN / M_AG)
    
    # Генерація швидкостей (вздовж осі пучка X)
    # Використовуємо нормальний розподіл навколо теплової швидкості
    vx_batch = np.random.normal(loc=v_mp, scale=v_mp*0.1, size=batch_size)
    
    # Невеликий розкид по Y і Z (розбіжність пучка через коліматори)
    vy_batch = np.random.normal(0, v_mp*0.002, size=batch_size)
    vz_batch = np.random.normal(0, v_mp*0.002, size=batch_size)
    
    for i in range(batch_size):
        # Квантовий спін: строго +1 (вгору) або -1 (вниз)
        spin_dir = 1 if np.random.random() > 0.5 else -1
        
        # Сила діє пропорційно спіну
        magnetic_moment = spin_dir * MU_B
        force_z = magnetic_moment * gradient
        acc_z = force_z / M_AG
        
        atoms.append({
            "vx": float(vx_batch[i]),
            "vy": float(vy_batch[i]),
            "vz": float(vz_batch[i]),
            "spin": "up" if spin_dir > 0 else "down",
            "theoretical_acc_z": float(acc_z)
        })
        
    return atoms