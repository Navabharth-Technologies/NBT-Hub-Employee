import React, { useState, useEffect } from 'react';
import { Cake, ChevronLeft, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import BackButton from './BackButton';

const BirthdayScreen = ({ onBack }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    // Always clear stale birthday cache on mount to ensure fresh data after DOB edits
    localStorage.removeItem('nbt_birthdays_cache');
    localStorage.removeItem('nbt_birthdays_cache_v2');
    
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    fetchBirthdays();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Robust date parsing utility
  function parseSafe(dStr) {
    if (!dStr) return new Date();
    // Handle DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dStr)) {
      const parts = dStr.split(/[-/]/);
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(dStr);
  }

  async function fetchBirthdays() {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let combinedData = [];

      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      // Fetch from /api/users first (most up-to-date DOB from profile edits), then birthday-specific endpoints
      const endpoints = [
        `${BASE_URL}/api/users`,
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
              // Pick up the best available date (prefer date_of_birth for profile-synced DOBs)
              const bestDate = item.date_of_birth || item.dob || item.dateOfBirth || item.date || item.birthday;
              const personName = item.name || item.emp_name || item.employee_name || item.userName;
              
              if (personName) {
                const existingIndex = combinedData.findIndex(p => (p.name || '').toLowerCase() === personName.toLowerCase());
                if (existingIndex !== -1) {
                  // Update date if we found a better one
                  if (bestDate && !combinedData[existingIndex].date) {
                    combinedData[existingIndex].date = bestDate;
                  } else if (bestDate && combinedData[existingIndex].date !== bestDate) {
                    // Prefer a non-null date from a more authoritative source (date_of_birth wins)
                    if (item.date_of_birth || item.dob) {
                      combinedData[existingIndex].date = bestDate;
                    }
                  }
                } else {
                  combinedData.push({
                    ...item,
                    name: personName,
                    date: bestDate || null
                  });
                }
              }
            });
          }
        } catch (e) { }
      }

      clearTimeout(timeoutId);

      // ── Always fetch the logged-in user's own latest profile to get their up-to-date DOB ──
      // This ensures the birthday shows even if /api/birthdays doesn't have it yet.
      if (user) {
        const myName = user.name || user.employee_name || user.emp_name;
        const myEmail = user.email;

        // Start with DOB from the in-memory user context (already synced on login)
        let myDob = user.date_of_birth || user.dob || user.dateOfBirth || user.birthday || user.date;

        // If user context has no DOB, try fetching the profile directly
        if (!myDob && myEmail) {
          try {
            const profileRes = await fetch(`${BASE_URL}/api/profile/${myEmail}`, { headers });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              myDob = profileData.date_of_birth || profileData.dob || profileData.dateOfBirth
                   || profileData.birthday || profileData.date || null;
            }
          } catch (e) {}
        }

        if (myName) {
          // Remove any existing entry for this user and replace with the freshest data
          combinedData = combinedData.filter(p => (p.name || '').toLowerCase() !== myName.toLowerCase());
          combinedData.push({
            ...user,
            name: myName,
            date: myDob || null
          });
        }
      }



      // SORTING LOGIC: Passed Birthdays First (Jan-Dec chronological order), Missing Birthdays at the end
      const sorted = combinedData.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;

        const d1 = parseSafe(a.date);
        const d2 = parseSafe(b.date);
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
    if (!dateStr) return 'Not Added';
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
      padding: window.innerWidth < 768 ? '10px 15px' : '15px 40px',
      maxWidth: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      minHeight: 'auto',
      backgroundColor: '#f8fafc'
    },
    headerCard: {
      backgroundColor: 'white',
      borderRadius: '45px',
      padding: winWidth < 768 ? '25px 20px' : '35px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.02)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      position: 'relative'
    },
    cakeIcon: {
      width: '60px',
      height: '60px',
      backgroundColor: '#f8fafc',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0B1E3F',
      marginBottom: '5px'
    },
    title: {
      fontSize: winWidth < 768 ? '22px' : '28px',
      fontWeight: '1000',
      color: '#0B1E3F',
      marginBottom: '2px'
    },
    subtitle: {
      fontSize: '11px',
      fontWeight: '1000',
      color: '#3b82f6',
      textTransform: 'uppercase',
      letterSpacing: '2px'
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    itemCard: (status) => ({
      backgroundColor: 'white',
      borderRadius: '25px',
      padding: winWidth < 768 ? '18px' : '20px 35px',
      display: 'flex',
      flexDirection: winWidth < 768 ? 'column' : 'row',
      alignItems: winWidth < 768 ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: winWidth < 768 ? '12px' : '15px',
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
      backgroundColor: status === 'Today' ? '#e11d48' : status === 'Upcoming' ? '#FDB913' : status === 'Not Added' ? '#f1f5f9' : '#f8fafc',
      color: status === 'Today' ? 'white' : status === 'Upcoming' ? '#0B1E3F' : status === 'Not Added' ? '#94a3b8' : '#64748b',
      letterSpacing: '0.8px'
    })
  };

  return (
    <div style={s.container}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={s.headerCard}>
        <div style={{ position: 'absolute', top: winWidth < 768 ? '15px' : '25px', left: winWidth < 768 ? '15px' : '25px' }}>
          <BackButton onClick={onBack} />
        </div>
        <h1 style={s.title}>NBT Birthdays 🎂</h1>
        <div style={s.subtitle}>Passed & Upcoming Celebrations</div>

        <div style={{ ...s.list, width: '100%', marginTop: '20px' }}>
          {(loading && birthdays.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>Syncing Celebration Data...</div>
          ) : birthdays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '800' }}>No celebrations found.</div>
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
                  <div style={s.avatar}>{getInitials(person.name)}</div>
                  <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                    <div style={s.name}>{person.name}</div>
                    <div style={s.dateLine}>
                      <Cake size={14} color="#FDB913" />
                      {(() => {
                        if (!person.date) return 'Not Added';
                        const d = parseSafe(person.date);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
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

      <div style={{ height: '20px' }} /> {/* Space for NavigationDock */}
    </div>
  );
};

export default BirthdayScreen;
