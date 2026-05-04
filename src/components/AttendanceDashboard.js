import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  Clock3,
  MapPin,
  ArrowLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import useGeolocation from '../hooks/useGeolocation';

/**
 * AttendanceDashboard Component
 * A professional, backend-connected biometric attendance tracker.
 */
const AttendanceDashboard = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const { coords, address: currentLocation, loading: geoLoading, error: geoError } = useGeolocation();
  const [logs, setLogs] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = winWidth < 768;

  // Geofencing: Office Location
  const OFFICE_COORDS = { lat: 12.2885, lon: 76.6345 };
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
  };

  const distance = (coords?.lat && coords?.lon) ? getDistance(coords.lat, coords.lon, OFFICE_COORDS.lat, OFFICE_COORDS.lon) : null;
  const isAtOffice = distance !== null && distance < 50; // 50 meter radius
  const OFFICE_ADDRESS = "NAVABHARATH TECHNOLOGIES, 2nd Floor, 667/B, Chitrabhanu Road, Kuvempu Nagara, Mysuru, Karnataka 570023";
  const displayAddress = isAtOffice ? OFFICE_ADDRESS : "NAVABHARATH TECHNOLOGIES, 2nd Floor, 667/B, Chitrabhanu Road, Kuvempu Nagara, Mysuru, Karnataka 570023"

  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // Responsive Effect
  useEffect(() => {
    const styleId = 'attendance-responsive-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @media (max-width: 1024px) {
          .attendance-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .attendance-container { padding: 15px !important; }
          .attendance-header { flex-direction: column; align-items: flex-start !important; gap: 20px; }
          .attendance-controls { flex-direction: column; width: 100% !important; gap: 15px; }
          .attendance-search { width: 100% !important; }
          .attendance-stats-grid { grid-template-columns: 1fr !important; }
          .attendance-table-header { 
            display: grid !important; 
            grid-template-columns: 180px 120px 80px 80px 80px 100px 180px !important; 
            min-width: 820px;
          }
          .attendance-table-row { 
            grid-template-columns: 180px 120px 80px 80px 80px 100px 180px !important; 
            min-width: 820px;
            padding: 12px 24px !important;
            border-bottom: 1px solid #f1f5f9 !important;
          }
          .attendance-table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .attendance-punch-card { flex-direction: column !important; padding: 20px !important; }
          .attendance-punch-btn { width: 100% !important; margin-top: 15px; }
          .mobile-hide { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchUser, setSelectedSearchUser] = useState(null);

  // Auto-fetch attendance on component mount
  useEffect(() => {
    if (user && (user.id || user.empId || user.userId || user.employee_id)) {
      fetchAttendance();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const delayDebounceFn = setTimeout(() => {
        performUserSearch();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const performUserSearch = async () => {
    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.USER_SEARCH(searchQuery), {
        headers: { 'Authorization': `Bearer ${token?.trim()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchedUser = (u) => {
    setSelectedSearchUser(u);
    setSearchQuery(u.name || u.employee_name || u.employee_id);
    setSearchResults([]);
    fetchAttendance(u.id || u.employee_id || u.userId);
  };

  const fetchAttendance = async (targetUserId = null) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Authentication token not found. Please log in again.");

      const rawUid = targetUserId || user?.id || user?.empId || user?.userId || user?.employee_id;
      const uid = String(rawUid || '').split(':')[0].trim();
      
      const url = `${BASE_URL}/api/attendance_logs?userId=${uid}&limit=1000`;

      const attendanceRes = await fetch(url, { 
        headers: { 
          'Authorization': `Bearer ${token.trim()}`, 
          'Accept': 'application/json' 
        } 
      });

      if (attendanceRes.status === 401) {
        throw new Error("Session expired or unauthorized. Please re-login.");
      }

      if (!attendanceRes.ok) {
        const errData = await attendanceRes.json().catch(() => ({}));
        throw new Error(errData.message || `Server Error: ${attendanceRes.status}`);
      }

      const data = await attendanceRes.json();
      const logsArray = Array.isArray(data) ? data : (data.value || data.data || data.logs || []);

      // Removed gaps fetch logic as it is not supported by the backend

      // Sort logs newest first
      const sortedLogs = [...logsArray].sort((a, b) => {
        const dateA = new Date(a.punch_date || a.date || a.created_at || 0);
        const dateB = new Date(b.punch_date || b.date || b.created_at || 0);
        return dateB - dateA;
      });

      // Determine check-in status from the LATEST log
      if (sortedLogs.length > 0) {
        const latest = sortedLogs[0];
        const hasIn = !!(latest.in_time && latest.in_time.trim() !== '' && latest.in_time !== '--:--');
        const hasOut = !!(latest.out_time && latest.out_time.trim() !== '' && latest.out_time !== '--:--' && latest.out_time !== '00:00:00');
        setIsCheckedIn(hasIn && !hasOut);
      } else {
        setIsCheckedIn(false);
      }

      setLogs(sortedLogs);
    } catch (err) {
      console.error("Attendance API Error:", err);
      setError(err.message || "Failed to sync attendance records.");
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async () => {
    const uid = selectedSearchUser?.id || selectedSearchUser?.employee_id || user?.employee_id || user?.empId || user?.id || user?.userId;
    if (!uid) return;

    setPunchLoading(true);
    // If outside while checked in, force a checkout. If inside, follow toggle.
    const action = (!isAtOffice && isCheckedIn) ? 'checkout' : (isCheckedIn ? 'checkout' : 'checkin');
    const token = localStorage.getItem('token');

    try {
      let status = 'PRESENT';
      let work_time = '00:00';

      if (action === 'checkout') {
        const latestLog = logs[0];
        if (latestLog && latestLog.in_time && latestLog.in_time !== '--:--') {
          const [h, m] = latestLog.in_time.split(':').map(Number);
          const start = new Date(); start.setHours(h, m, 0);
          const end = new Date();
          const diffMin = Math.floor((end - start) / 60000);
          const dh = Math.floor(diffMin / 60);
          const dm = diffMin % 60;
          work_time = `${dh}:${String(dm).padStart(2, '0')}`;
          status = dh < 4 ? 'HALF DAY' : 'PRESENT';
        }
      }

      const res = await fetch(`${BASE_URL}/api/attendance_logs/punch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userId: uid,
          action,
          timestamp: new Date().toISOString(),
          status,
          work_time,
          remark: !isAtOffice ? 'Home Checkout' : (status === 'HALF DAY' ? 'Auto Half Day (<4hrs)' : ''),
          location: displayAddress || 'Office Zone'
        })
      });

      if (res.ok) {
        setIsCheckedIn(!isCheckedIn);
        fetchAttendance(uid);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to record biometric punch.");
      }
    } catch (e) {
      console.error("Punch error:", e);
    } finally {
      setPunchLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusConfig = (log) => {
    const status = log.status;
    const remark = log.remark;
    const hasIn = !!(log.in_time && log.in_time.trim() !== '' && log.in_time !== '--:--');
    const hasOut = !!(log.out_time && log.out_time.trim() !== '' && log.out_time !== '--:--' && log.out_time !== '00:00:00');

    // Hybrid Logic: Local 4-hour override + Backend Source of Truth
    const [h, m] = (log.work_time || '00:00').split(':').map(Number);
    const isLate = remark?.toLowerCase().includes('lt') || remark?.toLowerCase().includes('late');

    // 1. If currently punched in (but not out)
    if (hasIn && !hasOut) {
      return { label: 'PRESENT', color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={12} />, isLive: true };
    }

    // 2. Local Override: Less than 4 hours is ALWAYS Half Day
    if (hasIn && hasOut && h < 4) {
      return { label: 'HALF DAY', color: '#f97316', bg: '#fff7ed', icon: <Clock3 size={12} /> };
    }

    // 3. Primary State: Trust the Backend Status column for all other cases
    switch (status?.toUpperCase()) {
      case 'P':
      case 'PRESENT':
        return { label: 'PRESENT', color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={12} /> };
      case 'HD':
      case 'HALF DAY':
        return { label: 'HALF DAY', color: '#f97316', bg: '#fff7ed', icon: <Clock3 size={12} /> };
      case 'A':
      case 'ABSENT':
        return { label: 'ABSENT', color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={12} /> };
      case 'LATE':
        return { label: 'LATE', color: '#f97316', bg: '#fff7ed', icon: <Clock3 size={12} /> };
      case 'WO':
      case 'OFF':
        return { label: 'WO', color: '#64748b', bg: '#f1f5f9', icon: <Clock size={12} /> };
      case 'NH':
      case 'HL':
        return { label: 'NH', color: '#64748b', bg: '#f1f5f9', icon: <Clock size={12} /> };
      default:
        // Final fallback: If remark says late, show Late, else show status
        if (isLate) return { label: 'LATE', color: '#f97316', bg: '#fff7ed', icon: <Clock3 size={12} /> };
        return { label: status || 'N/A', color: '#64748b', bg: '#f1f5f9', icon: <Clock size={12} /> };
    }
  };

  const filteredLogs = logs.filter(log => {
    const rawDate = log.punch_date || log.date;
    if (!rawDate) return false;

    // Normalize log date to start of day
    const d = new Date(rawDate);
    const logTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    // Check Start Date
    if (startDate) {
      const s = new Date(startDate);
      const startTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      if (logTime < startTime) return false;
    }

    // Check End Date
    if (endDate) {
      const e = new Date(endDate);
      const endTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
      if (logTime > endTime) return false;
    }

    const matchesFilter = filterStatus === 'ALL' || log.status === filterStatus;
    const matchesSearch = !searchQuery ||
      String(log.user_id || log.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(log.user_name || log.userName || log.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#f4f7fa', padding: '30px', fontFamily: "'Outfit', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    card: { backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #eef2f6', overflow: 'hidden' },
    tableHeader: { backgroundColor: '#fcfdfe', borderBottom: '1px solid #f1f5f9', padding: '18px 24px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr', gap: '15px' },
    tableRow: { padding: '16px 24px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr', gap: '15px', alignItems: 'center', transition: 'all 0.2s' },
    tag: (config) => ({ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content', padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', backgroundColor: config.bg, color: config.color, letterSpacing: '0.5px' }),
    searchBox: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '10px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '350px' },
    searchInput: { border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: '14px', fontWeight: '600', color: '#1e293b' },
    btnPrimary: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '14px', border: 'none', backgroundColor: '#0B1E3F', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }
  };

  return (
    <div style={s.container} className="attendance-container">
      <header style={s.header} className="attendance-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <motion.div whileHover={{ x: -5 }} onClick={onBack} style={{ cursor: 'pointer', backgroundColor: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <ArrowLeft size={20} color="#64748b" />
          </motion.div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Personal Attendance</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Biometric Syncing: Operational</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }} className="attendance-controls">
          <div style={{ position: 'relative' }}>
            <div style={s.searchBox} className="attendance-search">
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search Employee ID or Name..."
                style={s.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <RefreshCw size={14} color="#3B5998" className="animate-spin" />}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    backgroundColor: 'white', borderRadius: '16px', marginTop: '8px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
                    maxHeight: '300px', overflowY: 'auto'
                  }}
                >
                  {searchResults.map((u, i) => (
                    <div
                      key={u.id || i}
                      onClick={() => handleSelectSearchedUser(u)}
                      style={{
                        padding: '12px 20px', cursor: 'pointer', borderBottom: i === searchResults.length - 1 ? 'none' : '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '80%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#3B5998' }}>
                        {(u.name || u.employee_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{u.name || u.employee_name}</div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>{u.designation || 'Team Member'} • ID: {u.employee_id}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ ...s.searchBox, width: 'auto', gap: '8px' }}>
            <Calendar size={16} color="#94a3b8" />
            <input
              type="date"
              style={s.searchInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: '#94a3b8', fontWeight: '800', fontSize: '12px' }}>TO</span>
            <input
              type="date"
              style={s.searchInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: '800', cursor: 'pointer', padding: '0 5px' }}>×</button>
            )}
          </div>
          <button onClick={() => fetchAttendance()} style={{ ...s.btnPrimary, backgroundColor: 'white', color: '#0B1E3F', border: '1px solid #e2e8f0' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button style={s.btnPrimary}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </header>

      {/* Biometric Action Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ ...s.card, padding: isMobile ? '20px' : '24px', marginBottom: '32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '20px' : '0', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}
        className="attendance-punch-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' }}>
          <div style={{ padding: '15px', borderRadius: '18px', backgroundColor: isCheckedIn ? '#e0f2fe' : '#fef2f2', flexShrink: 0 }}>
            <MapPin size={24} color={isCheckedIn ? '#0ea5e9' : '#ef4444'} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>
              Biometric {isCheckedIn ? 'Check-out' : 'Check-in'}
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : '8px' }}>
              <div>Current Status: <span style={{ fontWeight: '800', color: isAtOffice ? '#22c55e' : '#ef4444' }}>{isAtOffice ? 'AT OFFICE' : 'HOME'}</span></div>
              {!isMobile && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />}
              <span
                onClick={() => {
                  if (!isAtOffice && coords.lat && coords.lon) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`, '_blank');
                  }
                }}
                style={{
                  fontWeight: '700',
                  color: isAtOffice ? '#64748b' : '#3B5998',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '4px',
                  cursor: (!isAtOffice && coords.lat && coords.lon) ? 'pointer' : 'default',
                  textDecoration: isAtOffice ? 'none' : 'underline',
                  wordBreak: 'break-word',
                  lineHeight: '1.4'
                }}
              >
                <MapPin size={10} style={{ marginTop: '3px', flexShrink: 0 }} /> {displayAddress}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePunch}
          disabled={punchLoading}
          style={{
            width: isMobile ? '100%' : 'auto',
            padding: '12px 32px',
            justifyContent: 'center',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: isCheckedIn ? '#ef4444' : '#22c55e',
            color: 'white',
            fontWeight: '900',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: `0 10px 20px ${isCheckedIn ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s'
          }}
          className="attendance-punch-btn"
        >
          {punchLoading ? <RefreshCw size={18} className="animate-spin" /> : (isCheckedIn ? <Clock size={18} /> : <ShieldCheck size={18} />)}
          {isCheckedIn ? 'PUNCH OUT' : 'PUNCH IN'}
        </button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '32px' }} className="attendance-stats-grid">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ ...s.card, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '12px' }}><CheckCircle size={18} color="#22c55e" /></div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>PRESENT</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>
              {filteredLogs.filter(l => getStatusConfig(l).label === 'PRESENT').length}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ ...s.card, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '12px' }}><AlertCircle size={18} color="#ef4444" /></div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>LEAVES</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>
              {filteredLogs.filter(l => getStatusConfig(l).label === 'ABSENT').length}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ ...s.card, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#fff7ed', padding: '10px', borderRadius: '12px' }}><Clock3 size={18} color="#f97316" /></div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>HALF DAYS</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>
              {filteredLogs.filter(l => getStatusConfig(l).label === 'HALF DAY').length}
            </div>
          </div>
        </motion.div>
      </div>

        <div style={s.card} className="attendance-table-container">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '10px' }}><Users size={18} color="#22c55e" /></div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>TOTAL LOGS</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{filteredLogs.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '10px' }}><ShieldCheck size={18} color="#2260ff" /></div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>VERIFIED BY</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Biometric API</div>
              </div>
            </div>
          </div>

          <div style={s.tableHeader} className="attendance-table-header">
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>EMPLOYEE</span>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>DATE</span>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>PUNCH IN</span>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>PUNCH OUT</span>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>WORK HRS</span>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>STATUS</span>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>AUDIT LOCATION</span>
          </div>

          <div style={{ minHeight: '400px', backgroundColor: 'white' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <RefreshCw size={40} color="#94a3b8" className="animate-spin" style={{ marginBottom: '15px', opacity: 0.3 }} />
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#94a3b8' }}>Syncing with Biometric Server...</div>
              </div>
            ) : error ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '60px', textAlign: 'center' }}>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '15px', opacity: 0.5 }} />
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Oops! Connectivity Error</div>
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{error}</div>
                <button onClick={() => fetchAttendance()} style={{ marginTop: '20px', padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', backgroundColor: 'white', fontWeight: '800', cursor: 'pointer' }}>Retry Sync</button>
              </motion.div>
            ) : filteredLogs.length > 0 ? (
              <AnimatePresence>
                {filteredLogs.map((log, idx) => {
                  const config = getStatusConfig(log);
                  return (
                    <motion.div
                      key={log.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ ...s.tableRow, borderBottom: idx === filteredLogs.length - 1 ? 'none' : '1px solid #f8fafc', cursor: 'pointer' }}
                      className="attendance-table-row"
                      whileHover={{ backgroundColor: '#fcfdfe' }}
                      onClick={() => {
                          const empId = log.user_id || log.employee_id;
                          if (onNavigate && empId) {
                              onNavigate('ATTENDANCE_DETAIL', { employeeId: empId });
                          }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eef2f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '900', color: '#0B1E3F' }}>
                          {String(log.user_name || log.userName || log.employee_name || log.user_id || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.user_name || log.userName || log.employee_name || 'System User'}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>ID: {log.user_id || log.employee_id || 'N/A'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="#94a3b8" />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>{formatDate(log.punch_date)}</span>
                      </div>

                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} /> {log.in_time || '--:--'}
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} /> {log.out_time || '--:--'}
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F' }}>
                        {(() => {
                          if (!log.in_time || log.in_time === '--:--') return '0:00';
                          const [ih, im] = log.in_time.split(':').map(Number);
                          const [oh, om] = (log.out_time && log.out_time !== '--:--' && log.out_time !== '00:00:00') ? log.out_time.split(':').map(Number) : [new Date().getHours(), new Date().getMinutes()];

                          let diff = (oh * 60 + om) - (ih * 60 + im);
                          if (diff < 0) diff += 1440;
                          const h = Math.floor(diff / 60);
                          const m = diff % 60;
                          return `${h}:${String(m).padStart(2, '0')}`;
                        })()}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>HOURS</div>
                    </div>

                    <div style={s.tag(config)}>
                      {config.icon} {config.label}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <MapPin size={12} color="#94a3b8" />
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.location || 'Office Zone'}>
                        {log.location || 'Office Zone'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <Calendar size={48} color="#94a3b8" style={{ marginBottom: '15px', opacity: 0.3 }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#94a3b8' }}>No logs found for this period.</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap');
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const CheckCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default AttendanceDashboard;
