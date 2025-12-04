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