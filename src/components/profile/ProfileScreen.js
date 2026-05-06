import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';
import { API_ENDPOINTS } from '../../config';
import {
  MapPin, Building2, Clock, Globe, Mail, User,
  ChevronRight, Calendar, Bell, Shield, LogOut, AlertCircle,
  History, Users, FileText, Briefcase, Heart, Edit3, Fingerprint, Camera, Phone, Check, X, Plane, CreditCard, Award, Landmark
} from 'lucide-react';

import { getTheme } from '../../constants/Theme';

export default function ProfileScreen({ isNewJoinee, onNavigate }) {
  const { user, logout, updateProfile } = useAuth();
  const theme = getTheme(user?.role);
  const [activeTab, setActiveTab] = useState('My Profile');
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [phone, setPhone] = useState(user?.phone_number || 'Add Phone Number');
  const [aboutMe, setAboutMe] = useState(user?.about_me || 'Write a short introduction about yourself');
  const [dob, setDob] = useState(user?.date_of_birth || 'Add Date of Birth');
  const [isEditingDob, setIsEditingDob] = useState(false);
  const [joiningDate, setJoiningDate] = useState(user?.joining_date || user?.joiningDate || user?.['joining date'] || '2025-11-10');
  const [profileImage, setProfileImage] = useState(() => {
    const img = user?.profileImage || user?.profile_image || user?.profilePicture || user?.profile_picture || user?.avatar || user?.profile_pic;
    if (!img) return null;
    return img.startsWith('http') || img.startsWith('data:') ? img : `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
  });
  const [designation, setDesignation] = useState(user?.designation || '');
  const [isEditingDesignation, setIsEditingDesignation] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [reportingManager, setReportingManager] = useState({ name: 'Sahana NV', id: '' });
  const fileInputRef = useRef(null);
  const [teamReports, setTeamReports] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });

  // Sync state if user object changes (e.g. after login or reload)
  useEffect(() => {
    if (user) {
      if (user.phone_number) setPhone(user.phone_number);
      if (user.about_me) setAboutMe(user.about_me);
      if (user.date_of_birth) setDob(user.date_of_birth);
      const img = user.profileImage || user.profile_image || user.profilePicture || user.profile_picture || user.avatar || user.profile_pic;
      if (img) {
        const src = img.startsWith('http') || img.startsWith('data:') ? img : `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
        if (src !== profileImage) setProfileImage(src);
      }
      if (user.designation) setDesignation(user.designation);
      if (user.joining_date || user.joiningDate || user['joining date']) setJoiningDate(user.joining_date || user.joiningDate || user['joining date']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchReportingManager();
    if (user?.role === 'teamleader') fetchTeamReports();
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const sanitizeId = (id) => String(id || '').split(':')[0];

  const fetchReportingManager = async () => {
    try {
      const identifier = user?.email || user?.id || user?.empId || user?.employee_id;
      if (!identifier) return;

      const sid = identifier.includes('@') ? identifier : sanitizeId(identifier);
      const resp = await fetch(`${BASE_URL}/api/profile/${sid}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.phone_number) setPhone(data.phone_number);
        if (data.date_of_birth) setDob(data.date_of_birth);
        if (data.about_me) setAboutMe(data.about_me);
        if (data.designation) setDesignation(data.designation);
        const jd = data.joining_date || data.joiningDate || data['joining date'];
        if (jd) setJoiningDate(jd);

        const img = data.profileImage || data.profile_image || data.profilePicture || data.profile_picture;
        if (img) setProfileImage(img.startsWith('http') || img.startsWith('data:') ? img : `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`);

        setReportingManager({
          name: data.reportingManagerName || data.reporting_manager || 'Sahana NV',
          id: data.reporting_manager_id || data.reportingManagerId || ''
        });
      }
    } catch (err) {
      console.error('Fetch Profile Error:', err);
      setReportingManager(prev => ({ ...prev, name: 'Unavailable' }));
    }
  };

  const fetchTeamReports = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.TASKS);
      if (res.ok) {
        const data = await res.json();
        const today = new Date().toDateString();
        setTeamReports(data.filter(r => new Date(r.timestamp).toDateString() === today));
      }
    } catch { }
  };

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
          const finalImg = data.profileImage.startsWith('http') || data.profileImage.startsWith('data:') ? data.profileImage : `${BASE_URL}${data.profileImage.startsWith('/') ? '' : '/'}${data.profileImage}`;
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

  const handlePasswordSubmit = async () => {
    if (!passData.old || !passData.new || !passData.confirm) return triggerToast('All fields required', 'error');
    if (passData.new !== passData.confirm) return triggerToast('Passwords do not match', 'error');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Standardize payload for NBT Hub backend compatibility
      const payload = {
        email: user?.email,
        id: user?.id || user?.employee_id || user?.empId,
        password: passData.old,           // Common legacy key
        currentPassword: passData.old,    // Standard camelCase
        current_password: passData.old,   // Standard snake_case
        oldPassword: passData.old,        // Alternative
        newPassword: passData.new,        // Standard camelCase
        new_password: passData.new        // Standard snake_case
      };

      const res = await fetch(API_ENDPOINTS.UPDATE_PASSWORD, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': token ? `Bearer ${token.trim()}` : '' 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        triggerToast('Password updated successfully!');
        setShowPasswordModal(false);
        setPassData({ old: '', new: '', confirm: '' });
      } else {
        const errData = await res.json().catch(() => ({}));
        const errorMessage = errData.message || errData.error || errData.msg || 'Authentication failed';
        console.error('[Profile] Password update rejected:', errData);
        triggerToast(errorMessage, 'error');
      }
    } catch (err) { 
      console.error('[Profile] Network error during password update:', err);
      triggerToast('Server Connection Error', 'error'); 
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#F5F6FC',
      padding: window.innerWidth < 768 ? '20px 15px 120px' : '30px 40px 120px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    profileWrapper: {
      maxWidth: '100%',
      margin: '0 auto',
      padding: window.innerWidth < 768 ? '20px 15px 120px' : '30px 40px 120px',
    },
    banner: {
      height: winWidth < 768 ? '180px' : '160px',
      backgroundColor: '#10274A',
      borderRadius: '20px 20px 0 0',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    bannerText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: winWidth < 768 ? '14px' : '18px',
      fontWeight: '800',
      letterSpacing: '0.3px',
      textAlign: 'center',
      padding: '0 20px',
      maxWidth: '85%',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    masterCard: {
      backgroundColor: 'white',
      borderRadius: '0 0 25px 25px',
      boxShadow: '0 15px 35px rgba(0,0,0,0.06)',
      padding: winWidth < 768 ? '0 20px 20px' : '0 30px 10px',
      position: 'relative',
      marginTop: '-1px'
    },
    headerRow: {
      display: 'flex',
      flexDirection: winWidth < 768 ? 'column' : 'row',
      alignItems: winWidth < 768 ? 'center' : 'flex-end',
      marginTop: winWidth < 768 ? '-45px' : '-35px',
      paddingBottom: '15px',
      borderBottom: '1px solid #f1f5f9',
      gap: winWidth < 1024 ? '15px' : '30px',
      textAlign: winWidth < 768 ? 'center' : 'left',
      flexWrap: 'wrap'
    },
    avatarContainer: {
      position: 'relative',
      zIndex: 5,
      marginBottom: winWidth < 768 ? '10px' : '0'
    },
    avatar: {
      width: winWidth < 768 ? '110px' : '130px',
      height: winWidth < 768 ? '110px' : '130px',
      borderRadius: '25px',
      backgroundColor: '#f8fafc',
      border: winWidth < 768 ? '4px solid #ffffff' : '5px solid white',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: winWidth < 768 ? '40px' : '48px',
      color: '#3863a8',
      fontWeight: '700',
      overflow: 'hidden',
      position: 'relative'
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: '2px',
      right: '2px',
      backgroundColor: 'white',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      cursor: 'pointer',
      border: '2px solid #f1f5f9',
      color: '#3863a8',
      zIndex: 10
    },
    userInfo: { flex: 1, paddingBottom: '10px' },
    userName: { fontSize: winWidth < 768 ? '17px' : '18px', fontWeight: '900', color: '#0f172a', margin: '4px 0' },
    userRole: { fontSize: '12px', color: '#3863a8', fontWeight: '900', letterSpacing: '0.3px', marginTop: '2px' },

    managerSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 20px',
      backgroundColor: '#ebf2f9',
      borderRadius: '15px',
      border: '1.5px solid #d6e0ea',
      marginTop: winWidth < 768 ? '10px' : '0'
    },
    managerInfo: { textAlign: winWidth < 768 ? 'center' : 'right' },
    managerLabel: { fontSize: '10px', color: '#94a3b8', fontWeight: '800' },
    managerName: { fontSize: '12px', color: '#1e293b', fontWeight: '700' },
    managerAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    infoGrid: {
      display: 'grid',
      gridTemplateColumns: winWidth < 1024 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: winWidth < 768 ? '12px' : '20px',
      marginTop: '20px'
    },
    infoCard: {
      backgroundColor: '#ffffff',
      padding: winWidth < 768 ? '15px' : '20px',
      borderRadius: '20px',
      border: '2px solid #cbd5e1',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      overflow: 'hidden',
      minWidth: 0
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
      fontSize: winWidth < 1024 ? '11px' : '13px',
      color: '#1e293b',
      fontWeight: '800',
      marginTop: '2px',
      wordBreak: 'break-all'
    },

    aboutSection: {
      marginTop: '20px',
      backgroundColor: 'white',
      padding: winWidth < 768 ? '20px' : '30px',
      borderRadius: '20px',
      border: '2px solid #cbd5e1'
    },
    sectionTitle: { fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    aboutContent: { textAlign: 'center', padding: '10px 0' },
    aboutPlaceholder: { fontSize: '14px', color: '#94a3b8', fontWeight: '500', marginTop: '10px' },
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
          <div style={styles.bannerText}>Smarter solutions for better future</div>
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
                style={{ ...styles.avatar, cursor: 'pointer' }}
                onClick={() => profileImage && setShowFullScreen(true)}
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.name ? user.name[0] : 'U'
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

            {/* RESPONSIVE LAYOUT LOGIC: Optimized Tablet (<1024) - Multi-Row Structure */}
            {(winWidth >= 768 && winWidth < 1024) ? (
              <div style={{ ...styles.userInfo, flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Row 1: Name */}
                <div style={styles.userName}>{user?.name}</div>

                {/* Row 2: Designation & Contact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={styles.userRole}>EMPID: 2059</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                    <Phone size={14} />
                    {isEditingPhone ? (
                      <input
                        autoFocus
                        style={{ border: 'none', borderBottom: '1.5px solid #3863a8', outline: 'none', width: '120px', fontSize: '13px', fontWeight: '700', color: '#3863a8', padding: '2px 0' }}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={async () => {
                          setIsEditingPhone(false);
                          if (phone !== (user?.phone_number || 'Add Phone Number')) {
                            const result = await updateProfile('phone_number', phone);
                            if (!result.success) triggerToast('Update Failed', 'error');
                          }
                        }}
                      />
                    ) : (
                      <span onClick={() => setIsEditingPhone(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {phone} <Edit3 size={11} opacity={0.6} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 3: Date of Birth & Reporting Manager (Requested) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '700', padding: '10px 15px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    <Calendar size={14} />
                    {isEditingDob ? (
                      <input
                        type="date"
                        autoFocus
                        style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: '700', color: '#3863a8' }}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        onBlur={async () => {
                          setIsEditingDob(false);
                          if (dob !== (user?.date_of_birth || 'Add Date of Birth')) {
                            const result = await updateProfile('date_of_birth', dob);
                            if (!result.success) triggerToast('Update Failed', 'error');
                          }
                        }}
                      />
                    ) : (
                      <span onClick={() => setIsEditingDob(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {dob} <Edit3 size={11} opacity={0.6} />
                      </span>
                    )}
                  </div>
                  <div style={{ ...styles.managerSection, backgroundColor: '#eff6ff', borderColor: '#dbeafe', marginTop: 0 }}>
                    <div style={styles.managerInfo}>
                      <div style={{ ...styles.managerLabel, color: '#1e40af' }}>Reporting manager</div>
                      <div style={styles.managerName}>{reportingManager.name}</div>
                    </div>
                    <div style={{ ...styles.managerAvatar, backgroundColor: '#3863a8', color: 'white' }}>
                      <div style={{ fontSize: '14px', fontWeight: '900' }}>{reportingManager.name[0]}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (winWidth < 768) ? (
              // MOBILE VIEW (Preserve Original Stacked)
              <>
                <div style={{ ...styles.userInfo, textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={styles.userName}>{user?.name}</div>
                  <div style={styles.userRole}>EMPID: 2059</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                    <Phone size={14} />
                    {isEditingPhone ? (
                      <input
                        autoFocus
                        style={{ border: 'none', borderBottom: '1.5px solid #3863a8', outline: 'none', width: '120px', fontSize: '13px', fontWeight: '700', color: '#3863a8', padding: '2px 0', textAlign: 'center' }}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={async () => {
                          setIsEditingPhone(false);
                          if (phone !== (user?.phone_number || 'Add Phone Number')) {
                            const result = await updateProfile('phone_number', phone);
                            if (!result.success) triggerToast('Update Failed', 'error');
                          }
                        }}
                      />
                    ) : (
                      <span onClick={() => setIsEditingPhone(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {phone} <Edit3 size={11} opacity={0.6} />
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                    <Calendar size={14} />
                    {isEditingDob ? (
                      <input
                        type="date"
                        autoFocus
                        style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: '700', color: '#3863a8', textAlign: 'center' }}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        onBlur={async () => {
                          setIsEditingDob(false);
                          if (dob !== (user?.date_of_birth || 'Add Date of Birth')) {
                            const result = await updateProfile('date_of_birth', dob);
                            if (!result.success) triggerToast('Update Failed', 'error');
                          }
                        }}
                      />
                    ) : (
                      <span onClick={() => setIsEditingDob(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {dob} <Edit3 size={11} opacity={0.6} />
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ ...styles.managerSection, marginTop: '20px', justifyContent: 'center' }}>
                  <div style={styles.managerAvatar}><User size={20} color="#94a3b8" /></div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={styles.managerLabel}>Reporting manager</div>
                    <div style={styles.managerName}>{reportingManager.name}</div>
                  </div>
                </div>
              </>
            ) : (
              // DESKTOP VIEW (Preserve Original Legacy)
              <>
                <div style={{ ...styles.userInfo, textAlign: 'left', flex: 1 }}>
                  <div style={styles.userName}>{user?.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <div style={{ ...styles.userRole, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      EMPID: 2059
                    </div>
                    <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                      <Phone size={14} />
                      {isEditingPhone ? (
                        <input
                          autoFocus
                          style={{ border: 'none', borderBottom: '1.5px solid #3863a8', outline: 'none', width: '120px', fontSize: '13px', fontWeight: '700', color: '#3863a8', padding: '2px 0' }}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onBlur={async () => {
                            setIsEditingPhone(false);
                            if (phone !== (user?.phone_number || 'Add Phone Number')) {
                              const result = await updateProfile('phone_number', phone);
                              if (!result.success) triggerToast('Update Failed', 'error');
                            }
                          }}
                        />
                      ) : (
                        <span onClick={() => setIsEditingPhone(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {phone} <Edit3 size={11} opacity={0.6} />
                        </span>
                      )}
                    </div>
                    <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                      <Calendar size={14} />
                      {isEditingDob ? (
                        <input
                          type="date"
                          autoFocus
                          style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: '700', color: '#3863a8' }}
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          onBlur={async () => {
                            setIsEditingDob(false);
                            if (dob !== (user?.date_of_birth || 'Add Date of Birth')) {
                              const result = await updateProfile('date_of_birth', dob);
                              if (!result.success) triggerToast('Update Failed', 'error');
                            }
                          }}
                        />
                      ) : (
                        <span onClick={() => setIsEditingDob(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {dob} <Edit3 size={11} opacity={0.6} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ ...styles.managerSection, marginLeft: winWidth < 1200 ? '0' : 'auto', minWidth: '220px' }}>
                  <div style={styles.managerInfo}>
                    <div style={styles.managerLabel}>Reporting manager</div>
                    <div style={styles.managerName}>{reportingManager.name || 'Sahana NV'}</div>
                    {reportingManager.id && <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', marginTop: '2px' }}>ID: {reportingManager.id}</div>}
                  </div>
                  <div style={styles.managerAvatar}>
                    {reportingManager.name !== 'Loading...' && reportingManager.name !== 'Unassigned' ? (
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#3863a8' }}>{reportingManager.name[0]}</div>
                    ) : (
                      <User size={20} color="#94a3b8" />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.iconCircle}><Users size={18} color="#3863a8" /></div>
            <div>
              <div style={styles.managerLabel}>Team</div>
              <div style={styles.infoValue}>{user?.team || 'Navabharatha team'}</div>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.iconCircle}><Mail size={18} color="#3863a8" /></div>
            <div>
              <div style={styles.managerLabel}>Email address</div>
              <div style={styles.infoValue}>{user?.email?.toLowerCase()}</div>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.iconCircle}><Calendar size={18} color="#3863a8" /></div>
            <div>
              <div style={styles.managerLabel}>Date of joining</div>
              <div style={styles.infoValue}>
                {(() => {
                  if (!joiningDate || joiningDate === 'N/A') return '10 November 2025';
                  try {
                    const d = new Date(joiningDate);
                    return isNaN(d.getTime()) ? '10 November 2025' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                  } catch { return '10 November 2025'; }
                })()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <div style={styles.sectionTitle}>Services & summary</div>
          <div style={styles.infoGrid}>


            <motion.div
              whileHover={{ y: -5 }}
              style={{ ...styles.infoCard, cursor: 'pointer', border: '2px solid #cbd5e1', backgroundColor: '#ebf2f9' }}
              onClick={() => onNavigate?.('PAYSLIP')}
            >
              <div style={{ ...styles.iconCircle, backgroundColor: '#dfe7f0' }}><CreditCard size={18} color="#0B1E3F" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.managerLabel, color: '#0B1E3F', fontSize: '15px' }}>My payslip</div>
                <div style={{ ...styles.infoValue, color: '#475569', fontSize: '12px' }}>View and download earnings</div>
              </div>
              <ChevronRight size={16} color="#0B1E3F" />
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              style={{ ...styles.infoCard, cursor: 'pointer', border: '2px solid #cbd5e1', backgroundColor: '#ebf2f9' }}
              onClick={() => onNavigate?.('EXPERIENCE_LETTER')}
            >
              <div style={{ ...styles.iconCircle, backgroundColor: '#dfe7f0' }}><FileText size={18} color="#0B1E3F" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.managerLabel, color: '#0B1E3F', fontSize: '15px' }}>Experience & Service Letters</div>
                <div style={{ ...styles.infoValue, color: '#475569', fontSize: '12px' }}>Request experience or service certificate</div>
              </div>
              <ChevronRight size={16} color="#0B1E3F" />
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              style={{ ...styles.infoCard, cursor: 'pointer', border: '2px solid #cbd5e1', backgroundColor: '#ebf2f9' }}
              onClick={() => onNavigate?.('RESIGNATION_LETTER')}
            >
              <div style={{ ...styles.iconCircle, backgroundColor: '#dfe7f0' }}><LogOut size={18} color="#0B1E3F" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.managerLabel, color: '#0B1E3F', fontSize: '15px' }}>Relieving/resignation</div>
                <div style={{ ...styles.infoValue, color: '#475569', fontSize: '12px' }}>Access service documents</div>
              </div>
              <ChevronRight size={16} color="#0B1E3F" />
            </motion.div>
          </div>
        </div>

        <div style={styles.infoGrid}>
          <div style={{ ...styles.infoCard, cursor: 'pointer', borderColor: '#e2e8f0', backgroundColor: '#ffffff' }} onClick={() => setShowPasswordModal(true)}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#f1f5f9' }}><Shield size={18} color="#0B1E3F" /></div>
            <div>
              <div style={{ ...styles.managerLabel, color: '#64748b' }}>Security settings</div>
              <div style={{ ...styles.infoValue, color: '#1e293b' }}>Update security passkey</div>
            </div>
          </div>

          <div style={{ ...styles.infoCard, cursor: 'pointer', borderColor: '#e2e8f0', backgroundColor: '#ffffff' }} onClick={() => onNavigate?.('TICKET')}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#f1f5f9' }}><AlertCircle size={18} color="#0B1E3F" /></div>
            <div>
              <div style={{ ...styles.managerLabel, color: '#64748b' }}>Help & support</div>
              <div style={{ ...styles.infoValue, color: '#1e293b' }}>Open support ticket</div>
            </div>
          </div>
        </div>

        {showPasswordModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '450px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Update password</h2>
                <X size={20} color="#94a3b8" onClick={() => setShowPasswordModal(false)} style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[{ label: 'Current password', key: 'old' }, { label: 'New password', key: 'new' }, { label: 'Confirm password', key: 'confirm' }].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '11px', fontWeight: '1000', color: '#64748b', marginBottom: '8px', display: 'block' }}>{f.label}</label>
                    <input
                      type="password"
                      style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                      value={passData[f.key]}
                      onChange={e => setPassData({ ...passData, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
                <button onClick={handlePasswordSubmit} style={{ marginTop: '10px', padding: '18px', borderRadius: '15px', backgroundColor: '#3863a8', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Establish new passkey</button>
              </div>
            </motion.div>
          </div>
        )}




        <div style={styles.aboutSection}>
          <div style={styles.sectionTitle}>
            <span>About me</span>
            <button
              onClick={async () => {
                if (isEditingAbout) {
                  const result = await updateProfile('about_me', aboutMe);
                  if (!result.success) alert('Update Failed: ' + result.error);
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
                <div style={{ backgroundColor: '#f1f5f9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <Edit3 size={18} color="#cbd5e1" />
                </div>
                <div style={styles.aboutPlaceholder}>{aboutMe}</div>
              </>
            )}
          </div>
        </div>

        {/* ── TL-Only: Team Report Section ── */}
        {user?.role === 'teamleader' && (
          <div style={{ ...styles.aboutSection, marginTop: '20px' }}>
            <div style={styles.sectionTitle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📋</span> Team report
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* summary pills */}
                {[
                  { label: 'Total', val: teamReports.length, bg: '#eff6ff', color: '#1d4ed8' },
                  { label: 'Done', val: teamReports.filter(r => r.overallStatus === 'Completed').length, bg: '#f0fdf4', color: '#16a34a' },
                  { label: 'Pending', val: teamReports.filter(r => r.overallStatus !== 'Completed').length, bg: '#fef9c3', color: '#a16207' },
                ].map(p => (
                  <div key={p.label} style={{ backgroundColor: p.bg, color: p.color, fontSize: '11px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px' }}>
                    {p.val} {p.label.toLowerCase()}
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

