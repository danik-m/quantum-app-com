import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import AtomsPage from "./pages/AtomsPage";
import OrbitalsPage from "./pages/OrbitalsPage";
import SpectraPage from "./pages/SpectraPage";
import SchrodingerPage from "./pages/SchrodingerPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/atoms" element={<AtomsPage />} />
        <Route path="/orbitals" element={<OrbitalsPage />} />
        <Route path="/spectra" element={<SpectraPage />} />
        <Route path="/schrodinger" element={<SchrodingerPage />} />
      </Routes>
    </Router>
  );
}