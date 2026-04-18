import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Parents from './pages/Parents';
import A11yToolbar from './components/A11yToolbar';

function App() {
  const { t } = useTranslation();

  return (
    <Router>
      <div className="min-h-screen flex flex-col pt-16">
        <A11yToolbar />
        <header className="px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-brand-indigo flex items-center justify-center text-white font-bold text-xl leading-none pt-0.5 group-hover:scale-105 transition-transform" aria-hidden="true">Teñ</div>
              <span className="font-bold text-xl tracking-tight text-brand-slate group-hover:text-brand-indigo transition-colors">Teñ Inclusive AI</span>
            </Link>
          </div>
          <nav className="flex items-center gap-8">
            <Link to="/students" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors hidden sm:block">Students</Link>
            <Link to="/teachers" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors hidden sm:block">Teachers</Link>
            <Link to="/parents" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors hidden sm:block">Parents</Link>
            <Link to="/dashboard" className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl shadow-sm text-sm font-bold hover:bg-indigo-600 hover:shadow-md transition-all active:scale-95">
              Live Lesson
            </Link>
          </nav>
        </header>

        <main className="flex-1 flex flex-col w-full">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/parents" element={<Parents />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
// Triggering HMR
