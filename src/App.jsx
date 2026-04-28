import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ProjectRegistration from './pages/ProjectRegistration';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/register" element={<ProjectRegistration />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;
