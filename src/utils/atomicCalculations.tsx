import { AUFBAU } from "../components/PeriodicTableData";

// --- КОНСТАНТИ ---
const RYD = 13.605693; // Енергія Рідберга в еВ
const H = 4.135667696e-15; // Постійна Планка в еВ·с
const C = 299792458.0; // Швидкість світла м/с
export const A0 = 5.29177210903e-11; // Радіус Бора (м)

// --- ТИПИ ---
export interface ShellCount {
    n: number;
    electrons: number;
}

export interface OrbitalParams {
    n: number;
    l: number;
    m: number;
    Zeff: number; // Ефективний заряд для візуалізації
}

export interface Point3D {
    x: number;
    y: number;
    z: number;
    probability: number; // Густина ймовірності в цій точці
}

export interface TransitionData {
    Z: number;
    symbol: string;
    name: string;
    group: number;
    period: number;
    E_initial: number;
    E_final: number;
    E_photon: number;
    wavelength_nm: number | null;
    isEmission: boolean;
    type?: string;
    oxidationStates?: string[];
}

// --- БАЗА ДАНИХ КОНФІГУРАЦІЙ (ВИНЯТКИ) ---
// Стандартний Ауфбау працює не для всіх. Тут прописані винятки (Cr, Cu, Mo, Ag, Au і т.д.)
const CONFIG_EXCEPTIONS: Record<number, string> = {
    24: "1s2 2s2 2p6 3s2 3p6 4s1 3d5", // Cr
    29: "1s2 2s2 2p6 3s2 3p6 4s1 3d10", // Cu
    41: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d4", // Nb
    42: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d5", // Mo
    44: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d7", // Ru
    45: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d8", // Rh
    46: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 4d10",     // Pd (5s0!)
    47: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d10", // Ag
    78: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s1 4f14 5d9", // Pt
    79: "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s1 4f14 5d10", // Au
    // Можна додати інші актиноїди за необхідності
};

// --- МАТЕМАТИЧНЕ ЯДРО (ХВИЛЬОВІ ФУНКЦІЇ) ---

/**
 * Факторіал (n!)
 */
function factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

/**
 * Узагальнений поліном Лагерра L_n^alpha(x)
 * Використовується для радіальної частини.
 */
function laguerre(n: number, alpha: number, x: number): number {
    if (n === 0) return 1;
    if (n === 1) return 1 + alpha - x;
    
    // Рекурентне обчислення для швидкості:
    // (k+1) L_{k+1} = (2k + 1 + alpha - x) L_k - (k + alpha) L_{k-1}
    let L_k_minus_1 = 1;
    let L_k = 1 + alpha - x;
    
    for (let k = 1; k < n; k++) {
        const next_L = ((2 * k + 1 + alpha - x) * L_k - (k + alpha) * L_k_minus_1) / (k + 1);
        L_k_minus_1 = L_k;
        L_k = next_L;
    }
    return L_k;
}

/**
 * Радіальна хвильова функція R_nl(r)
 * @param r Відстань від ядра (в одиницях радіуса Бора, якщо Zeff нормалізовано)
 * @param n Головне квантове число
 * @param l Орбітальне квантове число
 * @param Zeff Ефективний заряд ядра
 */
export function radialWavefunction(r: number, n: number, l: number, Zeff: number): number {
    // rho = (2Z/n a0) * r. Припускаємо вхідне r вже масштабоване або a0=1 для візуалізації.
    // Для чистої математики: rho = (2 * Zeff * r) / n;
    const rho = (2 * Zeff * r) / n;
    
    const prefactor = Math.sqrt(
        Math.pow(2 * Zeff / n, 3) * (factorial(n - l - 1) / (2 * n * factorial(n + l)))
    );

    const L = laguerre(n - l - 1, 2 * l + 1, rho);
    
    return prefactor * Math.exp(-rho / 2) * Math.pow(rho, l) * L;
}

/**
 * Кутова хвильова функція Y_lm (Сферичні гармоніки - ДІЙСНА ФОРМА)
 * Повертає значення для p_x, p_y, d_xy і т.д., а не комплексні числа.
 */
