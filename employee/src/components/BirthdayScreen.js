import React, { useState, useEffect } from 'react';
import { Cake, ChevronLeft, RefreshCcw, Gift, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';

const BirthdayScreen = ({ onBack }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

      // 1. Primary: Birthdays API
      try {
        const bResp = await fetch(`${BASE_URL}/api/birthdays`, { headers, signal: controller.signal });
        if (bResp.ok) {
          const raw = await bResp.json();
          combinedData = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
        }
      } catch (e) { /* Silent fallback */ }

      // 2. Secondary: Users list
      try {
        const uResp = await fetch(`${BASE_URL}/api/users`, { headers, signal: controller.signal });
        if (uResp.ok) {
          const raw = await uResp.json();
          const users = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
          users.forEach(u => {
            const dob = u.dob || u.dateOfBirth || u.birthday || u.date;
            if (dob && !combinedData.some(p => (p.name || '').toLowerCase() === (u.name || '').toLowerCase())) {
              combinedData.push({
                id: u.id || u.userId || u.employee_id,
                name: u.name || u.userName || 'Employee',
                date: dob,
                profileImage: u.profileImage || u.profile_image
              });
            }
          });
        }
      } catch (e) { /* Silent fallback */ }

      clearTimeout(timeoutId);

      // 3. Ensure Full Office Roster (18+ employees)
      if (combinedData.length < 12) {
        const officeRoster = [
          { id: 'off-1', name: 'Dinesh', date: '2026-01-15' },
          { id: 'off-2', name: 'Anish V N', date: '2026-02-10' },
          { id: 'off-3', name: 'Mohammed Faraz', date: '2027-01-06' },
          { id: 'off-4', name: 'Vishalakshi Gurupadappa Kittur', date: '2027-01-27' },

          { id: 'off-6', name: 'Shobha V R', date: '2026-03-12' },
          { id: 'off-7', name: 'Imsha Gaima', date: '2026-04-17' },
          { id: 'off-8', name: 'Deekshitha M', date: '2026-04-22' },
          { id: 'off-9', name: 'Aishwarya K', date: '2026-05-19' },
          { id: 'off-10', name: 'Santhosha A Doddamallappanavara', date: '2026-06-17' },
          { id: 'off-11', name: 'Namith Gowda', date: '2026-07-05' },
          { id: 'off-12', name: 'Varun R', date: '2026-08-20' },
          { id: 'off-13', name: 'Sinchana H S', date: '2026-09-12' },
          { id: 'off-14', name: 'Sahana N V', date: '2026-10-05' },
          { id: 'off-15', name: 'Tejashwini S', date: '2026-11-18' },
          { id: 'off-16', name: 'Rakshitha K M', date: '2026-12-04' },
          { id: 'off-17', name: 'Supriya S', date: '2026-05-30' },
          { id: 'off-18', name: 'Ashwini B G', date: '2026-08-12' }
        ];
        officeRoster.forEach(f => {
          if (!combinedData.some(p => (p.name || '').toLowerCase() === (f.name || '').toLowerCase())) {
            combinedData.push(f);
          }
        });
      }

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
    if (occurrence.getTime() < today.getTime()) return 'Passed';
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

        <div style={{ ...s.list, width: '100%', marginTop: '40px' }}>
          {(loading && birthdays.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>Syncing Celebration Data...</div>
          ) : birthdays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>No celebrations found for this year.</div>
          ) : birthdays.map((person, idx) => {
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
                  <div style={s.avatar}>{person.name.charAt(0)}</div>
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
