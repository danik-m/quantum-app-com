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