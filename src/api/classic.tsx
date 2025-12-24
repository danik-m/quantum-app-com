import { API_URL } from "./quantum"; 

export interface CentrifugalData {
  physics: {
    force_N: number;
    acc_ms2: number;
    omega_rad_s: number;
    g_force: number;
  };
  conversions: {
    mass: Record<string, number>;
    radius: Record<string, number | string>;
    velocity: Record<string, number>;
    angular_velocity: Record<string, number>;
    force: Record<string, number>;
    effective_mass: Record<string, number>;
    acceleration: Record<string, number>;
  };
  error?: string;
}

// Ensure 'export' is used here so it can be imported as { calculateCentrifugalForce }
export async function calculateCentrifugalForce(
  mass: number,
  massUnit: string,
  radius: number,
  radiusUnit: string,
  velocity: number,
  velocityUnit: string
): Promise<CentrifugalData | null> {
  try {
    const params = new URLSearchParams({
      mass: mass.toString(),
      mass_unit: massUnit,
      radius: radius.toString(),
      radius_unit: radiusUnit,
      velocity: velocity.toString(),
      velocity_unit: velocityUnit
    });

    const res = await fetch(`${API_URL}/classic/centrifugal?${params.toString()}`);
    if (!res.ok) throw new Error("Calculation failed");
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}
// --- Gyroscope Types ---
export interface GyroData {
  I_kgm2: number;
  L_kgm2s: number;
  torque_Nm: number;
  omega_precession_rad_s: number;
  T_precession_s: number;
  omega_spin_rad_s: number;
  error?: string;
}

export async function calculateGyroscope(
  mass: number,
  radius: number,
  length: number,
  rpm: number,
  theta: number
): Promise<GyroData | null> {
  try {
    const params = new URLSearchParams({
      mass: mass.toString(),
      radius: radius.toString(),
      length: length.toString(),
      rpm: rpm.toString(),
      theta: theta.toString()
    });
    const res = await fetch(`${API_URL}/classic/gyroscope?${params.toString()}`);
    if (!res.ok) throw new Error("Gyro calculation failed");
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

// --- KEPLER Types ---
export interface KeplerData {
    period_years: number;
    semi_major_axis_au: number;
    semi_minor_axis_au: number;
    eccentricity: number;
    focal_parameter_au: number;
    perihelion_au: number;
    aphelion_au: number;
    specific_energy: number;
    specific_angular_momentum: number;
    focus_distance_au: number;
}

export async function calculateKepler(a_au: number, e: number, m_star: number): Promise<KeplerData | null> {
    try {
        const params = new URLSearchParams({
            a_au: a_au.toString(),
            e: e.toString(),
            m_star: m_star.toString()
        });
        const res = await fetch(`${API_URL}/classic/kepler?${params.toString()}`);
        if (!res.ok) throw new Error("Kepler calc failed");
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

// --- Newton's Laws APIs ---

export const simulateNewtonLaw1 = async (velocity: number, friction: number) => {
  const response = await fetch(`${API_URL}/newton/law1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      velocity,
      friction,
    }),
  });
  return response.json();
};

export const simulateNewtonLaw2 = async (mass: number, force: number) => {
  const response = await fetch(`${API_URL}/newton/law2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mass,
      force,
    }),
  });
  return response.json();
};

export const simulateNewtonLaw3 = async (mass1: number, mass2: number, velocity1: number, velocity2: number) => {
  const response = await fetch(`${API_URL}/newton/law3`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mass1,
      mass2,
      velocity1,
      velocity2,
    }),
  });
  return response.json();
};
