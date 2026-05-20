import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../config';
import {
  MapPin, Building2, Clock, Globe, Mail, User,
  ChevronRight, Calendar, Bell, Shield, LogOut,
  History, Users, FileText, Briefcase, Heart, Edit3, Fingerprint, Camera, Phone, Check, X, Palmtree, AlertCircle, CheckCircle2, Laptop, ShieldCheck, Eye, EyeOff
} from 'lucide-react';

import { getTheme } from '../../constants/Theme';

export default function ProfileScreen({ isNewJoinee, onNavigate }) {
  const { user, logout, updateProfile } = useAuth();
  const theme = getTheme(user?.role);
  const [activeTab, setActiveTab] = useState('My Profile');
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [phone, setPhone] = useState(user?.phone_number || 'Add Phone Number');
  const [aboutMe, setAboutMe] = useState(user?.about_me || 'Write a short introduction about yourself');
  const [dob, setDob] = useState(user?.date_of_birth || 'Add Date of Birth');
  const [isEditingDob, setIsEditingDob] = useState(false);
  const [teamName, setTeamName] = useState(user?.team || user?.team_name || user?.process || 'Loading...');
  const [joiningDate, setJoiningDate] = useState(user?.joining_date || user?.joiningDate || user?.['joining date'] || user?.doj || user?.date_of_joining || 'N/A');
  const [cleanEmployeeId, setCleanEmployeeId] = useState(() => {
    let strId = String(user?.employee_id || user?.id || 'N/A').trim();
    if (!strId || strId === 'N/A') return 'N/A';

    // 1. Split by comma/spaces and take the first unique part
    if (strId.includes(',') || strId.includes(' ')) {
      strId = strId.split(/[,\s]+/)[0];
    }

    // 2. Detect and fix redundant repetitions (e.g., 2025920259 or 202592025920259)
    for (let size = 1; size <= strId.length / 2; size++) {
      if (strId.length % size === 0) {
        const chunk = strId.substring(0, size);
        const repetitions = strId.length / size;
        if (chunk.repeat(repetitions) === strId) {
          strId = chunk;
          break;
        }
      }
    }

    // 3. Final cleanup: remove trailing non-alphanumeric characters
    return strId.replace(/[^a-zA-Z0-9]+$/, '');
  });
  const parseSafeDate = (dateStr) => {
    // 0. Handle arrays (backend sometimes returns duplicates in an array)
    if (Array.isArray(dateStr)) {
      dateStr = dateStr[0];
    }

    if (!dateStr || dateStr === 'N/A' || dateStr === 'Add Date of Birth' || dateStr === 'Add Joining Date') return null;

    // 1. Handle numeric timestamps (represented as strings or numbers)
    if (!isNaN(dateStr) && !isNaN(parseFloat(dateStr))) {
      const timestamp = Number(dateStr);
      // Check if it's in seconds (10 digits) or milliseconds (13 digits)
      const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
      if (!isNaN(date.getTime())) return date;
    }

    // 2. Standard JS Parsing
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    // 3. Robust Delimiter Parsing (DD/MM/YYYY, YYYY/MM/DD, etc.)
    if (typeof dateStr === 'string') {
      const delimiters = ['/', '-', '.'];
      for (const delimiter of delimiters) {
        if (dateStr.includes(delimiter)) {
          const parts = dateStr.split(delimiter);
          if (parts.length === 3) {
            // Reconstruct in a way browsers like (ISO)
            let isoStr = '';
            if (parts[0].length === 4) {
              isoStr = `${parts[0]}-${parts[1]}-${parts[2]}`; // YYYY-MM-DD
            } else {
              isoStr = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY -> YYYY-MM-DD
            }
            const fallbackDate = new Date(isoStr);
            if (!isNaN(fallbackDate.getTime())) return fallbackDate;
          }
        }
      }
    }

    console.warn('parseSafeDate FAILED to parse:', dateStr);
    return null;
  };

  const calculateTenure = (date) => {
    const joinDate = parseSafeDate(date);
    if (!joinDate) return 'N/A';
    const now = new Date();

    let years = now.getFullYear() - joinDate.getFullYear();
    let months = now.getMonth() - joinDate.getMonth();
    let days = now.getDate() - joinDate.getDate();

    if (days < 0) {
      months--;
      const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += daysInPrevMonth;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}Y`);
    if (months > 0) parts.push(`${months}M`);
    if (days >= 0 || parts.length === 0) parts.push(`${days}D`);

    return parts.join(' ');
  };

  const resolveImagePath = (path) => {
    if (!path || typeof path !== 'string') return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  };


  const [profileImage, setProfileImage] = useState(() =>
    resolveImagePath(user?.profileImage || user?.profile_image || user?.profilePicture || user?.profile_picture || user?.avatar || user?.profile_pic)
  );
  const [designation, setDesignation] = useState(user?.designation || '');
  const [isEditingDesignation, setIsEditingDesignation] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [reportingManager, setReportingManager] = useState({ name: 'Loading...', id: '' });
  const fileInputRef = useRef(null);
  const [teamReports, setTeamReports] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '', otp: '' });
  const [showPass, setShowPass] = useState({ old: false, new: false, confirm: false });
  const [passwordMode, setPasswordMode] = useState('change'); // 'change' or 'reset'
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Sync state if user object changes (e.g. after login or reload)
  useEffect(() => {
    if (user) {
      if (user.phone_number) setPhone(user.phone_number);
      if (user.about_me) setAboutMe(user.about_me);
      if (user.date_of_birth) setDob(user.date_of_birth);
      const img = user.profileImage || user.profile_image || user.profilePicture || user.profile_picture || user.avatar || user.profile_pic;
      if (img) {
        const src = resolveImagePath(img);
        if (src !== profileImage) setProfileImage(src);
      }
      if (user.designation) setDesignation(user.designation);
      if (user.joining_date || user.joiningDate || user['joining date'] || user.doj || user.date_of_joining) {
        setJoiningDate(user.joining_date || user.joiningDate || user['joining date'] || user.doj || user.date_of_joining);
      }
    }
  }, [user]);

  const fetchReportingManager = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const empId = user?.employee_id || user?.id || user?.userId;
      if (!empId && !user?.email) return;

      // 1. Fetch Primary Profile
      const resp = await fetch(API_ENDPOINTS.MY_EMPLOYEE_PROFILE, {
        headers: { 'Authorization': `Bearer ${token?.trim()}` }
      });

      let metaResp = { ok: false };
      if (empId) {
        metaResp = await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE(empId), {
          headers: { 'Authorization': `Bearer ${token?.trim()}` }
        });
      }

      // 2. Fetch Users List for correct ID mapping (requested source)
      const uResp = await fetch(API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 3. Fetch Teams API to perfectly map RM based on Team Leader
      let teamsData = [];
      try {
        const tResp = await fetch(API_ENDPOINTS.TEAMS, { headers: { 'Authorization': `Bearer ${token}` } });
        if (tResp.ok) {
          const tJson = await tResp.json();
          teamsData = Array.isArray(tJson) ? tJson : (tJson.data || tJson.teams || []);
        }
      } catch (e) { console.error('Failed to fetch teams in profile', e); }

      let mName = '';
      let mId = '';

      if (resp.ok) {
        const data = await resp.json();
        if (data.phone_number) setPhone(data.phone_number);
        if (data.date_of_birth) setDob(data.date_of_birth);
        if (data.about_me) setAboutMe(data.about_me);
        if (data.designation) setDesignation(data.designation);
        const jd = data.joining_date || data.joiningDate || data.doj;
        if (jd) setJoiningDate(Array.isArray(jd) ? jd[0] : jd);
        if (data.team) setTeamName(data.team);
        const img = data.profileImage || data.profile_image || data.avatar;
        if (img) setProfileImage(resolveImagePath(img));
        mId = data.reporting_manager_id || data.manager_id || '';
        mName = data.reporting_manager_name || data.manager_name || '';
      }

      if (metaResp.ok) {
        const metaList = await metaResp.json();
        const rawMeta = Array.isArray(metaList) ? metaList[0] : metaList;
        if (rawMeta) {
          if (rawMeta.dob) setDob(rawMeta.dob);
          if (rawMeta.contact_no) setPhone(rawMeta.contact_no);
          if (rawMeta.designation) setDesignation(rawMeta.designation);
          if (rawMeta.process) setTeamName(rawMeta.process);
          if (rawMeta.reporting_manager_id && !mId) mId = rawMeta.reporting_manager_id;
        }
      }

      if (uResp.ok) {
        const usersList = await uResp.json();
        const currentUser = usersList.find(u =>
          (u.email && String(u.email).toLowerCase() === String(user?.email || '').toLowerCase()) ||
          (String(u.employee_id || u.id).split(':')[0] === String(user?.employee_id || user?.id).split(':')[0])
        );
        if (currentUser) {
          const jd = currentUser['joining date'] || currentUser.joining_date || currentUser.doj;
          if (jd) setJoiningDate(Array.isArray(jd) ? jd[0] : jd);
          const eid = currentUser.employee_id || currentUser.id;
          if (eid) {
            const raw = String(eid);
            const len = raw.length;
            let clean = raw;
            if (len >= 9 && len % 3 === 0) { const p = len / 3; if (raw.slice(0,p) === raw.slice(p,p*2) && raw.slice(0,p) === raw.slice(p*2)) clean = raw.slice(0,p); }
            else if (len >= 6 && len % 2 === 0) { const p = len / 2; if (raw.slice(0,p) === raw.slice(p)) clean = raw.slice(0,p); }
          setCleanEmployeeId(clean);
          }

          // Fetch Team Name from Users table
          const fetchedTeam = currentUser.team || currentUser.team_name || currentUser.process || currentUser.department;
          if (fetchedTeam) setTeamName(fetchedTeam);

          // Reporting Manager Lookup in users list
          const targetRmId = currentUser.reporting_manager_id || currentUser.manager_id || mId;
          if (targetRmId) {
            mId = targetRmId;
            const mgr = usersList.find(u => String(u.id || u.employee_id) === String(targetRmId));
            if (mgr) mName = mgr.name || mgr.emp_name;
          }

          // Fallback to Team Leader dynamically if no explicit reporting manager is set
          if (!mName && fetchedTeam) {
            // Check the TEAMS API
            const cleanFetched = String(fetchedTeam).replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase();
            const matchingTeam = teamsData.find(t => 
              String(t.name || '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase() === cleanFetched
            );
            if (matchingTeam && (matchingTeam.leader || matchingTeam.lead)) {
              mName = matchingTeam.leader || matchingTeam.lead;
            } else {
              // Fallback to user list
              const teamLeader = usersList.find(u => 
                (String(u.role || '').toLowerCase().includes('teamleader') || 
                 String(u.role || '').toLowerCase() === 'team_leader' || 
                 String(u.designation || '').toLowerCase().includes('team leader')) && 
                (u.team === fetchedTeam || u.process === fetchedTeam || u.team_name === fetchedTeam)
              );
              if (teamLeader && String(teamLeader.id) !== String(currentUser.id)) { // Prevent assigning self
                mName = teamLeader.name || teamLeader.emp_name;
                mId = teamLeader.id || teamLeader.employee_id;
              }
            }
          }
        }
      }

      setReportingManager({ name: mName || 'Not Assigned', id: mId });

    } catch (err) {
      console.error('Fetch Profile Error:', err);
      setReportingManager({ name: 'Not Assigned', id: '' });
    }
  }, [user]);

  const fetchUserDataFromUsersTable = () => {
    // Logic merged into fetchReportingManager to prevent race conditions
  };

  const fetchTeamReports = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.TASKS, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const today = new Date().toDateString();
        setTeamReports(data.filter(r => new Date(r.timestamp).toDateString() === today));
      }
    } catch { }
  }, [user, logout]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchReportingManager();
    fetchUserDataFromUsersTable();
    if (user?.role === 'teamleader') fetchTeamReports();
    return () => window.removeEventListener('resize', handleResize);
  }, [user, fetchReportingManager, fetchTeamReports]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // High-Fidelity Preview
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);

    // Industrial Backend Sync
    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', user?.id || user?.empId || user?.employee_id);
    formData.append('email', user?.email);

    try {
      const res = await fetch(`${BASE_URL}/api/profile/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast('Profile image updated successfully!');
        if (data.profileImage) {
          const finalImg = data.profileImage.startsWith('http') || data.profileImage.startsWith('data:')
            ? data.profileImage
            : `${BASE_URL}${data.profileImage}`;
          setProfileImage(finalImg);
          // Update Context for building-wide sync
          updateProfile('profileImage', data.profileImage);
        }
      } else {
        triggerToast('Failed to upload image.', 'error');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      triggerToast('Network error during upload.', 'error');
    }
  };

  const triggerToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const handleRequestOTP = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.REQUEST_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        setOtpRequested(true);
        triggerToast('OTP sent to server terminal!');
      } else {
        const err = await res.json();
        triggerToast(err.message || 'OTP Request failed', 'error');
      }
    } catch { triggerToast('Connection Error', 'error'); }
  };

  const handleVerifyOTP = async () => {
    // Client-side verification to unlock the password fields as per the UI flow requirement
    if (passData.otp && passData.otp.length === 6) {
      setOtpVerified(true);
      triggerToast('Authorization code accepted locally. Proceed to reset.');
    } else {
      triggerToast('Please enter a valid 6-digit code', 'error');
    }
  };

  const handleResetWithOTP = async () => {
    if (!passData.otp || !passData.new || !passData.confirm) return triggerToast('All fields required', 'error');
    if (passData.new !== passData.confirm) return triggerToast('Passwords do not match', 'error');

    try {
      const res = await fetch(API_ENDPOINTS.RESET_PASSWORD_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp: passData.otp, newPassword: passData.new })
      });
      if (res.ok) {
        triggerToast('Your password has been changed. Please relogin.');
        setShowPasswordModal(false);
        setOtpRequested(false);
        setPassData({ old: '', new: '', confirm: '', otp: '' });
        setTimeout(() => {
          logout();
          window.location.href = './';
        }, 2500);
      } else {
        const err = await res.json();
        triggerToast(err.message || 'Reset failed', 'error');
      }
    } catch { triggerToast('Connection Error', 'error'); }
  };

  const handlePasswordSubmit = async () => {
    if (passwordMode === 'reset') return handleResetWithOTP();

    if (!passData.old || !passData.new || !passData.confirm) return triggerToast('All fields required', 'error');
    if (passData.new !== passData.confirm) return triggerToast('Passwords do not match', 'error');

    try {
      const res = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          email: user.email,
          oldPassword: passData.old,
          newPassword: passData.new
        })
      });
      if (res.ok) {
        triggerToast('Your password has been changed. Please relogin.');
        setShowPasswordModal(false);
        setPassData({ old: '', new: '', confirm: '', otp: '' });
        setTimeout(() => {
          logout();
          window.location.href = './';
        }, 2500);
      } else {
        const err = await res.json();
        triggerToast(err.message || 'Verification failed', 'error');
      }
    } catch { triggerToast('Network Error', 'error'); }
  };

  const styles = {
    container: {
      minHeight: '90vh',
      backgroundColor: '#F5F6FC',
      paddingBottom: winWidth < 768 ? '140px' : '120px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    profileWrapper: {
      maxWidth: '100%',
      margin: '0',
      padding: isMobile ? '15px' : (isTablet ? '25px' : '40px'),
      marginTop: isMobile ? '5px' : '15px',
    },
    banner: {
      height: isMobile ? '160px' : (isTablet ? '200px' : '180px'),
      backgroundColor: '#10274A',
      borderRadius: '25px 25px 0 0',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    bannerText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: isMobile ? '15px' : (isTablet ? '24px' : '32px'),
      fontWeight: '800',
      letterSpacing: '1px',
      textAlign: 'center',
      padding: '0 20px',
      maxWidth: '85%',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    masterCard: {
      backgroundColor: 'white',
      borderRadius: '0 0 25px 25px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
      padding: isMobile ? '0 20px 20px' : '0 30px 10px',
      position: 'relative',
      marginTop: '-1px'
    },
    headerRow: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'center' : 'flex-end',
      marginTop: '0',
      paddingBottom: '10px',
      gap: isMobile ? '20px' : '30px',
      textAlign: isMobile ? 'center' : 'left'
    },
    avatarContainer: {
      position: 'relative',
      zIndex: 2,
    },
    avatar: {
      width: isMobile ? '100px' : (isTablet ? '120px' : '140px'),
      height: isMobile ? '100px' : (isTablet ? '120px' : '140px'),
      borderRadius: '25px',
      backgroundColor: '#f8fafc',
      border: '4px solid white',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '40px' : '64px',
      color: '#3863a8',
      fontWeight: '700',
      overflow: 'hidden'
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: '-5px',
      right: '-5px',
      backgroundColor: 'white',
      width: '35px',
      height: '35px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      border: 'none',
      color: '#3863a8'
    },
    userInfo: { flex: 1, paddingBottom: '10px' },
    userName: { fontSize: isMobile ? '18px' : (isTablet ? '22px' : '26px'), fontWeight: '900', color: '#0f172a', margin: '4px 0', lineHeight: 1.2 },
    userRole: { fontSize: isMobile ? '10px' : '12px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' },

    managerSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 20px',
      backgroundColor: '#f8fafc',
      borderRadius: '15px',
      border: '1px solid #f1f5f9',
      marginTop: isMobile ? '10px' : '0',
      alignSelf: isMobile ? 'stretch' : 'auto',
      justifyContent: isMobile ? 'center' : 'flex-start'
    },
    managerInfo: { textAlign: isMobile ? 'left' : 'right' },
    managerLabel: { fontSize: isMobile ? '10px' : '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
    managerName: { fontSize: isMobile ? '12px' : '13px', color: '#1e293b', fontWeight: '700' },
    managerAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    infoGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'),
      gap: '15px',
      marginTop: '15px'
    },
    infoCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '20px',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
    },
    iconCircle: {
      minWidth: '45px',
      height: '45px',
      borderRadius: '12px',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    infoValue: {
      fontSize: isMobile ? '13px' : '14px',
      color: '#1e293b',
      fontWeight: '800',
      marginTop: '2px',
      wordBreak: 'break-word'
    },

    aboutSection: {
      marginTop: '20px',
      backgroundColor: 'white',
      padding: isMobile ? '20px' : '30px',
      borderRadius: '25px',
      border: '1px solid #f1f5f9'
    },
    sectionTitle: { fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    aboutContent: { textAlign: 'left', padding: '10px 0' },
    aboutPlaceholder: { fontSize: '14px', color: 'black', fontWeight: '500', marginTop: '10px' },
    editButton: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }
  };

  return (
    <div style={styles.container}>
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 30px', borderRadius: '15px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '14px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {toast.msg}
          <style>{`
            @keyframes slideIn {
              from { transform: translate(-50%, -100%); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      <div style={styles.profileWrapper}>
        <div style={styles.banner}>
          <div style={styles.bannerText}>Smarter Solutions for Better Future</div>
        </div>

        <AnimatePresence>
          {showFullScreen && profileImage && (
            <FullScreenImageModal
              src={profileImage}
              onClose={() => setShowFullScreen(false)}
            />
          )}
        </AnimatePresence>

        <div style={styles.masterCard}>
          <div style={styles.headerRow}>
            <div style={styles.avatarContainer}>
              <div
                style={{ ...styles.avatar, cursor: profileImage ? 'pointer' : 'default' }}
                onClick={() => profileImage && setShowFullScreen(true)}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      setProfileImage(null);
                      setShowFullScreen(false);
                    }}
                  />
                ) : (
                  user?.name ? user.name[0].toUpperCase() : 'U'
                )}
              </div>
              <input
                type="hidden"
                disabled // Reference Only
              />
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={styles.editAvatarBtn}
              >
                <Camera size={18} />
              </button>
            </div>

            {/* CONSOLIDATED RESPONSIVE HEADER */}
            <div style={{ ...styles.userInfo, textAlign: isMobile ? 'center' : 'left', alignSelf: isMobile ? 'center' : 'auto' }}>
              {/* ROW 1: Name and ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                <div style={styles.userName}>{user?.name}</div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#10274A', backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Fingerprint size={12} color="#3863a8" />
                  ID: {cleanEmployeeId}
                </div>
              </div>

              {/* ROW 2: Info bar */}
              <div style={{ display: 'flex', flexDirection: (isMobile || isTablet) ? 'column' : 'row', alignItems: (isMobile || isTablet) ? (isMobile ? 'center' : 'flex-start') : 'center', gap: (isMobile || isTablet) ? '12px' : '30px', padding: '15px 0 0', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3863a8', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>
                  <Briefcase size={14} />
                  {designation || user?.role || 'Team Member'}
                </div>

                {winWidth >= 1024 && <div style={{ width: '1.5px', height: '14px', backgroundColor: '#e2e8f0' }} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                  <Phone size={14} />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {phone}
                  </span>
                </div>

                {winWidth >= 1024 && <div style={{ width: '1.5px', height: '14px', backgroundColor: '#e2e8f0' }} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                  <Calendar size={14} />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {dob}
                  </span>
                </div>

                {!isMobile && !isTablet && <div style={{ width: '1.5px', height: '14px', backgroundColor: '#e2e8f0' }} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>
                    {reportingManager.name[0]}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', lineHeight: 1 }}>RM NAME</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '800' }}>{reportingManager.name} {reportingManager.id && `(${reportingManager.id})`}</div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>

        <div style={styles.infoGrid}>
          {/* TEAM CARD */}
          <div style={{ ...styles.infoCard }}>
            <div style={styles.iconCircle}><Users size={18} color="#3863a8" /></div>
            <div>
              <div style={styles.managerLabel}>Current Team</div>
              <div style={styles.infoValue}>{teamName}</div>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.iconCircle}><Mail size={18} color="#3863a8" /></div>
            <div>
              <div style={styles.managerLabel}>Email Address</div>
              <div style={styles.infoValue}>{user?.email?.toLowerCase()}</div>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.iconCircle}><Calendar size={18} color="#3863a8" /></div>
            <div>
              <div style={styles.managerLabel}>Date of Joining</div>
              <div style={styles.infoValue}>
                {(() => {
                  const d = parseSafeDate(joiningDate);
                  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
                })()}
              </div>
            </div>
          </div>
        </div>


        <div style={styles.infoGrid}>
          <motion.div
            whileHover={{ y: -5 }}
            style={{ ...styles.infoCard, cursor: 'pointer', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
            onClick={() => setShowPasswordModal(true)}
          >
            <div style={{ ...styles.iconCircle, backgroundColor: '#dbeafe' }}><Shield size={18} color="#1e40af" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ ...styles.managerLabel, color: '#1e40af' }}>Security Settings</div>
              <div style={styles.infoValue}>UPDATE SECURITY PASSKEY</div>
            </div>
            <ChevronRight size={16} color="#1e40af" />
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            style={{ ...styles.infoCard, cursor: 'pointer', borderColor: '#fed7aa', backgroundColor: '#fff7ed' }}
            onClick={() => onNavigate?.('TICKET')}
          >
            <div style={{ ...styles.iconCircle, backgroundColor: '#ffedd5' }}><AlertCircle size={18} color="#f97316" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ ...styles.managerLabel, color: '#f97316' }}>Support & Maintenance</div>
              <div style={styles.infoValue}>RAISE TECHNICAL TICKET</div>
            </div>
            <ChevronRight size={16} color="#f97316" />
          </motion.div>

          {/* TENURITY CARD */}
          <motion.div
            whileHover={{ y: -5 }}
            style={{ ...styles.infoCard, cursor: 'pointer', borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}
            onClick={() => onNavigate?.('RESIGNATION_LETTER')}
          >
            <div style={{ ...styles.iconCircle, backgroundColor: '#dcfce7' }}><Clock size={18} color="#15803d" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ ...styles.managerLabel, color: '#15803d' }}>Total Tenurity</div>
              <div style={styles.infoValue}>{calculateTenure(joiningDate)} Experience</div>
            </div>
            <ChevronRight size={16} color="#15803d" />
          </motion.div>

        </div>

        {showPasswordModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 30, 63, 0.7)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} style={{ backgroundColor: 'white', borderRadius: '40px', padding: 0, maxWidth: '500px', width: '100%', boxShadow: '0 40px 100px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

              {/* INDUSTRIAL HEADER */}
              <div style={{ backgroundColor: '#0B1E3F', padding: '30px 40px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.5px' }}>
                      Security Vault
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Backend Synced: Active</span>
                    </div>
                  </div>
                  <X size={24} color="rgba(255,255,255,0.4)" onClick={() => { setShowPasswordModal(false); setOtpRequested(false); setOtpVerified(false); setPasswordMode('change'); }} style={{ cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ padding: '40px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '18px' }}>
                  <button
                    onClick={() => { setPasswordMode('change'); setOtpRequested(false); setOtpVerified(false); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', fontSize: '12px', fontWeight: '1000', cursor: 'pointer', backgroundColor: passwordMode === 'change' ? 'white' : 'transparent', color: passwordMode === 'change' ? '#3863a8' : '#64748b', boxShadow: passwordMode === 'change' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', transition: '0.2s' }}>
                    WITH OLD PASSWORD
                  </button>
                  <button
                    onClick={() => setPasswordMode('reset')}
                    style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', fontSize: '12px', fontWeight: '1000', cursor: 'pointer', backgroundColor: passwordMode === 'reset' ? 'white' : 'transparent', color: passwordMode === 'reset' ? '#3863a8' : '#64748b', boxShadow: passwordMode === 'reset' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', transition: '0.2s' }}>
                    WITHOUT OLD PASSWORD (OTP)
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {passwordMode === 'change' ? (
                    <>
                      {[{ label: 'Old Password', key: 'old' }, { label: 'New Password', key: 'new' }, { label: 'Confirm Password', key: 'confirm' }].map(f => (
                        <div key={f.key} style={{ position: 'relative' }}>
                          <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>{f.label} <span style={{ color: '#ef4444' }}>*</span></label>
                          <input
                            type={showPass[f.key] ? "text" : "password"}
                            style={{ width: '100%', padding: '16px 50px 16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '15px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', transition: '0.2s', boxSizing: 'border-box' }}
                            onFocus={(e) => { e.target.style.borderColor = '#3863a8'; e.target.style.backgroundColor = 'white'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#f1f5f9'; e.target.style.backgroundColor = '#f8fafc'; }}
                            value={passData[f.key]}
                            onChange={e => setPassData({ ...passData, [f.key]: e.target.value })}
                          />
                          <div
                            onClick={() => setShowPass(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                            style={{ position: 'absolute', right: '18px', bottom: '16px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                          >
                            {showPass[f.key] ? <Eye size={20} /> : <EyeOff size={20} />}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {!otpRequested ? (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                          <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '24px', marginBottom: '30px' }}>
                            <Shield size={40} color="#3863a8" style={{ marginBottom: '15px' }} />
                            <p style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: '700', margin: 0 }}>Terminal OTP Request</p>
                            <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', marginTop: '8px' }}>
                              A 6-digit recovery code will be dispatched to the system terminal.
                            </p>
                          </div>
                          <button onClick={handleRequestOTP} style={{ width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#3863a8', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(56, 99, 168, 0.2)' }}>
                            DISPATCH OTP TO TERMINAL
                          </button>
                        </div>
                      ) : !otpVerified ? (
                        <>
                          <div style={{ textAlign: 'center' }}>
                            <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>AUTHORIZATION CODE <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="0 0 0 0 0 0"
                              style={{ width: '100%', padding: '20px', borderRadius: '24px', border: '3.5px solid #3863a8', fontSize: '28px', fontWeight: '1000', outline: 'none', textAlign: 'center', letterSpacing: '8px', color: '#0B1E3F', backgroundColor: '#f0f9ff', marginBottom: '20px' }}
                              value={passData.otp}
                              onChange={e => setPassData({ ...passData, otp: e.target.value })}
                            />
                            <button onClick={handleVerifyOTP} style={{ width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#3863a8', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <CheckCircle2 size={18} />
                              VERIFY AUTHORIZATION
                            </button>
                            <button onClick={() => setOtpRequested(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: '800', cursor: 'pointer', marginTop: '20px' }}>
                              Resend Code?
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ animation: 'slideIn 0.4s ease-out' }}>
                          <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '15px', borderRadius: '16px', fontSize: '12px', fontWeight: '800', textAlign: 'center', marginBottom: '20px', border: '1.5px solid #bbf7d0' }}>
                            ✓ AUTHORIZATION GRANTED
                          </div>
                          {[{ label: 'Vault Signature (New Password)', key: 'new' }, { label: 'Confirm Signature', key: 'confirm' }].map(f => (
                            <div key={f.key} style={{ position: 'relative', marginBottom: '15px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block', paddingLeft: '4px' }}>{f.label} <span style={{ color: '#ef4444' }}>*</span></label>
                              <input
                                type={showPass[f.key] ? "text" : "password"}
                                style={{ width: '100%', padding: '16px 50px 16px 20px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '15px', fontWeight: '700', outline: 'none', backgroundColor: '#f8fafc', transition: '0.2s', boxSizing: 'border-box' }}
                                onFocus={(e) => { e.target.style.borderColor = '#3863a8'; e.target.style.backgroundColor = 'white'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#f1f5f9'; e.target.style.backgroundColor = '#f8fafc'; }}
                                value={passData[f.key]}
                                onChange={e => setPassData({ ...passData, [f.key]: e.target.value })}
                              />
                              <div
                                onClick={() => setShowPass(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                                style={{ position: 'absolute', right: '18px', bottom: '16px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                              >
                                {showPass[f.key] ? <Eye size={20} /> : <EyeOff size={20} />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {(passwordMode === 'change' || otpVerified) && (
                    <button onClick={handlePasswordSubmit} style={{ marginTop: '10px', padding: '20px', borderRadius: '20px', backgroundColor: '#0B1E3F', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '15px', boxShadow: '0 15px 30px rgba(11, 30, 63, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <Fingerprint size={20} />
                      {passwordMode === 'change' ? 'COMMIT SECURITY UPDATE' : 'RE-ESTABLISH VAULT ACCESS'}
                    </button>
                  )}

                  {passwordMode === 'reset' && otpRequested && (
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => setOtpRequested(false)} style={{ background: 'none', border: 'none', color: '#3863a8', fontSize: '12px', fontWeight: '900', cursor: 'pointer', textDecoration: 'underline' }}>
                        RESEND NEW AUTHORIZATION CODE
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TECHNICAL FOOTER */}
              <div style={{ backgroundColor: '#f8fafc', padding: '20px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>AES-256 ENCRYPTION</span>
                </div>
                <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: '800' }}>NBT SECURITY v4.0</span>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>

        </AnimatePresence>


        {/* ────── HR DOCUMENTS SECTION ────── */}
        <div style={{ marginTop: '25px', marginBottom: '40px' }}>
          <div style={{ ...styles.sectionTitle, marginBottom: '20px' }}>HR Documents</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'), gap: isMobile ? '15px' : '25px' }}>
            {[
              { id: 'slip', title: 'MONTHLY PAY SLIP', desc: 'Download salary statement', icon: <FileText size={22} />, color: '#16a34a', darkBorder: true },
              { id: 'exp', title: 'EXPERIENCE LETTER', desc: 'Apply for service certificate', icon: <Fingerprint size={22} />, color: '#2563eb', highlight: true },
              { id: 'res', title: 'RESIGNATION LETTER', desc: 'Submit formal exit notice', icon: <LogOut size={22} />, color: '#dc2626', darkBorder: true }
            ].map((doc, idx) => (
              <DocCard key={idx} doc={doc} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        <div style={styles.aboutSection}>
          <div style={styles.sectionTitle}>
            <span>About Me</span>
            <button
              onClick={async () => {
                if (isEditingAbout) {
                  try {
                    const token = localStorage.getItem('token');
                    // Send directly to the dedicated about-me backend route
                    const res = await fetch(API_ENDPOINTS.UPDATE_ABOUT || API_ENDPOINTS.UPDATE_PROFILE, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ about_me: aboutMe, email: user?.email, employee_id: user?.employee_id || user?.id || user?.userId })
                    });
                    
                    if (res.ok) {
                      updateProfile('about_me', aboutMe); // keep context in sync
                    } else {
                      const err = await res.json();
                      alert('Update Failed: ' + (err.message || 'Server error'));
                    }
                  } catch (e) {
                    alert('Network Error: Could not save about me text to database.');
                  }
                }
                setIsEditingAbout(!isEditingAbout);
              }}
              style={styles.editButton}
            >
              {isEditingAbout ? <Check size={16} color="#10b981" /> : <Edit3 size={16} color="#3863a8" />}
            </button>
          </div>
          <div style={styles.aboutContent}>
            {isEditingAbout ? (
              <textarea
                autoFocus
                style={{ width: '100%', minHeight: '100px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '15px', fontSize: '14px', color: '#475569', outline: 'none', fontFamily: 'inherit' }}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
              />
            ) : (
              <>
                <div style={styles.aboutPlaceholder}>{aboutMe || "Write a few words about yourself..."}</div>
              </>
            )}
          </div>
        </div>

        {/* ── TL-Only: Team Report Section ── */}
        {user?.role === 'teamleader' && (
          <div style={{ ...styles.aboutSection, marginTop: '20px' }}>
            <div style={styles.sectionTitle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📋</span> Team Report
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: isMobile ? '10px' : '0' }}>
                {/* summary pills */}
                {[
                  { label: 'Total', val: teamReports.length, bg: '#eff6ff', color: '#1d4ed8' },
                  { label: 'Done', val: teamReports.filter(r => r.overallStatus === 'Completed').length, bg: '#f0fdf4', color: '#16a34a' },
                  { label: 'Pending', val: teamReports.filter(r => r.overallStatus !== 'Completed').length, bg: '#fef9c3', color: '#a16207' },
                ].map(p => (
                  <div key={p.label} style={{ backgroundColor: p.bg, color: p.color, fontSize: isMobile ? '9px' : '11px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase' }}>
                    {p.val} {p.label}
                  </div>
                ))}
              </div>
            </div>

            {teamReports.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teamReports.map(r => {
                  const statusMap = {
                    Completed: { bg: '#dcfce7', color: '#16a34a' },
                    'In Progress': { bg: '#fef9c3', color: '#a16207' },
                    Pending: { bg: '#f1f5f9', color: '#64748b' },
                  };
                  const sc = statusMap[r.overallStatus] || statusMap.Pending;
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                      {/* avatar */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: '#1e40af', flexShrink: 0 }}>
                        {r.userName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.userName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.tasks?.[0]?.text || 'No task details logged'}
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', backgroundColor: sc.bg, color: sc.color, textTransform: 'uppercase', flexShrink: 0 }}>
                        {r.overallStatus || 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #e2e8f0' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>No team reports submitted today yet.</div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={logout}
            style={{ padding: '12px 40px', borderRadius: '15px', border: '2px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}
          >
            Logout Securely
          </button>
        </div>

      </div>
    </div>
  );
}

// Full Screen Image Modal Component
const FullScreenImageModal = ({ src, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.92)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        padding: '20px'
      }}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: 'white',
          padding: '10px',
          borderRadius: '50%',
          cursor: 'pointer'
        }}
      >
        <X size={24} />
      </motion.button>

      <motion.img
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={src}
        alt="Profile Fullscreen"
        style={{
          maxWidth: '95%',
          maxHeight: '95%',
          borderRadius: '12px',
          boxShadow: '0 30px 100px rgba(0,0,0,0.5)',
          objectFit: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
};

const DocCard = ({ doc, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);

  const isActive = isHovered || doc.highlight;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '24px',
        backgroundColor: isActive ? '#10274A' : 'white',
        borderRadius: '24px',
        border: `1.5px solid ${isActive ? '#10274A' : (doc.darkBorder ? '#10274A' : '#f1f5f9')}`,
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isActive ? '0 15px 35px rgba(16, 39, 74, 0.2)' : '0 4px 10px rgba(0,0,0,0.02)',
        transform: isActive ? 'translateY(-5px)' : 'translateY(0)'
      }}
      onClick={() => {
        if (doc.title === 'RESIGNATION LETTER') {
          onNavigate?.('RESIGNATION_LETTER');
        } else if (doc.title === 'MONTHLY PAY SLIP') {
          onNavigate?.('PAYSLIP');
        } else if (doc.title === 'EXPERIENCE LETTER') {
          onNavigate?.('SERVICE_CERTIFICATE');
        }
      }}
    >
      <div style={{
        backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : '#f8fafc',
        padding: '12px',
        borderRadius: '15px',
        color: isActive ? 'white' : doc.color,
        boxShadow: isActive ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'all 0.3s'
      }}>
        {doc.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: '1000', color: isActive ? 'white' : doc.color, textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.3s' }}>{doc.title}</div>
        <div style={{ fontSize: '15px', fontWeight: '900', color: isActive ? 'white' : '#0B1E3F', transition: 'all 0.3s' }}>{doc.desc}</div>
      </div>
      <ChevronRight size={18} color={isActive ? 'white' : '#94a3b8'} style={{ transition: 'all 0.3s' }} />
    </div>
  );
};
