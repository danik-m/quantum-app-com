import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Рівень 1 (Головна)
import HomePage from "./pages/HomePage";
import MathematicsPage from "./pages/MathematicsPage";
import PhysicsPage from "./pages/PhysicsPage";

// Рівень 2 (Розділи фізики)
import ClassicPhysicsPage from "./pages/ClassicPhysicsPage";
// 👇 ДОДАНО ПРОПУЩЕНИЙ ІМПОРТ
import AtomicPhysicsPage from "./pages/AtomicPhysicsPageGeneral";
import ElectrodynamicsPage from "./pages/ElectrodynamicsPage";
import QuantumPage from "./pages/QuantumPage";

// Рівень 3 (Атомна фізика - підрозділи)
import AtomsPage from "./components/AtomsPage";
import OrbitalsPage from "./pages/OrbitalsPage";
import SpectraPage from "./pages/SpectraPage";
// 👇 ВИПРАВЛЕНО: Тепер імпортуємо ModelProblemsPage замість SchrodingerPage
import ModelProblemsPage from "./pages/ModelProblemsPage"; 

// Рівень 4 (Симулятори)
import FiniteWellSimulator from "./components/FiniteWellSimulator";
import BarrierSimulator from "./components/BarrierSimulator";
import WavePacketSimulator from "./components/WavePacketSimulator";
import OscillatorSimulator from "./components/OscillatorSimulator";
import BellSimulator from "./components/BellSimulator";
import SternGerlachExperiment from "./components/SternGerlachExperiment"; // <--- IMPORT
import CentrifugalSimulator from "./components/classic/CentrifugalSimulator";


// Рівень 5 (Класична фізика - підрозділи)

import MechanicsPage from "./pages/classic/MechanicsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Головна */}
        <Route path="/" element={<HomePage />} />
        
        {/* Математика */}
        <Route path="/mathematics" element={<MathematicsPage />} />

        {/* Фізика (Меню розділів) */}
        <Route path="/physics" element={<PhysicsPage />} />
        
        {/* Підрозділи фізики */}
        <Route path="/physics/classic" element={<ClassicPhysicsPage />} />
        
        {/* --- АТОМНА ТА ЯДЕРНА ФІЗИКА --- */}
        <Route path="/physics/atomic" element={<AtomicPhysicsPage />} />

        {/* Підрозділи фізики */}
        <Route path="/physics/classic" element={<ClassicPhysicsPage />} />
        
        {/* 👇 ОСЬ ЦЬОГО РЯДКА НЕ ВИСТАЧАЛО 👇 */}
        <Route path="/physics/classic/mechanics" element={<MechanicsPage />} />
        
        {/* --- ЕЛЕКТРОДИНАМІКА --- */}
        <Route path="/physics/electrodynamics" element={<ElectrodynamicsPage />} />
        
        {/* --- КВАНТОВА ФІЗИКА (Тільки теорія) --- */}
        <Route path="/physics/quantum" element={<QuantumPage />} />
        
        {/* Інструменти Атомної фізики */}
        <Route path="/atoms" element={<AtomsPage />} />
        <Route path="/orbitals" element={<OrbitalsPage />} />
        <Route path="/spectra" element={<SpectraPage />} />
        
        {/* --- МОДЕЛЬНІ ЗАДАЧІ (Меню симуляцій) --- */}
        <Route path="/physics/atomic/models" element={<ModelProblemsPage />} />

        {/* --- КОНКРЕТНІ СИМУЛЯТОРИ --- */}
        <Route path="/simulation/well" element={<FiniteWellSimulator />} />
        <Route path="/simulation/barrier" element={<BarrierSimulator />} />
        <Route path="/simulation/wavepacket" element={<WavePacketSimulator />} />
        <Route path="/simulation/oscillator" element={<OscillatorSimulator />} />
        {/* 5. Експеримент Штерна-Герлаха (НОВЕ) */}
        <Route path="/simulation/bell" element={<BellSimulator />} />
        <Route path="/simulation/stern-gerlach" element={<SternGerlachExperiment />} /> {/* <--- ROUTE */}

           {/* Симулятор механіки */}
        <Route path="/simulation/centrifugal" element={<CentrifugalSimulator />} />
        
      </Routes>
    </Router>
  );
}