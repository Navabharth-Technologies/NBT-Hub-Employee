import React, { useState, useEffect } from 'react';
import { Cake, ChevronLeft, Search, Gift, Calendar, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';

const BirthdayScreen = ({ onBack }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    // Clear legacy cache once to ensure fresh backend birth years are loaded
    const cacheKey = 'nbt_birthdays_cache_v2';
    if (!localStorage.getItem(cacheKey)) {
      localStorage.removeItem('nbt_birthdays_cache');
      localStorage.setItem(cacheKey, 'true');
    }
    
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    // Fast Hydration: Load from cache immediately to prevent long loading states
    const cached = localStorage.getItem('nbt_birthdays_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Standard Calendar Sort (Jan to Dec) for initial render
        const sorted = parsed.sort((a, b) => {
          const d1 = parseSafe(a.date || a.Date || a.dob);
          const d2 = parseSafe(b.date || b.Date || b.dob);
          if (d1.getMonth() !== d2.getMonth()) return d1.getMonth() - d2.getMonth();
          return d1.getDate() - d2.getDate();
        });
        setBirthdays(sorted);
        setLoading(false);
      } catch (e) { }
    }

    fetchBirthdays();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Robust date parsing utility
  const parseSafe = (dStr) => {
    if (!dStr) return new Date();
    // Handle DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dStr)) {
      const parts = dStr.split(/[-/]/);
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dStr);
  };

  const fetchBirthdays = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      let combinedData = [];

      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Strictly use user-provided Birthday API endpoints
      const endpoints = [
        `${BASE_URL}/api/birthdays`,
        `${BASE_URL}/api/birthday-list`,
        `${BASE_URL}/api/employees/birthdays`
      ];

      for (const endpoint of endpoints) {
        try {
          const bResp = await fetch(endpoint, { headers, signal: controller.signal });
          if (bResp.ok) {
            const raw = await bResp.json();
            const list = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
            list.forEach(item => {
              // Ensure we pick up the best available date (prefer dob over date if both exist)
              const bestDate = item.dob || item.dateOfBirth || item.date || item.birthday;
              if (bestDate && !combinedData.some(p => (p.name || '').toLowerCase() === (item.name || '').toLowerCase())) {
                combinedData.push({
                  ...item,
                  date: bestDate
                });
              }
            });
          }
        } catch (e) { }
      }

      clearTimeout(timeoutId);



      // SORTING LOGIC: Passed Birthdays First (Jan-Dec chronological order)
      const sorted = combinedData.sort((a, b) => {
        const d1 = parseSafe(a.date || a.dob);
        const d2 = parseSafe(b.date || b.dob);
        if (d1.getMonth() !== d2.getMonth()) return d1.getMonth() - d2.getMonth();
        return d1.getDate() - d2.getDate();
      });

      setBirthdays([...sorted]);

      // Safe Cache: Handle QuotaExceededError gracefully
      try {
        localStorage.setItem('nbt_birthdays_cache', JSON.stringify(sorted));
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          // If storage is full, clear old cache items to make room
          localStorage.removeItem('nbt_birthdays_cache_legacy');
          localStorage.removeItem('nbt_birthdays_v1');
        }
      }
    } catch (err) {
      // Quietly fall back to cache if available
      const cached = localStorage.getItem('nbt_birthdays_cache');
      if (cached) setBirthdays(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };



  const getStatus = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bDate = parseSafe(dateStr);
    const occurrence = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
    occurrence.setHours(0, 0, 0, 0);

    if (occurrence.getTime() === today.getTime()) return 'Today';
    if (occurrence < today) return 'Passed';
    return 'Upcoming';
  };

  const sendBirthdayWish = async (person) => {
    try {
      const uid = user?.id || user?.userId || user?.empId || user?.employee_id;
      const payload = {
        userId: Number(uid),
        user_id: Number(uid),
        userName: user?.name || 'Employee',
        user: user?.name || 'Employee',
        role: user?.role?.toUpperCase() || 'EMPLOYEE',
        tagline: 'Birthday Wish! 🎂',
        content: `Happy Birthday ${person.name}! 🎂🎉 Wish you a great day and a fantastic year ahead! from ${user?.name || 'Employee'}`
      };
      const res = await fetch(API_ENDPOINTS.THREADS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert(`Birthday wish sent for ${person.name}!`);
    } catch { }
  };

  const s = {
    container: {
      padding: window.innerWidth < 768 ? '20px 15px' : '30px 40px',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '30px',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    headerCard: {
      backgroundColor: 'white',
      borderRadius: '45px',
      padding: winWidth < 768 ? '40px 20px' : '60px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.02)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      position: 'relative'
    },
    syncStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '10px',
      fontWeight: '1000',
      color: '#0B1E3F',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '10px'
    },
    cakeIcon: {
      width: '80px',
      height: '80px',
      backgroundColor: '#f8fafc',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0B1E3F',
      marginBottom: '10px'
    },
    title: {
      fontSize: winWidth < 768 ? '24px' : '32px',
      fontWeight: '1000',
      color: '#0B1E3F',
      marginBottom: '5px'
    },
    subtitle: {
      fontSize: '12px',
      fontWeight: '1000',
      color: '#3b82f6',
      textTransform: 'uppercase',
      letterSpacing: '2px'
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    itemCard: (status) => ({
      backgroundColor: 'white',
      borderRadius: '25px',
      padding: winWidth < 768 ? '18px' : '24px 35px',
      display: 'flex',
      flexDirection: winWidth < 768 ? 'column' : 'row',
      alignItems: winWidth < 768 ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: winWidth < 768 ? '12px' : '20px',
      border: status === 'Today' ? '2.5px solid #e11d48' : status === 'Upcoming' ? '2.5px solid #3b82f6' : '1px solid #f1f5f9',
      backgroundColor: status === 'Today' ? '#fff1f2' : 'white',
      boxShadow: status === 'Today' ? '0 10px 30px rgba(225, 29, 72, 0.08)' : status === 'Upcoming' ? '0 10px 30px rgba(59, 130, 246, 0.08)' : '0 4px 15px rgba(0,0,0,0.01)',
      transition: 'all 0.3s ease'
    }),
    avatar: {
      width: '48px',
      height: '48px',
      borderRadius: '14px',
      backgroundColor: '#0B1E3F',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: '900',
      flexShrink: 0
    },
    name: {
      fontSize: winWidth < 768 ? '16px' : '18px',
      fontWeight: '1000',
      color: '#0B1E3F',
      lineHeight: '1.3',
      wordBreak: 'break-word'
    },
    dateLine: {
      fontSize: '12px',
      color: '#64748b',
      fontWeight: '800',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '6px'
    },
    statusBadge: (status) => ({
      padding: '8px 18px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '1000',
      backgroundColor: status === 'Today' ? '#e11d48' : status === 'Upcoming' ? '#FDB913' : '#f1f5f9',
      color: status === 'Today' ? 'white' : status === 'Upcoming' ? '#0B1E3F' : '#94a3b8',
      letterSpacing: '0.8px'
    })
  };

  return (
    <div style={s.container}>
      <button
        onClick={onBack}
        style={{ width: 'fit-content', border: 'none', background: 'white', padding: '12px 20px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '1000', color: '#0B1E3F', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
      >
        <ChevronLeft size={16} /> Back to Dashboard
      </button>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={s.headerCard}>
        <div style={s.syncStatus}>
          <RefreshCcw size={14} /> Data Synced With NBT Hub Profiles
        </div>
        <div style={s.cakeIcon}>
          <Cake size={40} strokeWidth={1.5} />
        </div>
        <h1 style={s.title}>NBT Birthdays 🎂</h1>
        <div style={s.subtitle}>Passed & Upcoming Celebrations</div>

        <div style={{ width: '100%', marginTop: '30px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <Search size={18} />
          </div>
          <input 
            type="text"
            placeholder="Search employee birthday..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '18px 20px 18px 55px', 
              borderRadius: '20px', 
              border: '1.5px solid #f1f5f9', 
              fontSize: '14px', 
              fontWeight: '800', 
              outline: 'none', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              backgroundColor: '#fcfcfd'
            }}
          />
        </div>

        <div style={{ ...s.list, width: '100%', marginTop: '30px' }}>
          {(loading && birthdays.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>Syncing Celebration Data...</div>
          ) : birthdays.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>No matching celebrations found.</div>
          ) : birthdays.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((person, idx) => {
            const status = getStatus(person.date);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={s.itemCard(status)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0, width: '100%' }}>
                  <div style={s.avatar}>{getInitials(person.name)}</div>
                  <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                    <div style={s.name}>{person.name}</div>
                    <div style={s.dateLine}>
                      <Cake size={14} color="#FDB913" />
                      {new Date(person.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: winWidth < 768 ? '100%' : 'auto', gap: '15px' }}>
                  {status === 'Today' && (
                    <button
                      onClick={() => sendBirthdayWish(person)}
                      style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#e11d48', color: 'white', fontSize: '11px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}
                    >
                      Wish Him/Her
                    </button>
                  )}
                  <div style={{ ...s.statusBadge(status), marginLeft: 'auto' }}>
                    {status}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div style={{ height: '100px' }} /> {/* Space for NavigationDock */}
    </div>
  );
};

export default BirthdayScreen;
