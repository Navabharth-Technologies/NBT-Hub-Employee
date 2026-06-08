import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Clock3,
  MapPin,
  Activity,
  ArrowLeft,
  Download,
  FileText,
  ChevronDown,
  FileSpreadsheet,
  Palmtree,
  CalendarDays
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import useGeolocation from '../hooks/useGeolocation';
import BackButton from './BackButton';

/**
 * AttendanceDashboard Component
 * A professional, backend-connected biometric attendance tracker.
 */
const AttendanceDashboard = ({ onBack, onNavigate }) => {
  const { user } = useAuth();
  const { coords, address: currentLocation, loading: geoLoading, error: geoError } = useGeolocation();
  const [logs, setLogs] = useState([]);
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
  const isAtOffice = true;
  const OFFICE_ADDRESS = "NAVABHARATH TECHNOLOGIES, 2nd Floor, 667/B, Chitrabhanu Road, Kuvempu Nagara, Mysuru, Karnataka 570023";
  const displayAddress = currentLocation || OFFICE_ADDRESS;

  const getDefaultDates = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    const format = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return {
      start: format(start),
      end: format(end)
    };
  };

  const defaults = getDefaultDates();
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  // Auto-fetch attendance on component mount
  useEffect(() => {
    if (user && (user.id || user.empId || user.userId || user.employee_id)) {
      fetchAttendance();
    }
  }, [user]);

  const fetchAttendance = async (targetUserId = null) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Authentication token not found. Please log in again.");
      
      const cleanToken = token.replace(/['"]+/g, '').trim();

      const rawUid = targetUserId || user?.id || user?.empId || user?.userId || user?.employee_id;
      const uid = String(rawUid || '').split(':')[0].trim();

      const queryParams = new URLSearchParams({ userId: uid, limit: 1000 });
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const url = `${API_ENDPOINTS.ATTENDANCE_LOGS_GET}?${queryParams.toString()}`;

      const attendanceRes = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/json'
        }
      });

      if (attendanceRes.status === 401) {
        throw new Error("Session expired or unauthorized. Please re-login.");
      }

      if (!attendanceRes.ok) {
        const errData = attendanceRes.json().catch(() => ({}));
        throw new Error(errData.message || `Server Error: ${attendanceRes.status}`);
      }

      const data = await attendanceRes.json();
      const logsArray = Array.isArray(data) ? data : (data.value || data.data || data.logs || []);

      // Removed static stats calculation as it's now handled by dynamic useMemo based on filteredLogs

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
    const uid = user?.employee_id || user?.empId || user?.id || user?.userId;
    if (!uid) return;

    setPunchLoading(true);
    // If outside while checked in, force a checkout. If inside, follow toggle.
    const action = (!isAtOffice && isCheckedIn) ? 'checkout' : (isCheckedIn ? 'checkout' : 'checkin');
    const token = localStorage.getItem('token');
    const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';

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

      const res = await fetch(API_ENDPOINTS.ATTENDANCE_PUNCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
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

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
      
      doc.setFontSize(18);
      doc.setTextColor(11, 30, 63); // #0B1E3F
      doc.text("Attendance Report", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // #64748b
      const fmtDate = (raw) => { if (!raw) return 'All'; const p = String(raw).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : raw; };
      
      let displayStart = startDate;
      let displayEnd = endDate;

      if (filteredLogs && filteredLogs.length > 0) {
        const dates = filteredLogs
          .map(log => {
            const rawDate = log.punch_date || log.date;
            if (!rawDate) return null;
            if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
              const [year, month, day] = rawDate.trim().split('-').map(Number);
              return new Date(year, month - 1, day);
            }
            const d = new Date(rawDate);
            return isNaN(d.getTime()) ? null : d;
          })
          .filter(Boolean);

        if (dates.length > 0) {
          if (!displayStart) {
            const minDate = new Date(Math.min(...dates));
            const y = minDate.getFullYear();
            const m = String(minDate.getMonth() + 1).padStart(2, '0');
            const d = String(minDate.getDate()).padStart(2, '0');
            displayStart = `${y}-${m}-${d}`;
          }
          if (!displayEnd) {
            const maxDate = new Date(Math.max(...dates));
            const y = maxDate.getFullYear();
            const m = String(maxDate.getMonth() + 1).padStart(2, '0');
            const d = String(maxDate.getDate()).padStart(2, '0');
            displayEnd = `${y}-${m}-${d}`;
          }
        }
      }

      doc.text(`Employee: ${user?.name || 'N/A'} (ID: ${user?.id || user?.empId || 'N/A'})`, 14, 28);
      doc.text(`Date Range: ${fmtDate(displayStart)} to ${fmtDate(displayEnd)}`, 14, 34);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);

      const tableColumn = ["Date", "Punch In", "Punch Out", "Work Hrs", "Status", "Audit Location"];
      const tableRows = filteredLogs.map(log => [
        formatDate(log.punch_date || log.date),
        log.in_time || '--:--',
        log.out_time || '--:--',
        log.work_time || '--:--',
        getStatusConfig(log).label,
        log.location || 'Office Zone'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [11, 30, 63], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 35 }, // Date
            1: { cellWidth: 25 }, // Punch In
            2: { cellWidth: 25 }, // Punch Out
            3: { cellWidth: 25 }, // Work Hrs
            4: { cellWidth: 30 }, // Status
            5: { cellWidth: 'auto' } // Location
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save(`Attendance_Report_${user?.name?.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
      setShowExportMenu(false);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("PDF Export failed. Please try again.");
    }
  };

  const exportToExcel = () => {
    // Generate CSV as a fallback for Excel if xlsx is not available
    const headers = ["Employee", "Date", "Punch In", "Punch Out", "Work Hrs", "Status", "Audit Location"];
    const rows = filteredLogs.map(log => [
      user?.name || 'N/A',
      formatDate(log.punch_date || log.date),
      log.in_time || '--:--',
      log.out_time || '--:--',
      log.work_time || '--:--',
      getStatusConfig(log).label,
      log.location || 'Office Zone'
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Report_${user?.name?.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    // Prevent timezone shifts for date-only strings (e.g., "2026-06-06")
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const [year, month, day] = dateStr.trim().split('-').map(Number);
      return `${day}/${month}/${year}`;
    }
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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
    return matchesFilter;
  });

  const stats = useMemo(() => {
    const s = { present: 0, leaves: 0, halfDays: 0, totalLogs: filteredLogs.length };
    
    filteredLogs.forEach(log => {
      const config = getStatusConfig(log);
      const label = config.label.toUpperCase();
      
      if (label === 'PRESENT') {
        s.present++;
      } else if (label === 'HALF DAY') {
        s.halfDays++;
      } else if (label === 'ABSENT' || label === 'LEAVE' || label === 'L') {
        s.leaves++;
      }
    });
    
    return s;
  }, [filteredLogs]);

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
          <BackButton onClick={onBack} />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Personal Attendance</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Biometric Syncing: Operational</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }} className="attendance-controls">
          <div style={{ ...s.searchBox, width: 'auto', gap: '8px' }}>
            <Calendar size={16} color="#94a3b8" />
            <input
              type="date"
              style={s.searchInput}
              value={startDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: '#94a3b8', fontWeight: '800', fontSize: '12px' }}>TO</span>
            <input
              type="date"
              style={s.searchInput}
              value={endDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#ef4444', 
                  fontWeight: '800', 
                  fontSize: '12px', 
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '4px'
                }}
              >
                Clear
              </button>
            )}
          </div>

          <button onClick={() => fetchAttendance()} style={{ ...s.btnPrimary, backgroundColor: 'white', color: '#0B1E3F', border: '1px solid #e2e8f0' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          {/* Export Direct Button */}
          <button
            style={{ 
              ...s.btnPrimary, 
              width: isMobile ? '100%' : 'auto', 
              justifyContent: 'center',
              backgroundColor: '#0B1E3F',
              color: 'white',
              border: 'none',
              gap: '10px',
              padding: '0 20px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '12px'
            }}
            className="attendance-search"
            onClick={exportToPDF}
          >
            <FileText size={18} /> 
            <span style={{ position: 'relative', top: '-1px' }}>Export as PDF</span>
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
              <div>Current Status: <span style={{ fontWeight: '800', color: geoLoading ? '#94a3b8' : '#22c55e' }}>{geoLoading ? 'LOCATING...' : 'OFFICE'}</span></div>
              {!isMobile && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />}
              <span
                onClick={() => {
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`, '_blank');
                }}
                style={{
                  fontWeight: '700',
                  color: '#3B5998',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '4px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
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
            transition: 'all 0.3s ease',
            color: 'white',
            fontWeight: '900',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: `0 10px 20px ${isCheckedIn ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
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
              {stats.present}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ ...s.card, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '12px' }}><CalendarDays size={18} color="#ef4444" /></div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>LEAVE</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>
              {stats.leaves}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ ...s.card, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#fff7ed', padding: '10px', borderRadius: '12px' }}><Clock3 size={18} color="#f97316" /></div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>HALF DAYS</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>
              {stats.halfDays}
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
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{stats.totalLogs}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '10px' }}><ShieldCheck size={18} color="#2260ff" /></div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>VERIFIED BY</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>Biometric</div>
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
                    style={{ ...s.tableRow, borderBottom: idx === filteredLogs.length - 1 ? 'none' : '1px solid #f8fafc' }}
                    className="attendance-table-row"
                    whileHover={{ backgroundColor: '#fcfdfe' }}
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
// Force recompile for localhost:3002
