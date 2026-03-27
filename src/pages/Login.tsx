import React, { useState } from 'react';
import api from '../services/api'; // Import our new messenger

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // To disable the button while waiting
  const [error, setError] = useState(''); // To show "Invalid Credentials"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sending the POST request to your backend /auth/login route
      const response = await api.post('/auth/login', { email, password });
      
      // If successful, save the JWT token in LocalStorage
      localStorage.setItem('token', response.data.token);
      // Add this line to move the user
      window.location.href = '/dashboard';
      alert('Login Successful!');
      // Later: window.location.href = '/dashboard';
    } catch (err: any) {
      // Catching the 401 or 500 errors from your Express backend
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
        <h2 className="text-3xl font-bold text-white mb-6 text-center text-indigo-500">Service Ticket Login</h2>
        
        {/* Only shows this div if there is an actual error message */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address"
            className="w-full rounded-lg bg-slate-800 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input 
            type="password" 
            placeholder="Password"
            className="w-full rounded-lg bg-slate-800 p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg p-3 font-semibold text-white transition-all ${
              loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;