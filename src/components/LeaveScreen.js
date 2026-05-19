import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, ArrowLeft, Calendar, Info, Clock, CheckCircle, XCircle, X, Plus, Filter, Search, Users, Activity, Umbrella, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { API_ENDPOINTS } from '../config';

const LeaveScreen = ({ onBack, onNavigate, startWithForm }) => {
  const { user } = useAuth();
  const theme = getTheme(user?.role);
  const [activeTab, setActiveTab] = useState('MY_HISTORY'); // MY_HISTORY, TEAM_REQUESTS, HOLIDAYS, MONTHLY_CALENDAR
  const [showForm, setShowForm] = useState(startWithForm || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState(0);
  const [modalConfig, setModalConfig] = useState({ show: false, message: '', type: 'success' });
  const [leaveStats, setLeaveStats] = useState([]);
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalEvent, setSelectedCalEvent] = useState(null);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getStatusStyle = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'approved') return { padding: '6px 12px', border: '1px solid #16a34a', color: '#16a34a', borderRadius: '8px', fontSize: '10px', fontWeight: '900', backgroundColor: '#f0fdf4' };
    if (s === 'rejected') return { padding: '6px 12px', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontSize: '10px', fontWeight: '900', backgroundColor: '#fef2f2' };
    return { padding: '6px 12px', border: '1px solid #e2e8f0', color: '#94a3b8', borderRadius: '8px', fontSize: '10px', fontWeight: '900', backgroundColor: 'white' };
  };

  const [formData, setFormData] = useState({
    type: 'Earned Leaves',
    to: '',
    cc: '',
    reason: '',
    start_date: '',
    end_date: '',
    isHalfDay: false,
    halfDaySlot: ''
  });

  const isLeader = (user?.role || '').toLowerCase().includes('lead') || (user?.role || '').toLowerCase() === 'tl';

  useEffect(() => {
    if (user) {
      fetchData();
      fetchUserBalance();
      fetchHolidays();
      fetchLeaveStats();
      if (isLeader) setActiveTab('TEAM_REQUESTS');
    }
  }, [user?.id, user?.employee_id, user?.empId]);

  useEffect(() => {
    if (user) {
      fetchStaffEmails();
    }
  }, [user?.id, user?.employee_id, user?.empId]);

  const sanitizeId = (id) => String(id || '').split(':')[0];

  const fetchLeaveStats = async () => {
    const rawUid = user?.id || user?.empId || user?.employee_id || user?.userId;
    const uid = sanitizeId(rawUid);
    if (!uid) return;
    try {
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }
      
      console.log(`[Leave] Fetching stats for UID: ${uid} from ${API_ENDPOINTS.LEAVE_STATS(uid)}`);
      const res = await fetch(API_ENDPOINTS.LEAVE_STATS(uid), { headers });
      
      if (res.ok) {
        const rawData = await res.json();
        console.log("[Leave] Raw stats received:", rawData);
        
        // Handle various backend response formats
        const data = Array.isArray(rawData) ? rawData : (rawData.data || rawData.value || []);
        
        // Final sanity check on data
        if (data.length === 0) {
          console.warn("[Leave] Stats fetched successfully but array is empty.");
        }
        
        setLeaveStats(data);
      } else {
        console.error(`[Leave] Stats fetch failed with status: ${res.status}`);
      }
    } catch (e) {
      console.error("[Leave] Stats fetch catastrophic error:", e);
    }
  };

  const fetchUserBalance = async () => {
    const rawUid = user?.id || user?.empId || user?.employee_id || user?.userId;
    const uid = sanitizeId(rawUid);
    if (!uid) return;
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken && !cleanToken.startsWith('joinee-')) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      const response = await axios.get(API_ENDPOINTS.LEAVE_BALANCE(uid), { headers });
      if (response.status === 200) {
        const data = response.data.data || response.data.value || response.data;
        const detectedBalance = data.leave_balance ?? data.balance ?? data.total_leaves ?? data.total_balance ?? 20;
        setLeaveBalance(Number(detectedBalance));
      } else {
        setLeaveBalance(20); // Fallback
      }
    } catch (err) {
      setLeaveBalance(20); // Fallback
    }
  };

  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken && !cleanToken.startsWith('joinee-')) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      const response = await axios.get(API_ENDPOINTS.HOLIDAYS, { headers }).catch(() => null);
      if (response && response.status === 200) {
        setHolidays(response.data);
      }
    } catch (err) {
      console.error("[Leave] Error fetching holidays:", err);
    }
  };

  const fetchStaffEmails = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const headers = { 'Accept': 'application/json' };
      if (cleanToken && !cleanToken.startsWith('joinee-')) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      const response = await axios.get(API_ENDPOINTS.USERS, { headers }).catch(() => null);
      if (response && response.status === 200) {
        const allUsers = response.data;
        const managerName = user.reportingManagerName || user.reporting_manager;
        const managerObj = allUsers.find(u => (u.name || '').toLowerCase() === (managerName || '').toLowerCase());
        const managerEmail = managerObj?.email || '';
        const hrObj = allUsers.find(u => (u.role || '').toLowerCase() === 'hr');
        const hrEmail = hrObj?.email || '';
        const pmObj = allUsers.find(u => (u.role || '').toLowerCase().includes('project manager'));
        const pmEmail = pmObj?.email || '';

        setFormData(prev => ({
          ...prev,
          to: managerEmail || prev.to,
          cc: isLeader ? hrEmail : `${pmEmail}, ${hrEmail}`
        }));
      }
    } catch (err) {
      console.error("Error fetching staff emails:", err);
    }
  };

  const fetchData = async () => {
    const rawUid = user?.id || user?.empId || user?.employee_id || user?.userId;
    const uid = sanitizeId(rawUid);
    if (!uid) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      if (cleanToken && !cleanToken.startsWith('joinee-')) {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      // Use the correct GET endpoint for fetching leave history
      const myUrl = API_ENDPOINTS.MY_LEAVES_GET(uid);

      const response = await fetch(myUrl, { headers }).catch(() => null);

      if (!response || !response.ok) {
        console.warn("[Leave] Backend fetch failed.");
        setMyLeaves([]);
      } else {
        const rawData = await response.json().catch(() => []);
        const data = Array.isArray(rawData) ? rawData : (rawData.data || rawData.leaves || []);
        
        // Debug logging for half-day detection as requested
        console.log("[Leave] Received leave records:", data);

        setMyLeaves(data);
      }
      if (isLeader) {
        const teamRes = await fetch(API_ENDPOINTS.ALL_LEAVES, { headers }).catch(() => null);
        if (teamRes && teamRes.ok) {
          const data = await teamRes.json().catch(() => []);
          setPendingRequests(data.filter(r => String(r.status || '').toUpperCase() === 'PENDING'));
        }
      }
    } catch (error) {
      setMyLeaves([]);
    } finally {
      setLoading(false);
    }
  };


  const handleAction = async (id, status) => {
    const token = localStorage.getItem('token');
    const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
    try {
      const res = await fetch(API_ENDPOINTS.UPDATE_LEAVE_STATUS(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setPendingRequests(pendingRequests.filter(r => r.id !== id));
        setModalConfig({ show: true, message: `Leave Request ${status} successfully.`, type: 'success' });
        fetchData();
        fetchUserBalance();
      } else {
        throw new Error(`Failed to update status`);
      }
    } catch (error) {
      setModalConfig({ show: true, message: "Error processing decision: " + error.message, type: 'error' });
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
    const uid = user?.id || user?.empId || user?.employee_id || user?.userId;

    try {
      // Frontend Probation Check for Casual Leave ONLY
      if (formData.type === 'Casual Leave' && user.joining_date) {
        const joinDate = new Date(user.joining_date);
        const today = new Date();
        const diffDays = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));

        if (diffDays < 90) {
          setModalConfig({
            show: true,
            message: `Casual Leave can only be applied after 3 months of joining. Service days: ${diffDays}/90`,
            type: 'error'
          });
          return;
        }
      }

      const days = calculateDays(formData.start_date, formData.end_date);
      const mId = Number(user.reporting_manager_id || user.reportingManagerId || user.manager_id || user.managerId || 1);

      const payload = {
        user_id: Number(uid),
        userId: Number(uid),
        employee_id: Number(uid),
        emp_id: Number(uid),
        
        name: user?.name || 'Employee',
        employee_name: user?.name || 'Employee',
        email: user?.email || '',

        manager_id: mId,
        managerId: mId,
        reporting_manager_id: mId,

        leave_type: formData.type,
        leaveType: formData.type,

        start_date: formData.start_date,
        startDate: formData.start_date,

        end_date: formData.end_date,
        endDate: formData.end_date,

        reason: formData.reason,
        remark: formData.reason,

        status: 'PENDING',
        no_of_days: formData.isHalfDay ? 0.5 : days,
        total_days: formData.isHalfDay ? 0.5 : days,
        is_half_day: formData.isHalfDay,
        isHalfDay: formData.isHalfDay,
        is_halfday: formData.isHalfDay,
        is_half_day_leave: formData.isHalfDay ? 1 : 0, // Integer version
        half_day: formData.isHalfDay ? 1 : 0,
        half_day_slot: formData.halfDaySlot,
        halfDaySlot: formData.halfDaySlot,
        halfday_slot: formData.halfDaySlot,
        applied_on: new Date().toISOString().split('T')[0]
      };

      console.log("[Leave] Submitting REDUNDANT payload:", payload);

      if (!cleanToken || cleanToken === 'undefined' || cleanToken === 'null') {
         setModalConfig({ show: true, message: "Authentication Error: Please log out and log back in.", type: 'error' });
         setIsSubmitting(false);
         return;
      }

      const res = await fetch(API_ENDPOINTS.LEAVE_REQUEST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalConfig({ show: true, message: "Leave request submitted successfully!", type: 'success' });
        setShowForm(false);
        fetchData();
        fetchUserBalance();
      } else {
        const err = await res.json().catch(() => ({}));
        setModalConfig({ show: true, message: `Error ${res.status}: ${err.message || err.error || "Failed to submit request."}`, type: 'error' });
      }
    } catch (error) {
      setModalConfig({ show: true, message: "Error submitting request: " + error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const sDate = new Date(start);
    const eDate = new Date(end);
    const diffTime = Math.abs(eDate - sDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalPaidTaken = myLeaves
    .filter(l => {
      const status = String(l.rm_status || l.status || '').toUpperCase();
      const type = String(l.leave_type || l.leaveType || '').toUpperCase();
      return status === 'APPROVED' && !type.includes('LOP');
    })
    .reduce((acc, curr) => {
      const isHalf = curr.is_half_day === true || String(curr.is_half_day) === 'true' || 
                    curr.isHalfDay === true || String(curr.isHalfDay) === 'true' ||
                    Number(curr.no_of_days) === 0.5 || 
                    curr.half_day_slot || curr.halfDaySlot || curr.halfday_slot;
      return acc + (isHalf ? 0.5 : (Number(curr.no_of_days) || calculateDays(curr.start_date, curr.end_date)));
    }, 0);

  const netBalance = Math.max(0, leaveBalance - totalPaidTaken);

  const casualLeavesCount = myLeaves
    .filter(l => {
      const status = String(l.rm_status || l.status || '').toUpperCase();
      const type = String(l.leave_type || l.leaveType || '').toUpperCase();
      return status === 'APPROVED' && (type.includes('CASUAL') || type.includes('ANNUAL'));
    })
    .reduce((acc, curr) => acc + (Number(curr.no_of_days) || calculateDays(curr.start_date, curr.end_date)), 0);

  const lopLeavesCount = myLeaves
    .filter(l => {
      const status = String(l.rm_status || l.status || '').toUpperCase();
      const type = String(l.leave_type || l.leaveType || '').toUpperCase();
      return status === 'APPROVED' && type.includes('LOP');
    })
    .reduce((acc, curr) => acc + (Number(curr.no_of_days) || calculateDays(curr.start_date, curr.end_date)), 0);

  // Derive top card values from backend leaveStats if available (Respecting the Filter)
  const filteredStats = leaveStats.filter(s => monthFilter === 'ALL' || String(s.month) === String(monthFilter));
  
  const statsCasualTotal = filteredStats.reduce((acc, s) => acc + Number(s.leaves_taken ?? s.leavesTaken ?? s.taken ?? 0), 0);
  const statsLopTotal = filteredStats.reduce((acc, s) => acc + Number(s.LOP ?? s.lop ?? s.loss_of_pay ?? 0), 0);
  
  const sortedStats = [...leaveStats].sort((a, b) => {
    const aVal = (Number(a.year) * 12) + Number(a.month);
    const bVal = (Number(b.year) * 12) + Number(b.month);
    return bVal - aVal;
  });

  const latestStat = monthFilter === 'ALL' ? sortedStats[0] : filteredStats[0];
  const statsBalance = latestStat ? (latestStat.leaves_available ?? latestStat.leavesAvailable ?? latestStat.balance ?? netBalance) : netBalance;

  // Final display values
  const displayBalance = Math.max(0, leaveStats.length > 0 ? statsBalance : netBalance);
  const displayCasual = leaveStats.length > 0 ? statsCasualTotal : casualLeavesCount;
  const displayLop = leaveStats.length > 0 ? statsLopTotal : lopLeavesCount;

  const getNextHoliday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return holidays
      .filter(h => new Date(h.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  };

  const nextHoliday = getNextHoliday();

  const getMonthlyStats = () => {
    const stats = {};
    myLeaves.forEach(l => {
      const status = String(l.rm_status || l.status || '').toUpperCase();
      if (status === 'APPROVED' && l.start_date) {
        const d = new Date(l.start_date);
        const month = d.toLocaleString('en-US', { month: 'long' });
        const year = d.getFullYear();
        const key = `${year}-${d.getMonth()}`;
        if (!stats[key]) {
          stats[key] = { month, year, taken: 0 };
        }
        stats[key].taken += (Number(l.no_of_days) || calculateDays(l.start_date, l.end_date));
      }
    });
    
    const d = new Date();
    const currentMonth = d.toLocaleString('en-US', { month: 'long' });
    const currentYear = d.getFullYear();
    const currentKey = `${currentYear}-${d.getMonth()}`;
    
    if (!stats[currentKey]) {
      stats[currentKey] = { month: currentMonth, year: currentYear, taken: 0 };
    }

    return Object.values(stats).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return new Date(`${b.month} 1, 2000`) - new Date(`${a.month} 1, 2000`);
    });
  };

  const renderMonthlyCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrent: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ date: new Date(year, month, i), isCurrent: true });
    }
    const total = cells.length <= 35 ? 35 : 42;
    const remaining = total - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: new Date(year, month + 1, i), isCurrent: false });
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '20px 30px', borderRadius: '25px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
              style={{ width: '40px', height: '40px', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0B1E3F' }}
            >
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: winWidth < 768 ? '20px' : '26px', fontWeight: '1000', color: '#0B1E3F' }}>
              {monthNames[month]} {year}
            </h2>
            <button 
              onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
              style={{ width: '40px', height: '40px', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0B1E3F' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={() => setCalendarDate(new Date())}
            style={{ padding: '10px 20px', borderRadius: '14px', backgroundColor: '#eff6ff', color: '#1e40af', border: 'none', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.1)' }}
          >
            Today
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '30px', overflow: 'hidden', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {weekdays.map((wd, idx) => (
              <div key={idx} style={{ padding: '15px 10px', textAlign: 'center', fontSize: '12px', fontWeight: '900', color: idx === 0 || idx === 6 ? '#ef4444' : '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {wd}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((cell, idx) => {
              const dStr = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
              const isToday = new Date().toDateString() === cell.date.toDateString();
              
              const dayHols = holidays.filter(h => h.date === dStr);
              const dayLeaves = myLeaves.filter(l => {
                if (!l.start_date) return false;
                const start = new Date(l.start_date.split('T')[0]);
                const end = new Date((l.end_date || l.start_date).split('T')[0]);
                start.setHours(0,0,0,0);
                end.setHours(23,59,59,999);
                const cur = new Date(cell.date);
                cur.setHours(12,0,0,0);
                return cur >= start && cur <= end;
              });

              return (
                <div
                  key={idx}
                  onClick={() => (dayHols.length || dayLeaves.length) ? setSelectedCalEvent({ date: cell.date, holidays: dayHols, leaves: dayLeaves }) : null}
                  style={{
                    minHeight: winWidth < 768 ? '85px' : '120px',
                    padding: '10px',
                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #f1f5f9',
                    borderBottom: idx >= cells.length - 7 ? 'none' : '1px solid #f1f5f9',
                    backgroundColor: isToday ? '#fafafa' : 'white',
                    cursor: (dayHols.length || dayLeaves.length) ? 'pointer' : 'default',
                    opacity: cell.isCurrent ? 1 : 0.4,
                    transition: 'all 0.2s',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                  onMouseEnter={e => { if (dayHols.length || dayLeaves.length) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = isToday ? '#fafafa' : 'white'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ 
                      width: '26px', height: '26px', borderRadius: '50%', 
                      backgroundColor: isToday ? '#0B1E3F' : 'transparent', 
                      color: isToday ? 'white' : (cell.date.getDay() === 0 || cell.date.getDay() === 6 ? '#ef4444' : '#1e293b'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '900'
                    }}>
                      {cell.date.getDate()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    {dayHols.map((h, hidx) => (
                      <div key={`h-${hidx}`} style={{ padding: '4px 8px', borderRadius: '6px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', fontSize: winWidth < 768 ? '9px' : '10px', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(239,68,68,0.2)' }}>
                        🌴 {h.occasion || h.name || h.holiday_name}
                      </div>
                    ))}
                    {dayLeaves.map((l, lidx) => {
                      const st = String(l.rm_status || l.status || '').toUpperCase();
                      const isApp = st === 'APPROVED';
                      const isRej = st === 'REJECTED';
                      const bg = isApp ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isRej ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)');
                      const shadow = isApp ? 'rgba(16,185,129,0.2)' : (isRej ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)');
                      return (
                        <div key={`l-${lidx}`} style={{ padding: '4px 8px', borderRadius: '6px', background: bg, color: 'white', fontSize: winWidth < 768 ? '9px' : '10px', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: `0 2px 6px ${shadow}` }}>
                          {isApp ? '🟢' : (isRej ? '🔴' : '🟡')} {l.leave_type || 'Leave'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: winWidth < 768 ? '15px 15px 120px 15px' : '30px 40px 120px 40px', boxSizing: 'border-box' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', padding: '20px' },
    backBtn: { width: '45px', height: '45px', borderRadius: '15px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    requestBtn: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0B1E3F', color: 'white', padding: '12px 25px', borderRadius: '15px', border: 'none', fontWeight: '900', fontSize: '14px', cursor: 'pointer' },
    tabs: { display: 'flex', gap: '30px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0' },
    tab: (active) => ({ padding: '15px 5px', color: active ? '#0B1E3F' : '#64748b', fontWeight: '900', fontSize: '15px', cursor: 'pointer', borderBottom: active ? '3px solid #0B1E3F' : '3px solid transparent', transition: 'all 0.2s' }),
    card: { backgroundColor: 'white', borderRadius: '30px', padding: '30px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' },
    pendingItem: { display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 600 ? 'flex-start' : 'center', padding: winWidth < 768 ? '15px' : '25px', backgroundColor: '#f8fafc', borderRadius: '25px', marginBottom: '15px', border: '1px solid #f1f5f9', gap: '15px' },
    actionBtn: (type) => ({ backgroundColor: type === 'approve' ? '#22c55e' : '#ef4444', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 10px ${type === 'approve' ? '#22c55e' : '#ef4444'}30` })
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '12px' : '20px' }}>
          <button style={s.backBtn} onClick={onBack}><ArrowLeft size={winWidth < 768 ? 16 : 20} color="#0B1E3F" /></button>
          <div>
            <h1 style={{ margin: 0, fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-0.3px' }}>Leave Management</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: winWidth < 768 ? '11px' : '13px', fontWeight: '800' }}>Balance, history & holiday calendar</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Global Month Filter */}
          <div style={{ position: 'relative', display: winWidth < 600 ? 'none' : 'block' }}>
            <select 
              value={monthFilter} 
              onChange={e => setMonthFilter(e.target.value)}
              style={{ 
                padding: '10px 35px 10px 15px', 
                borderRadius: '12px', 
                border: '1.5px solid #e2e8f0', 
                background: 'white', 
                fontSize: '12px', 
                fontWeight: '1000', 
                color: '#0B1E3F',
                appearance: 'none',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              <option value="ALL">Full Year</option>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Filter size={12} color="#94a3b8" />
            </div>
          </div>

          <button style={{ ...s.requestBtn, padding: winWidth < 768 ? '6px 12px' : '6px 20px', gap: '8px', height: '40px' }} onClick={() => setShowForm(true)}>
            <Plus size={18} /> {winWidth < 480 ? 'Add' : 'Take time off'}
          </button>
        </div>
      </div>

      {/* Compact Premium Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr 1fr' : 'repeat(2, 1fr)', gridTemplateColumns: winWidth < 1024 ? (winWidth < 768 ? '1fr' : 'repeat(2, 1fr)') : 'repeat(4, 1fr)', gap: '25px', marginBottom: '45px' }}>
        {/* Available Balance - Royal Neon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, rotate: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: 'absolute', right: '-12px', top: '-12px', color: '#3b82f6', opacity: 0.2 }}
          >
            <CreditCard size={110} />
          </motion.div>
          <p style={{ opacity: 0.7, margin: 0, fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Available leaves</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: winWidth < 768 ? '36px' : '42px', fontWeight: '1000', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{displayBalance}</h2>
            <span style={{ opacity: 0.6, fontSize: '15px', fontWeight: '800' }}>Days</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', width: 'fit-content', fontSize: '10px', fontWeight: '900', color: '#60a5fa' }}>⚡ READY TO USE</div>
        </motion.div>

        {/* Casual Leave - Emerald Green */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, rotate: -0.5 }}
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
            padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(16, 185, 129, 0.25)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', color: 'white', opacity: 0.15 }}><Calendar size={120} /></div>
          <p style={{ opacity: 0.8, margin: 0, fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Casual Leave</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: winWidth < 768 ? '36px' : '42px', fontWeight: '1000' }}>{displayCasual}</h2>
            <span style={{ opacity: 0.6, fontSize: '15px', fontWeight: '800' }}>Leaves</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <Activity size={12} /> VERIFIED RECORDS
          </div>
        </motion.div>

        {/* Loss of Pay - Purple Glow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, rotate: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
            padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(139, 92, 246, 0.25)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', color: 'white', opacity: 0.15 }}><Info size={120} /></div>
          <p style={{ opacity: 0.8, margin: 0, fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Loss of Pay</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: winWidth < 768 ? '36px' : '42px', fontWeight: '1000' }}>{displayLop}</h2>
            <span style={{ opacity: 0.6, fontSize: '15px', fontWeight: '800' }}>Days</span>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <Clock size={12} /> LOP RECORDS
          </div>
        </motion.div>

        {/* Holiday Card - Deep Red */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => onNavigate ? onNavigate('CALENDAR') : setActiveTab('HOLIDAYS')}
          style={{
            background: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
            padding: '25px', borderRadius: '25px', color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer'
          }}
        >
          <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', color: 'white', opacity: 0.15 }}><Umbrella size={120} /></div>
          <p style={{ opacity: 0.8, margin: 0, fontSize: '11px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Next Holiday</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '15px' }}>
            <h2 style={{ margin: 0, fontSize: winWidth < 768 ? '28px' : '38px', fontWeight: '1000' }}>{nextHoliday?.occasion || nextHoliday?.name || '---'}</h2>
          </div>
          <div style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            🌴 HOLIDAY
          </div>
        </motion.div>
      </div>

      <div style={s.tabs}>
        {isLeader && <div style={s.tab(activeTab === 'TEAM_REQUESTS')} onClick={() => setActiveTab('TEAM_REQUESTS')}>Team Requests</div>}
        <div style={s.tab(activeTab === 'MY_HISTORY')} onClick={() => setActiveTab('MY_HISTORY')}>My History</div>
        <div style={s.tab(activeTab === 'MONTHLY_STATS')} onClick={() => setActiveTab('MONTHLY_STATS')}>Monthly Stats</div>
        <div style={s.tab(activeTab === 'MONTHLY_CALENDAR')} onClick={() => setActiveTab('MONTHLY_CALENDAR')}>Monthly Calendar</div>
      </div>

      <div style={s.card}>
        {activeTab === 'TEAM_REQUESTS' && (
          <div>
            {pendingRequests.length > 0 ? pendingRequests.map(req => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={req.id}
                style={{ ...s.pendingItem, cursor: 'pointer' }}
                onClick={() => setSelectedLeave(req)}
              >
                <div style={{ display: 'flex', flexDirection: winWidth < 480 ? 'column' : 'row', gap: winWidth < 768 ? '15px' : '25px' }}>
                  <div style={{ width: winWidth < 768 ? '45px' : '55px', height: winWidth < 768 ? '45px' : '55px', borderRadius: '18px', background: 'linear-gradient(135deg, #0B1E3F 0%, #1e3a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: winWidth < 768 ? '16px' : '20px', fontWeight: '1000' }}>
                    {(req.user_name || req.name || 'E').charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{req.user_name || req.name || 'Employee'}</h4>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>
                      Requested {req.leave_type} for <span style={{ color: '#0B1E3F' }}>
                        {req.is_half_day === true || String(req.is_half_day) === 'true' || Number(req.no_of_days) === 0.5 || req.half_day_slot 
                          ? `Half Day (${req.half_day_slot || 'Slot N/A'})` 
                          : `${req.no_of_days || calculateDays(req.start_date, req.end_date)} Days`}
                      </span>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        📅 {(req.start_date || '').split('T')[0]} { (req.is_half_day === true || String(req.is_half_day) === 'true' || Number(req.no_of_days) === 0.5 || req.half_day_slot) ? '' : `to ${(req.end_date || '').split('T')[0]}`}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>💬 {req.reason || req.remark}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <button onClick={(e) => { e.stopPropagation(); handleAction(req.id, 'Approved'); }} style={s.actionBtn('approve')}><CheckCircle size={20} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleAction(req.id, 'Rejected'); }} style={s.actionBtn('reject')}><XCircle size={20} /></button>
                </div>
              </motion.div>
            )) : <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>No pending requests found!</p>}
          </div>
        )}

        {activeTab === 'MY_HISTORY' && (
          <div>
            {myLeaves.length > 0 ? myLeaves
                .filter(l => {
                  if (monthFilter === 'ALL') return true;
                  const leaveMonth = new Date(l.start_date || l.startDate).getMonth() + 1;
                  return String(leaveMonth) === String(monthFilter);
                })
                .map(req => {
              const isHalf = req.is_half_day === true || String(req.is_half_day) === 'true' || 
                             req.isHalfDay === true || String(req.isHalfDay) === 'true' ||
                             Number(req.no_of_days) === 0.5 || 
                             req.half_day_slot || req.halfDaySlot || req.halfday_slot;
              return (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={req.id}
                  style={{ ...s.pendingItem, cursor: 'pointer', backgroundColor: 'white' }}
                  onClick={() => setSelectedLeave(req)}
                >
                  <div style={{ display: 'flex', flexDirection: winWidth < 480 ? 'column' : 'row', gap: winWidth < 768 ? '15px' : '25px' }}>
                    <div style={{ width: winWidth < 768 ? '45px' : '55px', height: winWidth < 768 ? '45px' : '55px', borderRadius: '18px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B1E3F', fontSize: winWidth < 768 ? '16px' : '18px', fontWeight: '1000' }}>
                      <Calendar size={winWidth < 768 ? 20 : 24} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{req.leave_type || req.leaveType}</h4>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>
                        Duration: <span style={{ color: '#0B1E3F' }}>
                          {isHalf ? `Half Day (${req.half_day_slot || req.halfDaySlot || 'Slot N/A'})` : `${req.no_of_days || calculateDays(req.start_date, req.end_date)} Days`}
                        </span>
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          📅 {(req.start_date || '').split('T')[0]} { isHalf ? '' : `to ${(req.end_date || '').split('T')[0]}`}
                        </span>
                        {(req.reason || req.remark) && (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>💬 {req.reason || req.remark}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '8px 15px',
                    borderRadius: '12px',
                    backgroundColor: (req.rm_status || req.status) === 'Approved' ? '#f0fdf4' : (req.rm_status || req.status) === 'Rejected' ? '#fef2f2' : '#fffbeb',
                    color: (req.rm_status || req.status) === 'Approved' ? '#22c55e' : (req.rm_status || req.status) === 'Rejected' ? '#ef4444' : '#f59e0b',
                    fontSize: '12px',
                    fontWeight: '900'
                  }}>
                    {String(req.rm_status && req.rm_status !== 'Pending' ? req.rm_status : (req.status || 'Pending')).toUpperCase()}
                  </div>
                </motion.div>
              );
            }) : <p style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>You have no leave history yet.</p>}
              
              {myLeaves.length > 0 && myLeaves.filter(l => {
                  if (monthFilter === 'ALL') return true;
                  const leaveMonth = new Date(l.start_date || l.startDate).getMonth() + 1;
                  return String(leaveMonth) === String(monthFilter);
                }).length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: '800' }}>
                  No leave records found for the selected month.
                </div>
              )}
            </div>
          )}

        {activeTab === 'MONTHLY_STATS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '25px', border: '1.5px solid #f1f5f9' }}>
              <div style={{ minWidth: '700px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '20px 30px', borderBottom: '2px solid #f8fafc', backgroundColor: '#fcfdfe' }}>
                  <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Reporting Month</span>
                  <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Year</span>
                  <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Leaves Taken</span>
                  <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Balance</span>
                  <span style={{ fontSize: '11px', fontWeight: '1000', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>LOP Days</span>
                </div>
                
                {(leaveStats.length > 0 ? leaveStats : getMonthlyStats())
                  .filter(stat => monthFilter === 'ALL' || String(stat.month) === String(monthFilter))
                  .map((stat, idx) => {
                    const mVal = parseInt(stat.month);
                    const monthName = !isNaN(mVal) && mVal >= 1 && mVal <= 12 ? 
                      ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][mVal - 1] : 
                      (stat.month || "---");
                    
                    const taken = stat.leaves_taken ?? stat.leavesTaken ?? stat.taken ?? 0;
                    const available = Math.max(0, stat.leaves_available ?? stat.leavesAvailable ?? stat.available ?? stat.balance ?? netBalance);
                    const lop = stat.LOP ?? stat.lop ?? stat.loss_of_pay ?? 0;

                    return (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx}
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', 
                          padding: '22px 30px', 
                          borderBottom: '1px solid #f1f5f9', 
                          alignItems: 'center',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ fontSize: '15px', fontWeight: '1000', color: '#0B1E3F' }}>{monthName}</span>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#64748b' }}>{stat.year || '---'}</span>
                        <span style={{ fontSize: '16px', fontWeight: '1000', color: '#ef4444', textAlign: 'center' }}>{taken}</span>
                        <span style={{ fontSize: '16px', fontWeight: '1000', color: '#22c55e', textAlign: 'center' }}>{available}</span>
                        <span style={{ fontSize: '16px', fontWeight: '1000', color: '#7c3aed', textAlign: 'center' }}>{lop}</span>
                      </motion.div>
                    );
                  })}

                {(leaveStats.length > 0 ? leaveStats : getMonthlyStats()).filter(stat => monthFilter === 'ALL' || String(stat.month) === String(monthFilter)).length === 0 && (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontWeight: '800' }}>
                    No records found for the selected month.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'HOLIDAYS' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {holidays.length > 0 ? holidays.map(h => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={h.id} style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '15px', backgroundColor: '#0B1E3F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Umbrella size={24} />
                  </div>
                  <span style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>Public</span>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '1000', color: '#0B1E3F' }}>{h.occasion || h.name || h.holiday_name}</h4>
                  <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: '800', color: '#22c55e' }}>{h.date}</p>
                </div>
              </motion.div>
            )) : <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: '800' }}>No holidays listed.</p>}
          </div>
        )}

        {activeTab === 'MONTHLY_CALENDAR' && renderMonthlyCalendar()}
      </div>

      {/* Selected Calendar Event Modal */}
      <AnimatePresence>
        {selectedCalEvent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}
            onClick={() => setSelectedCalEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              style={{ backgroundColor: 'white', width: '90%', maxWidth: '500px', borderRadius: '35px', padding: '40px', position: 'relative', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '1000', color: '#0B1E3F' }}>
                    {selectedCalEvent.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>Calendar Events</p>
                </div>
                <button onClick={() => setSelectedCalEvent(null)} style={{ background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                {selectedCalEvent.holidays.map((h, i) => (
                  <div key={`h-${i}`} style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '15px', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      🌴
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#991b1b' }}>{h.occasion || h.name || h.holiday_name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#dc2626', fontWeight: '800' }}>Official Public Holiday</p>
                    </div>
                  </div>
                ))}
                {selectedCalEvent.leaves.map((l, i) => {
                  const st = String(l.rm_status || l.status || '').toUpperCase();
                  const isApp = st === 'APPROVED';
                  const isRej = st === 'REJECTED';
                  const bg = isApp ? '#f0fdf4' : (isRej ? '#fef2f2' : '#fffbeb');
                  const border = isApp ? '#bbf7d0' : (isRej ? '#fecaca' : '#fef3c7');
                  const textColor = isApp ? '#16a34a' : (isRej ? '#dc2626' : '#d97706');
                  return (
                    <div key={`l-${i}`} onClick={() => { setSelectedCalEvent(null); setSelectedLeave(l); }} style={{ padding: '20px', borderRadius: '20px', backgroundColor: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '45px', height: '45px', borderRadius: '15px', backgroundColor: textColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900' }}>
                          {isApp ? '✓' : (isRej ? '✕' : '⏳')}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: textColor }}>{l.leave_type || 'Leave Request'}</h4>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: textColor, fontWeight: '800', opacity: 0.8 }}>{l.reason || l.remark || 'Time off'}</p>
                        </div>
                      </div>
                      <div style={{ padding: '6px 14px', borderRadius: '12px', backgroundColor: 'white', color: textColor, fontSize: '11px', fontWeight: '1000', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        {st}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: 'white', width: '95%', maxWidth: '600px', borderRadius: '40px', padding: '50px', position: 'relative', boxShadow: '0 30px 70px rgba(0,0,0,0.3)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Geometric Brand Elements */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', backgroundColor: '#3b82f6', clipPath: 'polygon(100% 0, 100% 100%, 0 0)', opacity: 0.1 }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100px', height: '100px', backgroundColor: '#1e3a8a', clipPath: 'polygon(0 0, 0 100%, 100% 100%)', opacity: 0.1 }}></div>

              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '1000', color: '#0B1E3F' }}>Apply for Leave</h2>
                  <X size={24} color="#94a3b8" onClick={() => setShowForm(false)} style={{ cursor: 'pointer' }} />
                </div>

                <form onSubmit={handleSubmitRequest}>


                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>Leave Type</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                        style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '14px', fontWeight: '700', appearance: 'none', backgroundColor: '#eff6ff', color: '#1e40af' }}
                      >
                        <option>Earned Leaves</option>
                        <option>Casual Leave</option>
                        <option>LOP</option>
                      </select>
                      <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <ArrowLeft size={16} color="#1e40af" style={{ transform: 'rotate(-90deg)' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>From date</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="date" value={formData.start_date || ''}
                          onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                          style={{ width: '100%', padding: '12px 15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }} required
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>To date</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="date" value={formData.end_date || ''}
                          onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                          style={{ width: '100%', padding: '12px 15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }} required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Half Day Selection */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.isHalfDay}
                        onChange={e => setFormData({ ...formData, isHalfDay: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '1000', color: '#0B1E3F', textTransform: 'uppercase' }}>Half Day Request</span>
                    </label>
                  </div>

                  {formData.isHalfDay && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      style={{ marginBottom: '20px' }}
                    >
                      <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>Half Day Slot</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={formData.halfDaySlot}
                          onChange={e => setFormData({ ...formData, halfDaySlot: e.target.value })}
                          style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '14px', fontWeight: '700', appearance: 'none', backgroundColor: '#fff', color: '#0B1E3F' }}
                          required={formData.isHalfDay}
                        >
                          <option value="">Select Slot</option>
                          <option value="First Half (9:30 - 2:30)">First Half (9:30 - 2:30)</option>
                          <option value="Second Half (1:30 - 6:00 pm)">Second Half (1:30 - 6:00 pm)</option>
                        </select>
                        <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <ArrowLeft size={16} color="#0B1E3F" style={{ transform: 'rotate(-90deg)' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', marginBottom: '8px', display: 'block' }}>Reason for leave</label>
                    <textarea
                      value={formData.reason}
                      onChange={e => setFormData({ ...formData, reason: e.target.value })}
                      style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '14px', fontWeight: '700', height: '100px', resize: 'none', boxSizing: 'border-box' }}
                      placeholder="Please provide a brief reason..." required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '18px', borderRadius: '18px', border: '1.5px solid #f1f5f9', background: 'white', fontWeight: '900', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '18px', borderRadius: '18px', border: 'none', background: isSubmitting ? '#94a3b8' : '#0B1E3F', color: 'white', fontWeight: '900', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 10px 30px rgba(11, 30, 63, 0.2)' }}>
                      {isSubmitting ? 'Submitting...' : 'Submit official request'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Modal (Popup) */}
      <AnimatePresence>
        {modalConfig.show && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}
            onClick={() => setModalConfig({ ...modalConfig, show: false })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              style={{ backgroundColor: 'white', width: '90%', maxWidth: '400px', borderRadius: '30px', padding: '40px', textAlign: 'center', position: 'relative', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: modalConfig.type === 'success' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
                {modalConfig.type === 'success' ? <CheckCircle size={30} color="#22c55e" /> : <Info size={30} color="#ef4444" />}
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '1000', color: '#0B1E3F' }}>{modalConfig.type === 'success' ? 'Submitted!' : 'Attention Needed'}</h3>
              <p style={{ margin: 0, fontSize: '15px', color: '#64748b', fontWeight: '800', lineHeight: '1.6' }}>{modalConfig.message}</p>
              <button
                onClick={() => setModalConfig({ ...modalConfig, show: false })}
                style={{ marginTop: '30px', width: '100%', padding: '16px', borderRadius: '15px', border: 'none', background: '#0B1E3F', color: 'white', fontWeight: '900', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Leave Preview Modal (Pattern from Image 2) */}
      <AnimatePresence>
        {selectedLeave && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 30, 63, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
            onClick={() => setSelectedLeave(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 30, opacity: 0 }}
              style={{ backgroundColor: 'white', width: '95%', maxWidth: '750px', borderRadius: '40px', padding: '50px', position: 'relative', boxShadow: '0 30px 70px rgba(0,0,0,0.3)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Geometric Brand Elements */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', backgroundColor: '#3b82f6', clipPath: 'polygon(100% 0, 100% 100%, 0 0)', opacity: 0.1 }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '150px', height: '150px', backgroundColor: '#1e3a8a', clipPath: 'polygon(0 0, 0 100%, 100% 100%)', opacity: 0.1 }}></div>

              <button
                onClick={() => setSelectedLeave(null)}
                style={{ position: 'absolute', right: '30px', top: '30px', background: '#f8fafc', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', zIndex: 20 }}
              >
                <X size={20} />
              </button>

              {/* Header: User Info & Request Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '45px' }}>
                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '25px', backgroundColor: '#0B1E3F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '28px', fontWeight: '1000', boxShadow: '0 12px 25px rgba(11,30,63,0.2)' }}>
                    {(selectedLeave.user_name || selectedLeave.name || user?.name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '1000', color: '#0B1E3F', letterSpacing: '-0.3px' }}>{selectedLeave.user_name || selectedLeave.name || user?.name}</h2>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', fontWeight: '800' }}>Subordinate member</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: '1000', color: '#94a3b8', letterSpacing: '0.5px' }}>Request status</p>
                  <div style={{ padding: '10px 22px', borderRadius: '12px', background: String(selectedLeave.rm_status || selectedLeave.status || '').toUpperCase() === 'APPROVED' ? '#eff6ff' : '#fffbeb', color: String(selectedLeave.rm_status || selectedLeave.status || '').toUpperCase() === 'APPROVED' ? '#2563eb' : '#d97706', fontSize: '11px', fontWeight: '1000', display: 'inline-block' }}>
                    {String(selectedLeave.rm_status && selectedLeave.rm_status !== 'Pending' ? selectedLeave.rm_status : (selectedLeave.status || 'Pending'))}
                  </div>
                </div>
              </div>

              {/* Grid: Leave Details & Official Verification */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '40px' }}>
                {/* Left Card: Leave Details */}
                <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '25px', border: '1px solid #f1f5f9' }}>
                  <p style={{ margin: '0 0 20px 0', fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>Leave details</p>
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{selectedLeave.leave_type}</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>Category</p>
                  </div>
                  <div style={{ display: 'flex', gap: '40px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>{String(selectedLeave.applied_on || selectedLeave.created_at || '---').split('T')[0]}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>Applied on</p>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '1000', color: '#0B1E3F' }}>
                        {selectedLeave.is_half_day === true || String(selectedLeave.is_half_day) === 'true' || Number(selectedLeave.no_of_days) === 0.5 || selectedLeave.half_day_slot 
                          ? `0.5 Day` 
                          : `${selectedLeave.no_of_days || calculateDays(selectedLeave.start_date, selectedLeave.end_date)} Days`}
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>Total duration</p>
                    </div>
                  </div>
                </div>

                {/* Right Card: Verification */}
                <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '25px', border: '1px solid #f1f5f9' }}>
                  <p style={{ margin: '0 0 20px 0', fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' }}>Official verification</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>HR approval</span>
                      <div style={getStatusStyle(selectedLeave.hr_status)}>{selectedLeave.hr_status || 'Pending'}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>PM approval</span>
                      <div style={getStatusStyle(selectedLeave.pm_status)}>{selectedLeave.pm_status || 'Pending'}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>TL approval</span>
                      <div style={getStatusStyle(selectedLeave.rm_status)}>{selectedLeave.rm_status || 'Pending'}</div>
                    </div>
                  </div>
                </div>
              </div>



              {/* Bottom Section: Reason */}
              <div>
                <p style={{ margin: '0 0 15px 0', fontSize: '11px', fontWeight: '1000', color: '#64748b', letterSpacing: '0.5px' }}>Reason for leave</p>
                <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '25px', border: '1px solid #f1f5f9' }}>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b', lineHeight: '1.6' }}>
                    {selectedLeave.reason || selectedLeave.remark || 'No specific reason provided.'}
                  </p>
                </div>
              </div>

              {/* Review Actions for Team Leader */}
              {isLeader && selectedLeave.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
                  <button
                    onClick={() => { handleAction(selectedLeave.id, 'Approved'); setSelectedLeave(null); }}
                    style={{ flex: 1, padding: '18px', borderRadius: '15px', border: 'none', background: '#22c55e', color: 'white', fontWeight: '1000', cursor: 'pointer', boxShadow: '0 8px 20px rgba(34,197,94,0.2)' }}
                  >
                    Approve request
                  </button>
                  <button
                    onClick={() => { handleAction(selectedLeave.id, 'Rejected'); setSelectedLeave(null); }}
                    style={{ flex: 1, padding: '18px', borderRadius: '15px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '1000', cursor: 'pointer', boxShadow: '0 8px 20px rgba(239,68,68,0.2)' }}
                  >
                    Reject request
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaveScreen;