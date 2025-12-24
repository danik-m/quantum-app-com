export const API_URL = "http://127.0.0.1:8000";

// --- HYDROGEN ATOM ---
export async function getHydrogenSolution(Z: number, n: number, l: number) {
  try {
    const url = `${API_URL}/hydrogen/solve?Z=${Z}&n=${n}&l=${l}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
      return { error: data.error };
    }
    
    return {
      energy_ev: data.energy_ev, 
      avg_radius: data.avg_radius,
      image: data.image ? `data:image/png;base64,${data.image}` : null,
      heatmap: data.heatmap ? `data:image/png;base64,${data.heatmap}` : null
    };
  } catch (e) {
    console.error(e);
    return { error: "Failed to connect to server" };
  }
}

// --- POTENTIAL WELLS ---
export async function getFiniteWellData(m: number, L: number, U0_ev: number) {
  try {
    const url = `${API_URL}/finite-well/data?m=${m}&L=${L}&U0_ev=${U0_ev}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch finite well data", e);
    return {};
  }
}

export async function getFiniteWellPlot(m: number, L: number, U0_ev: number, n: number) {
  try {
    const url = `${API_URL}/finite-well/plot?m=${m}&L=${L}&U0_ev=${U0_ev}&n=${n}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error("Failed to fetch finite well plot", e);
    return null;
  }
}

export async function getInfiniteWellPlot(m: number, L: number, n: number) {
  try {
    const url = `${API_URL}/infinite-well/plot?m=${m}&L=${L}&n=${n}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error("Failed to fetch infinite well plot", e);
    return null;
  }
}

// --- BARRIERS ---
export async function getStepBarrierPlot(m: number, E: number, U0: number) {
  try {
    const url = `${API_URL}/barrier/step/plot?m=${m}&E=${E}&U0=${U0}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error("Failed to fetch step barrier plot", e);
    return null;
  }
}

export async function getRectBarrierPlot(m: number, E: number, U0: number, L: number) {
  try {
    const url = `${API_URL}/barrier/rect/plot?m=${m}&E=${E}&U0=${U0}&L=${L}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error("Failed to fetch rect barrier plot", e);
    return null;
  }
}

export async function getDoubleBarrierPlot(m: number, E: number, U0: number, L: number, d: number) {
  try {
    const url = `${API_URL}/barrier/double/plot?m=${m}&E=${E}&U0=${U0}&L=${L}&d=${d}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error("Failed to fetch double barrier plot", e);
    return null;
  }
}

// --- WAVE PACKET ---
export async function initWavePacket(energy_ev: number, U0_ev: number, width_nm: number, gap_nm: number, n_barriers: number) {
  try {
    const url = `${API_URL}/wavepacket/init?energy_ev=${energy_ev}&U0_ev=${U0_ev}&width_nm=${width_nm}&gap_nm=${gap_nm}&n_barriers=${n_barriers}`;
    await fetch(url);
    return { success: true };
  } catch (e) {
    console.error("Failed to init wave packet", e);
    return { success: false, error: e };
  }
}

export async function getNextWavePacketFrame(steps: number = 50) {
  try {
    const url = `${API_URL}/wavepacket/next?steps=${steps}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    if (data.error) return null;
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error("Failed to fetch next wave packet frame", e);
    return null;
  }
}

// --- OSCILLATOR ---
export async function getOscillatorPlot(m: number, omega: number, n: number) {
  try {
    const url = `${API_URL}/oscillator/plot?m=${m}&omega=${omega}&n=${n}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// --- STERN-GERLACH & BELL ---
export async function getSternGerlachPlot(outcome: number) {
  try {
    const url = `${API_URL}/stern-gerlach/plot?outcome=${outcome}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.image ? `data:image/png;base64,${data.image}` : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function runBellExperiment(angleA: number, angleB: number) {
  try {
    const url = `${API_URL}/bell/run?angle_a=${angleA}&angle_b=${angleB}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Server error");
    return await res.json(); // Поверне { res_a: 1, res_b: -1 }
  } catch (e) {
    console.error(e);
    return null;
  }
}

export interface SternGerlachAtomData {
    vx: number;
    vy: number;
    vz: number;
    spin: 'up' | 'down';
    theoretical_acc_z: number;
}

export async function getSternGerlachBatch(batchSize: number = 5): Promise<SternGerlachAtomData[]> {
    try {
        const res = await fetch(`${API_URL}/stern-gerlach/shoot?batch_size=${batchSize}`);
        if (!res.ok) throw new Error("Network response was not ok");
        return await res.json();
    } catch (e) {
        console.error("Failed to fetch SG batch", e);
        return [];
    }
}