export function angularWavefunction(theta: number, phi: number, l: number, m: number): number {
    // Константи нормалізації (спрощено для основних форм)
    const PI_4_INV = 1 / Math.sqrt(4 * Math.PI);

    // s-орбіталь (сфера)
    if (l === 0) return PI_4_INV;

    // p-орбіталі
    if (l === 1) {
        const N = Math.sqrt(3 / (4 * Math.PI));
        if (m === 0) return N * Math.cos(theta);          // p_z
        if (m === 1) return N * Math.sin(theta) * Math.cos(phi); // p_x
        if (m === -1) return N * Math.sin(theta) * Math.sin(phi); // p_y
    }

    // d-орбіталі
    if (l === 2) {
        const N = Math.sqrt(5 / (16 * Math.PI));
        if (m === 0) return N * (3 * Math.cos(theta) ** 2 - 1);       // d_z^2
        if (m === 1) return Math.sqrt(15 / (4 * Math.PI)) * Math.cos(theta) * Math.sin(theta) * Math.cos(phi); // d_xz
        if (m === -1) return Math.sqrt(15 / (4 * Math.PI)) * Math.cos(theta) * Math.sin(theta) * Math.sin(phi); // d_yz
        if (m === 2) return Math.sqrt(15 / (16 * Math.PI)) * Math.sin(theta) ** 2 * Math.cos(2 * phi); // d_x^2-y^2
        if (m === -2) return Math.sqrt(15 / (16 * Math.PI)) * Math.sin(theta) ** 2 * Math.sin(2 * phi); // d_xy
    }

    // Для f-орбіталей і вище можна додати загальну формулу Лежандра,
    // але для базової візуалізації s,p,d зазвичай достатньо.
    return PI_4_INV; 
}

/**
 * ПОВНА ХВИЛЬОВА ФУНКЦІЯ ψ(n, l, m)
 */
export function waveFunction(r: number, theta: number, phi: number, n: number, l: number, m: number, Zeff: number = 1): number {
    const R = radialWavefunction(r, n, l, Zeff);
    const Y = angularWavefunction(theta, phi, l, m);
    return R * Y;
}

/**
 * ГУСТИНА ЙМОВІРНОСТІ |ψ|²
 */
export function probabilityDensity(r: number, theta: number, phi: number, n: number, l: number, m: number, Zeff: number = 1): number {
    const psi = waveFunction(r, theta, phi, n, l, m, Zeff);
    return psi * psi;
}

// --- ЛОГІКА КОНФІГУРАЦІЙ ---

/**
 * Генерує електронну конфігурацію. 
 * Тепер враховує винятки з бази даних.
 */
export function generateElectronConfig(Z: number): { config: [string, number][], shells: ShellCount[], configString: string } {
    let configData: [string, number][] = [];
    const shellCounts: Record<number, number> = {};

    // 1. Перевіряємо, чи є елемент у списку винятків
    if (CONFIG_EXCEPTIONS[Z]) {
        const exceptionString = CONFIG_EXCEPTIONS[Z];
        const parts = exceptionString.split(" ");
        
        parts.forEach(part => {
            // Парсинг рядка типу "3d5" -> n=3, l=d, count=5
            const match = part.match(/(\d+)([spdf])(\d+)/);
            if (match) {
                const n = parseInt(match[1]);
                const lStr = match[2];
                const count = parseInt(match[3]);
                
                configData.push([`${n}${lStr}`, count]);
                shellCounts[n] = (shellCounts[n] || 0) + count;
            }
        });
    } else {
        // 2. Якщо ні, використовуємо стандартний алгоритм (Ауфбау)
        let remaining = Z;
        // AUFBAU має вигляд [[n, l, "1s", 2], ...]
        for (const [n, , label, cap] of AUFBAU) {
            if (remaining <= 0) break;
            const take = Math.min(cap, remaining);
            configData.push([label, take]);
            shellCounts[n] = (shellCounts[n] || 0) + take;
            remaining -= take;
        }
    }

    const shells = Object.entries(shellCounts).map(([n, electrons]) => ({
        n: Number(n),
        electrons,
    })).sort((a, b) => a.n - b.n);

    const configString = configData.map(([lab, e]) => `${lab}${e}`).join(' ');

    return { config: configData, shells, configString };
}

