import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validación según credenciales solicitadas (Versión corregida)
    setTimeout(() => {
      if (email === 'basurtobaque@gmail.com' && password === '50830308xS/@') {
        localStorage.setItem('is_auth', 'true');
        onLoginSuccess();
      } else {
        setError('Credenciales incorrectas. Verifique su acceso.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md animate-scaleIn relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-2xl shadow-indigo-600/40 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <i className="fas fa-play"></i>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">OxooFlix Admin</h1>
          <p className="text-gray-500 mt-2 font-medium">Panel de Gestión de Contenidos</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-black/50 backdrop-blur-sm bg-gray-900/90">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Correo Electrónico</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-12 py-4 text-white text-sm outline-none transition-all placeholder:text-gray-600" 
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"></i>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contraseña</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-12 py-4 text-white text-sm outline-none transition-all placeholder:text-gray-600" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"></i>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-fadeIn">
                <i className="fas fa-circle-exclamation"></i>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
            >
              {isLoading ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : (
                <>Acceder al Panel <i className="fas fa-arrow-right"></i></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-[10px] mt-8 uppercase font-bold tracking-widest">
          © 2026 OxooFlix Management System
        </p>
      </div>
    </div>
  );
};

export default Login;