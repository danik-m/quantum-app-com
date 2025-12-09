export const API_URL = "http://127.0.0.1:8000";

// Получить энергии конечной ямы (JSON)
export async function getFiniteWellData(m: number, L: number, U0_ev: number) {
  const url = `${API_URL}/finite-well/data?m=${m}&L=${L}&U0_ev=${U0_ev}`;
  const res = await fetch(url);
  return await res.json();
}

// Получить график конечной ямы (PNG → base64)
export async function getFiniteWellPlot(m: number, L: number, U0_ev: number, n: number) {
  const url = `${API_URL}/finite-well/plot?m=${m}&L=${L}&U0_ev=${U0_ev}&n=${n}`;
  const res = await fetch(url);
  const data = await res.json();
  return `data:image/png;base64,${data.image}`;
}

// Получить график бесконечной ямы
export async function getInfiniteWellPlot(m: number, L: number, n: number) {
  const url = `${API_URL}/infinite-well/plot?m=${m}&L=${L}&n=${n}`;
  const res = await fetch(url);
  const data = await res.json();
  return `data:image/png;base64,${data.image}`;
}

// STEP BARRIER
export async function getStepBarrierPlot(m: number, E: number, U0: number) {
  const url = `${API_URL}/barrier/step/plot?m=${m}&E=${E}&U0=${U0}`;
  const res = await fetch(url);
  const data = await res.json();
  return `data:image/png;base64,${data.image}`;
}

// RECTANGULAR BARRIER
export async function getRectBarrierPlot(m: number, E: number, U0: number, L: number) {
  const url = `${API_URL}/barrier/rect/plot?m=${m}&E=${E}&U0=${U0}&L=${L}`;
  const res = await fetch(url);
  const data = await res.json();
  return `data:image/png;base64,${data.image}`;
}

// DOUBLE BARRIER
export async function getDoubleBarrierPlot(m: number, E: number, U0: number, L: number, d: number) {
  const url = `${API_URL}/barrier/double/plot?m=${m}&E=${E}&U0=${U0}&L=${L}&d=${d}`;
  const res = await fetch(url);
  const data = await res.json();
  return `data:image/png;base64,${data.image}`;
}

// 👇 НОВІ ФУНКЦІЇ ДЛЯ ХВИЛЬОВОГО ПАКЕТУ 👇

// Ініціалізація симуляції
export async function initWavePacket(energy_ev: number, U0_ev: number, width_nm: number, gap_nm: number, n_barriers: number) {
  const url = `${API_URL}/wavepacket/init?energy_ev=${energy_ev}&U0_ev=${U0_ev}&width_nm=${width_nm}&gap_nm=${gap_nm}&n_barriers=${n_barriers}`;
  await fetch(url);
}

// Отримання наступного кадру анімації
export async function getNextWavePacketFrame(steps: number = 50) {
  const url = `${API_URL}/wavepacket/next?steps=${steps}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.error) return null;
  return `data:image/png;base64,${data.image}`;
}
export async function getOscillatorPlot(m: number, omega: number, n: number) {
  try {
    const url = `${API_URL}/oscillator/plot?m=${m}&omega=${omega}&n=${n}`;
    const res = await fetch(url);
    const data = await res.json();
    return `data:image/png;base64,${data.image}`;
  } catch (e) {
    console.error(e);
    return null;
  }
}
// STERN-GERLACH
export async function getSternGerlachPlot(outcome: number) {
  try {
    const url = `${API_URL}/stern-gerlach/plot?outcome=${outcome}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.image ? `data:image/png;base64,${data.image}` : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// ==========================================
// 6. ЕКСПЕРИМЕНТ БЕЛЛА (3D Data Fetch)
// ==========================================
// 👇 ОСЬ ЦЯ ФУНКЦІЯ, ЯКОЇ НЕ ВИСТАЧАЛО
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

// --- STERN-GERLACH (NEW) ---
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