// --- ЕНЕРГЕТИЧНІ ФУНКЦІЇ ---

export function estimateZeff(Z: number, n: number): number {
    const { shells } = generateElectronConfig(Z);
    let countInner = 0;
    for (const shell of shells) {
        if (shell.n < n) countInner += shell.electrons;
    }
    if (n === 1 || countInner === 0) return Z;
    // Правила Слейтера (спрощені)
    return Math.max(1.0, Z - 0.85 * countInner);
}

export function bohrEnergyEV(Z_eff: number, n: number): number {
    if (n === 0) return 0;
    return -RYD * (Z_eff ** 2) / (n ** 2);
}

export function calculateTransition(Z: number, n_i: number, n_f: number): TransitionData {
    const Z_eff = estimateZeff(Z, Math.max(n_i, n_f));
    const E_i = bohrEnergyEV(Z_eff, n_i);
    const E_f = bohrEnergyEV(Z_eff, n_f);
    const E_photon = E_i - E_f;
    const isEmission = E_photon > 1e-9;
    let wavelength_nm: number | null = null;
    if (isEmission) {
        const wavelength_m = (H * C) / E_photon; 
        wavelength_nm = wavelength_m * 1e9;
    }
    return {
        Z, symbol: "", name: "", group: 0, period: 0, type: undefined, oxidationStates: undefined,
        E_initial: E_i, E_final: E_f, E_photon, wavelength_nm, isEmission,
    };
}

// --- ГЕНЕРАТОР ХМАРИ ТОЧОК (ДЛЯ ВІЗУАЛІЗАЦІЇ) ---

/**
 * Генерує точки для 3D-побудови орбіталі методом Монте-Карло.
 * @param orbital Параметри орбіталі (n, l, m)
 * @param pointCount Кількість точок для генерації (наприклад, 2000)
 */
export function generateOrbitalCloud(
    orbital: OrbitalParams, 
    pointCount: number = 3000
): Point3D[] {
    const points: Point3D[] = [];
    const { n, l, m, Zeff } = orbital;
    
    // Межі сканування простору (в радіусах Бора)
    // Чим більше n, тим ширший радіус треба брати
    const limit = (n * n * 6) / Zeff; 

    let count = 0;
    // Запобіжник нескінченного циклу
    const maxAttempts = pointCount * 200; 
    let attempts = 0;

    // Знаходимо приблизний максимум густини для нормалізації Монте-Карло
    // Для спрощення беремо емпірично або обчислюємо в точці максимуму радіальної функції
    // Тут беремо фіксований поріг, який адаптується
    const maxProbabilityApprox = 0.2; 

    while (count < pointCount && attempts < maxAttempts) {
        attempts++;
        
        // 1. Випадкова точка в кубі [-limit, limit]
        const x = (Math.random() - 0.5) * 2 * limit;
        const y = (Math.random() - 0.5) * 2 * limit;
        const z = (Math.random() - 0.5) * 2 * limit;
        
        // 2. Перехід у сферичні координати
        const r = Math.sqrt(x*x + y*y + z*z);
        if (r === 0) continue; // Уникнення ділення на нуль
        
        const theta = Math.acos(z / r); // від 0 до PI
        const phi = Math.atan2(y, x);   // від -PI до PI
        
        // 3. Обчислення густини
        const prob = probabilityDensity(r, theta, phi, n, l, m, Zeff);
        
        // 4. Відбір методом Монте-Карло
        // Ми порівнюємо prob з випадковим числом. Якщо prob висока, точка проходить частіше.
        if (Math.random() < (prob / maxProbabilityApprox)) {
            points.push({ x, y, z, probability: prob });
            count++;
        }
    }

    return points;
}