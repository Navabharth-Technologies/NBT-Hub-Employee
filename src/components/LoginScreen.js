import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import loginBg from '../assets/Background_image.png';
import logo from '../assets/image.png';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const res = await login(email.trim(), password);
    if (!res.success) {
      setError(res.error || 'Invalid email or password');
    }
    setLoading(false);
  };

  const s = {
    container: {
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000', // Dark base for the opacity effect
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    },
    bgImage: {
      position: 'absolute',
      inset: 0,
      backgroundImage: `url(${loginBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: 0.5, // REDUCED OPACITY as requested
      zIndex: 1
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(circle at 70% 30%, rgba(11, 30, 63, 0.2), rgba(0, 0, 0, 0.6))',
      zIndex: 2
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '45px',
      padding: winWidth < 768 ? '40px 25px' : '50px 45px',
      width: winWidth < 768 ? '88%' : '100%',
      maxWidth: '460px',
      boxShadow: '0 40px 100px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 10,
      border: '1px solid #f1f5f9'
    },
    logo: { width: winWidth < 768 ? '80px' : '100px', height: winWidth < 768 ? '80px' : '100px', marginBottom: '20px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' },
    title: { fontSize: '32px', fontWeight: '900', color: '#0B1E3F', marginBottom: '8px', letterSpacing: '-0.5px' },
    tagline: { fontSize: '12px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '45px' },
    inputGroup: { width: '100%', marginBottom: '25px' },
    label: { fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px', display: 'block' },
    inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '20px', padding: '14px 20px', border: '1.5px solid #e2e8f0', transition: 'all 0.3s ease' },
    input: { flex: 1, border: 'none', backgroundColor: 'transparent', padding: '5px 12px', fontSize: '15px', fontWeight: '600', color: '#1e293b', outline: 'none' },
    btn: { width: '100%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '15px', boxShadow: '0 15px 35px rgba(37, 99, 235, 0.3)', transition: 'all 0.3s ease' },
    tipBox: { marginTop: '40px', backgroundColor: '#f0f9ff', padding: '18px', borderRadius: '20px', border: '1px solid #bae6fd', display: 'flex', gap: '14px' },
    tipText: { fontSize: '12px', color: '#0369a1', fontWeight: '600', lineHeight: '1.6' },
    error: { color: '#ef4444', fontSize: '13px', fontWeight: '700', marginBottom: '20px', textAlign: 'center' }
  };

  return (
    <div style={s.container}>
      <div style={s.bgImage} />
      <div style={s.overlay} />
      <motion.form 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={s.card} 
        onSubmit={handleSubmit}
      >
        <img src={logo} alt="NBT HUB Logo" style={s.logo} />
        <h1 style={s.title}>NBT HUB</h1>
        <div style={s.tagline}>Future of Enterprise Intelligence</div>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.inputGroup}>
          <label style={s.label}>Employee Identity (Email)</label>
          <div style={{ ...s.inputWrapper, border: emailError ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0' }}>
            <Mail size={20} color={emailError ? "#ef4444" : "#3b82f6"} />
            <input
              style={s.input}
              type="email"
              placeholder="employee@navshub.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              required
            />
          </div>
          {emailError && <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: '600', marginTop: '5px' }}>{emailError}</div>}
        </div>
        <div style={s.inputGroup}>
          <label style={s.label}>Internal Passkey</label>
          <div style={s.inputWrapper}><Lock size={20} color="#3b82f6" /><input style={s.input} type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div style={{ cursor: 'pointer', display: 'flex' }} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <Eye size={20} color="#94a3b8" /> : <EyeOff size={20} color="#94a3b8" />}</div>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Validating Token...' : <><LogIn size={20} /> Establish Connection</>}
        </motion.button>
        <div style={s.tipBox}><Info size={24} color="#0ea5e9" /><div style={s.tipText}><strong>Security Protocol:</strong> Authentication is restricted to verified Navshub employees. Multi-factor validation may be required.</div></div>
      </motion.form>
    </div>
  );
}
