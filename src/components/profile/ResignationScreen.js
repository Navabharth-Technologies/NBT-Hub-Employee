import React, { useState, useEffect } from 'react';
import { LogOut, Send, Calendar, FileText, ChevronLeft, ChevronDown, AlertCircle, History, Users, RefreshCcw, X, Check, User, Info, Download, Printer, ArrowLeft, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getTheme } from '../../constants/Theme';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import logo from '../../assets/image.png';
import BackButton from '../BackButton';

export default function ResignationScreen({ onBack }) {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const sanitizeId = (id) => String(id || '').split(':')[0].trim();
  const formatSignatureDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (d && !isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch (e) {}
    return String(dateStr);
  };

  const parseDateToISO = (dateStr) => {
    if (!dateStr) return null;
    let s = String(dateStr).trim();
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
      const parts = s.split('-');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {}
    return s;
  };
  
  // Tabs: 'main' (Submit + My History), 'team' (Team notice), 'letter' (Active Letter View)
  const [activeTab, setActiveTab] = useState('main');

  // Form State
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState('');
  const [detailedReason, setDetailedReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Exit formalities & feedback states
  const [exitCompleted, setExitCompleted] = useState(false);
  const [feedbackFilled, setFeedbackFilled] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [exitFeedback, setExitFeedback] = useState({
    id: null,
    overallExperience: 5,
    reasonForLeaving: '',
    whatLikedMost: '',
    areasForImprovement: '',
    recommend: 'Yes',
    additionalComments: '',
    employeeSignature: '',
    employeeSignatureDate: '',
    hrSignature: '',
    hrSignatureDate: '',
    managerSignature: '',
    managerSignatureDate: ''
  });

  // UI simulation states
  const [myHistory, setMyHistory] = useState([]);
  const [teamResignations, setTeamResignations] = useState([]);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeData, setRevokeData] = useState({ id: '', reason: '' });
  
  // Detail Overlay State
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [previewLetter, setPreviewLetter] = useState(null);
  const [errorModal, setErrorModal] = useState(null);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    fetchMyResignations();
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const checkExitAndFeedback = async (resignationList) => {
    if (!resignationList || resignationList.length === 0) {
      setExitCompleted(false);
      setFeedbackFilled(false);
      return;
    }
    const activeRes = resignationList.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || resignationList[0];
    if (!activeRes) return;

    // Check localStorage for feedback
    const cleanEmployeeId = (id) => {
      if (!id) return '';
      let s = String(id).split(',')[0].split(':')[0].trim();
      if (/^\d+$/.test(s)) {
        if (s.length >= 10 && s.length % 2 === 0) {
          const half = s.length / 2;
          if (s.substring(0, half) === s.substring(half)) {
            s = s.substring(0, half);
          }
        }
        return Number(s) || s;
      }
      return s;
    };

    const cleanResignationId = (id) => {
      if (!id) return '';
      let s = String(id).split(',')[0].split(':')[0].trim();
      if (/^\d+$/.test(s)) {
        return Number(s) || s;
      }
      return s;
    };

    const rawUid = user?.id || user?.employee_id || user?.empId || user?.userId || activeRes.employee_id || activeRes.userId || activeRes.user_id;
    const cleanUid = cleanEmployeeId(rawUid);
    const cleanResId = cleanResignationId(activeRes.id);

    const feedbackKey = `exit_feedback_${cleanUid}_${cleanResId}`;
    let hasFeedback = false;
    try {
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      let fbRes = await fetch(`${BASE_URL}/api/exit-feedback/my`, {
        headers: { 'Authorization': `Bearer ${cleanToken}` }
      });
      if (!fbRes.ok) {
        fbRes = await fetch(`${BASE_URL}/api/exit-feedback/employee/${cleanUid}`, {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
      }
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        if (fbData && fbData.id) {
          hasFeedback = true;
          setFeedbackFilled(true);
          setExitFeedback({
            id: fbData.id,
            overallExperience: fbData.overall_experience || fbData.overallExperience || 5,
            reasonForLeaving: fbData.reason_for_leaving || fbData.reasonForLeaving || '',
            whatLikedMost: fbData.what_liked_most || fbData.whatLikedMost || fbData.like_most || fbData.likeMost || '',
            areasForImprovement: fbData.areas_for_improvement || fbData.areasForImprovement || fbData.improve_company || fbData.improveCompany || '',
            recommend: fbData.recommend || 'Yes',
            additionalComments: fbData.additional_comments || fbData.additionalComments || '',
            employeeSignature: fbData.employee_signature || fbData.employeeSignature || '',
            employeeSignatureDate: fbData.employee_signature_date || fbData.employeeSignatureDate || '',
            hrSignature: fbData.hr_signature || fbData.hrSignature || '',
            hrSignatureDate: fbData.hr_signature_date || fbData.hrSignatureDate || '',
            managerSignature: fbData.manager_signature || fbData.managerSignature || '',
            managerSignatureDate: fbData.manager_signature_date || fbData.managerSignatureDate || ''
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch exit feedback from backend:", err);
    }

    if (!hasFeedback) {
      const savedFeedback = localStorage.getItem(feedbackKey);
      if (savedFeedback) {
        setFeedbackFilled(true);
        try {
          setExitFeedback(JSON.parse(savedFeedback));
        } catch (e) {}
      } else {
        setFeedbackFilled(false);
      }
    }

    if ((activeRes.status || '').toUpperCase() === 'APPROVED') {
      try {
        const token = localStorage.getItem('token');
        const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
        const exitRes = await fetch(`${API_ENDPOINTS.EXIT_FORMALITIES}/resignation/${activeRes.id}`, {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
        if (exitRes.ok) {
          const exitData = await exitRes.json();
          if (exitData && (exitData.id || (Array.isArray(exitData) && exitData.length > 0))) {
            setExitCompleted(true);
          } else {
            setExitCompleted(false);
          }
        } else {
          setExitCompleted(false);
        }
      } catch (err) {
        console.warn("Failed to check exit formalities status:", err);
        setExitCompleted(false);
      }
    } else {
      setExitCompleted(false);
    }
  };

  const fetchMyResignations = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.RESIGNATION_MY, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
        setMyHistory(data);
        const active = data.find(r => (r.status || '').toUpperCase() === 'PENDING');
        if (active) {
          setPreviewLetter(active);
          setSubmitted(true);
        } else {
          setSubmitted(false);
        }
        await checkExitAndFeedback(data);
      } else {
        // Fallback to localStorage if backend fails
        const sid = sanitizeId(user?.id || user?.employee_id || user?.empId);
        const saved = localStorage.getItem(`sim_resignations_${sid}`);
        if (saved) {
          const history = JSON.parse(saved);
          setMyHistory(history);
          const active = history.find(r => r.status === 'PENDING');
          if (active) {
            setPreviewLetter(active);
            setSubmitted(true);
          } else {
            setSubmitted(false);
          }
          await checkExitAndFeedback(history);
        } else {
          setSubmitted(false);
          await checkExitAndFeedback([]);
        }
      }
    } catch {
      const saved = localStorage.getItem(`sim_resignations_${user?.id}`);
      if (saved) {
        const history = JSON.parse(saved);
        setMyHistory(history);
        const active = history.find(r => r.status === 'PENDING');
        if (active) {
          setPreviewLetter(active);
          setSubmitted(true);
        } else {
          setSubmitted(false);
        }
        await checkExitAndFeedback(history);
      } else {
        setSubmitted(false);
        await checkExitAndFeedback([]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!lastWorkingDay || !reason || !detailedReason.trim()) {
      return setErrorModal('Please fill in all required fields.');
    }
    // Built-in deduplication: prevent double submission
    const alreadyActive = myHistory.find(r => (r.status || '').toUpperCase() === 'PENDING');
    if (alreadyActive) {
      return setErrorModal('You already have a pending resignation. Please revoke it before submitting a new one.');
    }
    const sid = sanitizeId(user?.id || user?.employee_id || user?.empId);
    const mId = Number(user?.reporting_manager_id || user?.reportingManagerId || user?.manager_id || user?.managerId || 0) || 0;
    
    // Create the entry for local preview IMMEDIATELY to show the letter view as requested
    const entry = {
      id: 'TEMP_' + Math.floor(Math.random() * 10000),
      userId: sid, 
      userName: user?.name,
      resignation_date: resignationDate, 
      last_working_day: lastWorkingDay,
      resignationDate, 
      lastWorkingDay,
      reason, 
      detailedReason: detailedReason,
      detailed_reason: detailedReason,
      status: 'PENDING', 
      timestamp: new Date().toISOString()
    };
    
    setPreviewLetter(entry);

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Safely resolve employee_id — never send NaN or undefined
      const empIdNum = Number(sid);
      const safeEmpId = !isNaN(empIdNum) && empIdNum > 0 ? empIdNum : sid;

      const letterText = `This is to formally notify you of my resignation from the position of ${user?.designation || user?.role || 'Engineer'} at Navabharath Technologies. My last working day will be ${new Date(lastWorkingDay).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nI have decided to move on for ${reason}. ${detailedReason}\n\nI want to thank you for the opportunities for professional and personal development that I have provided me during my tenure. I have enjoyed working for Navabharath Technologies and appreciate the support provided during my time with the company.\n\nI will ensure a smooth handover of my responsibilities before my departure.`;

      const payload = {
        employee_id: safeEmpId,
        user_id: safeEmpId,
        email: user?.email || '',
        employee_name: user?.name || '',
        designation: user?.designation || user?.role || '',
        department: user?.department || 'Operations',
        manager_id: mId,
        reporting_manager_id: mId,
        managerId: mId,
        resignation_date: resignationDate,
        last_working_day: lastWorkingDay,
        reason: reason,
        detailed_reason: detailedReason,
        status: 'PENDING',
        letter_content: letterText,
      };
      
      // Payload ready — submitting to backend
      
      const res = await fetch(API_ENDPOINTS.RESIGNATION_SUBMIT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newEntry = await res.json().catch(() => ({}));
        const finalEntry = { ...entry, id: newEntry.id || newEntry.insertId || entry.id };
        const updatedHistory = [finalEntry, ...myHistory];
        setMyHistory(updatedHistory);
        localStorage.setItem(`sim_resignations_${sid}`, JSON.stringify(updatedHistory));
        setSubmitted(true);
      } else {
        // Submission failed silently — local preview is still shown
      }
    } catch {
      // Network error — local preview still shown to user
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeData.reason.trim()) return setErrorModal('Please provide a reason.');
    setLoading(true);
    try {
      // Update locally and attempt backend sync
      const updatedHistory = myHistory.map(r => r.id === revokeData.id ? { ...r, status: 'REVOKED', revokeReason: revokeData.reason } : r);
      setMyHistory(updatedHistory);
      localStorage.setItem(`sim_resignations_${user?.id}`, JSON.stringify(updatedHistory));
      setSubmitted(false);
      setShowRevokeModal(false);
      setPreviewLetter(null);
    } catch {
      // Revoke failed silently
    } finally {
      setLoading(false);
    }
  };

  const s = {
    container: { minHeight: '100vh', backgroundColor: '#F5F6FC', padding: '30px 40px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '100%', margin: '0 auto', padding: '20px' },
    header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
    backBtn: { padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0B1E3F', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    title: { fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 },
    tabBar: { display: 'flex', gap: '10px', marginBottom: '30px', background: '#e2e8f0', padding: '6px', borderRadius: '18px', maxWidth: '600px', overflowX: 'auto' },
    tab: (active) => ({ flex: 1, padding: '12px 20px', borderRadius: '14px', border: 'none', backgroundColor: active ? 'white' : 'transparent', color: active ? '#0B1E3F' : '#64748b', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', whiteSpace: 'nowrap' }),
    card: { backgroundColor: 'white', borderRadius: '35px', padding: '50px', boxShadow: '0 20px 60px rgba(0,0,0,0.03)', border: '1.5px solid #f1f5f9', marginBottom: '30px' },
    label: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'block' },
    input: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', marginBottom: '25px' },
    textarea: { width: '100%', padding: '20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', boxSizing: 'border-box', minHeight: '160px', marginBottom: '25px', resize: 'none' },
    select: { width: '100%', padding: '16px 20px', borderRadius: '15px', backgroundColor: '#f8fafc', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#0B1E3F', fontWeight: '600', outline: 'none', cursor: 'pointer', marginBottom: '25px', appearance: 'none' },
    submitBtn: { width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.2)' },
    historyItem: { padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1px solid #f1f5f9', marginBottom: '15px' },
    statusBadge: (s) => ({ padding: '6px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', backgroundColor: s === 'PENDING' ? '#fffbeb' : (s === 'REVOKED' ? '#f1f5f9' : '#f0fdf4'), color: s === 'PENDING' ? '#d97706' : (s === 'REVOKED' ? '#64748b' : '#16a34a') }),
    revokeBtn: { padding: '10px 20px', borderRadius: '12px', backgroundColor: 'transparent', color: '#dc2626', border: '1.5px solid #dc2626', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' },
    
    // Detail View Styles
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', zIndex: 11000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '100px 40px 40px', overflowY: 'auto' },
    detailCard: { backgroundColor: 'white', borderRadius: '40px', width: '100%', maxWidth: '700px', padding: '50px', position: 'relative' },

    // Geometric shapes (Matched to Reference Image)
    topShape: { position: 'absolute', top: 0, right: 0, width: '350px', height: '350px', backgroundColor: '#3b82f6', clipPath: 'polygon(100% 0, 100% 100%, 20% 0)', opacity: 0.1, zIndex: 1 },
    topShapePrimary: { position: 'absolute', top: 0, right: 0, width: '280px', height: '280px', backgroundColor: '#1d4ed8', clipPath: 'polygon(100% 0, 100% 100%, 40% 0)', zIndex: 1 },
    topShapeSecondary: { position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', backgroundColor: '#1e3a8a', clipPath: 'polygon(100% 0, 100% 80%, 60% 0)', zIndex: 1 },
    bottomShape: { position: 'absolute', bottom: 0, left: 0, width: '350px', height: '350px', backgroundColor: '#3b82f6', clipPath: 'polygon(0 30%, 0 100%, 80% 100%)', opacity: 0.1, zIndex: 1 },
    bottomShapePrimary: { position: 'absolute', bottom: 0, left: 0, width: '280px', height: '280px', backgroundColor: '#1d4ed8', clipPath: 'polygon(0 60%, 0 100%, 60% 100%)', zIndex: 1 },
    bottomShapeSecondary: { position: 'absolute', bottom: 0, left: 0, width: '180px', height: '180px', backgroundColor: '#1e3a8a', clipPath: 'polygon(0 80%, 0 100%, 40% 100%)', zIndex: 1 },

    letterHeader: { marginBottom: '40px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
    logo: { height: '80px', marginBottom: '10px' },
    footerInfo: { marginTop: 'auto', marginBottom: '20px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 10, textAlign: 'right' },
    footerItem: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px', color: '#1e3a8a', fontSize: '13px', fontWeight: '800' },
    footerBar: (color) => ({ width: '40px', height: '14px', backgroundColor: color, borderRadius: '4px' }),

    // Premium Letter Container - Centered and constrained for "Square" feel
    letterContainer: { position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'white', padding: '100px 100px 150px', borderRadius: '4px', boxShadow: '0 0 50px rgba(0,0,0,0.06)', color: '#1e3a8a', fontSize: '15px', lineHeight: '2', minHeight: '1000px', border: '1px solid #e2e8f0', maxWidth: '1000px', margin: '0 auto' },
    watermark: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.04, zIndex: 0, pointerEvents: 'none', width: '500px', filter: 'grayscale(100%)' }
  };

  return (
    <div style={s.container}>
      <div style={s.main}>
        {showFeedbackForm ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', maxWidth: '1000px', margin: '0 auto 20px' }}>
              <button 
                onClick={() => setShowFeedbackForm(false)} 
                style={{ ...s.backBtn, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ArrowLeft size={18} /> Back to Exits
              </button>
              <button
                onClick={async () => {
                  if (feedbackFilled && !isEditingFeedback) {
                    setIsEditingFeedback(true);
                    return;
                  }

                  const activeRes = myHistory.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || myHistory[0];
                  if (!activeRes) return;
                  
                  const cleanEmployeeId = (id) => {
                    if (!id) return '';
                    let s = String(id).split(',')[0].split(':')[0].trim();
                    if (/^\d+$/.test(s)) {
                      if (s.length >= 10 && s.length % 2 === 0) {
                        const half = s.length / 2;
                        if (s.substring(0, half) === s.substring(half)) {
                          s = s.substring(0, half);
                        }
                      }
                      return Number(s) || s;
                    }
                    return s;
                  };

                  const cleanResignationId = (id) => {
                    if (!id) return '';
                    let s = String(id).split(',')[0].split(':')[0].trim();
                    if (/^\d+$/.test(s)) {
                      return Number(s) || s;
                    }
                    return s;
                  };

                  const rawUid = user?.id || user?.employee_id || user?.empId || user?.userId || activeRes.employee_id || activeRes.userId || activeRes.user_id;
                  const cleanUid = cleanEmployeeId(rawUid);
                  const cleanResId = cleanResignationId(activeRes.id);
                  
                  const token = localStorage.getItem('token');
                  const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
                  
                  const payload = {
                    resignation_id: cleanResId,
                    resignationId: cleanResId,
                    employee_id: cleanUid,
                    employeeId: cleanUid,
                    user_id: cleanUid,
                    userId: cleanUid,
                    overall_experience: exitFeedback.overallExperience || 5,
                    overallExperience: exitFeedback.overallExperience || 5,
                    reason_for_leaving: exitFeedback.reasonForLeaving || activeRes.reason || '',
                    reasonForLeaving: exitFeedback.reasonForLeaving || activeRes.reason || '',
                    what_liked_most: exitFeedback.whatLikedMost || '',
                    whatLikedMost: exitFeedback.whatLikedMost || '',
                    like_most: exitFeedback.whatLikedMost || '',
                    likeMost: exitFeedback.whatLikedMost || '',
                    areas_for_improvement: exitFeedback.areasForImprovement || '',
                    areasForImprovement: exitFeedback.areasForImprovement || '',
                    improve_company: exitFeedback.areasForImprovement || '',
                    improveCompany: exitFeedback.areasForImprovement || '',
                    recommend: exitFeedback.recommend || 'Yes',
                    additional_comments: exitFeedback.additionalComments || '',
                    additionalComments: exitFeedback.additionalComments || '',
                    employee_signature: exitFeedback.employeeSignature || user?.name || '',
                    employeeSignature: exitFeedback.employeeSignature || user?.name || '',
                    employee_signature_date: parseDateToISO(exitFeedback.employeeSignatureDate) || new Date().toISOString().split('T')[0],
                    employeeSignatureDate: parseDateToISO(exitFeedback.employeeSignatureDate) || new Date().toISOString().split('T')[0],
                    hr_signature: exitFeedback.hrSignature || '',
                    hrSignature: exitFeedback.hrSignature || '',
                    hr_signature_date: parseDateToISO(exitFeedback.hrSignatureDate) || '',
                    hrSignatureDate: parseDateToISO(exitFeedback.hrSignatureDate) || '',
                    manager_signature: exitFeedback.managerSignature || '',
                    managerSignature: exitFeedback.managerSignature || '',
                    manager_signature_date: exitFeedback.managerSignatureDate || '',
                    managerSignatureDate: exitFeedback.managerSignatureDate || ''
                  };

                  if (exitFeedback.id) {
                    payload.id = exitFeedback.id;
                    payload.feedbackId = exitFeedback.id;
                  }
                  
                  try {
                    const baseUrl = API_ENDPOINTS.EXIT_FEEDBACK || `${BASE_URL}/api/exit-feedback`;
                    const url = exitFeedback.id ? `${baseUrl}/${exitFeedback.id}` : baseUrl;
                    const method = exitFeedback.id ? 'PUT' : 'POST';
                    const res = await fetch(url, {
                      method: method,
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': cleanToken ? `Bearer ${cleanToken}` : ''
                      },
                      body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                      const savedObj = { ...exitFeedback };
                      if (!exitFeedback.id) {
                        try {
                          const resData = await res.json();
                          if (resData && resData.id) {
                            savedObj.id = resData.id;
                          }
                        } catch (e) {}
                      }
                      localStorage.setItem(`exit_feedback_${cleanUid}_${cleanResId}`, JSON.stringify(savedObj));
                      setExitFeedback(savedObj);
                      setFeedbackFilled(true);
                      setIsEditingFeedback(false);
                      setErrorModal({
                        title: 'Success',
                        message: method === 'PUT' ? 'Exit feedback updated successfully!' : 'Exit feedback submitted successfully! Thank you.',
                        isSuccess: true,
                        onClose: () => {
                          if (method === 'POST') setShowFeedbackForm(false);
                        }
                      });
                    } else {
                      const errMsg = await res.text();
                      setErrorModal(`Failed to submit exit feedback: ${errMsg}`);
                    }
                  } catch (err) {
                    console.error(err);
                    setErrorModal('Failed to submit exit feedback due to network error.');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: (!feedbackFilled || isEditingFeedback) ? '#16a34a' : '#1b2559',
                  color: 'white',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: (!feedbackFilled || isEditingFeedback) ? '0 4px 12px rgba(22, 163, 74, 0.25)' : '0 4px 12px rgba(27, 37, 89, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                {(!feedbackFilled || isEditingFeedback) ? (
                  <>
                    <Check size={18} /> {feedbackFilled ? 'Save Feedback' : 'Submit Feedback'}
                  </>
                ) : (
                  <>
                    <Edit size={18} /> Edit Feedback
                  </>
                )}
              </button>
            </div>

            <div style={{ ...s.letterContainer, padding: winWidth < 768 ? '40px 20px 100px' : '100px 100px 150px', minHeight: '900px' }}>
              <svg width="250" height="250" viewBox="0 0 250 250" style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 1 }}>
                <polygon points="120,0 250,130 250,0" fill="#0056b3" />
                <polygon points="150,0 250,100 250,0" fill="#1b2559" />
                <polygon points="50,0 250,200 250,160 90,0" fill="#007bff" />
              </svg>

              <div style={s.watermark}>
                <img src={logo} alt="Watermark" style={{ width: '500px' }} />
              </div>

              <div style={s.letterHeader}>
                <img src={logo} alt="Company Logo" style={s.logo} />
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#1b2559', letterSpacing: '2px', marginTop: '5px' }}>
                  NAVABHARATH TECHNOLOGIES
                </div>
              </div>

              <div style={{ position: 'relative', zIndex: 10, marginTop: '30px', color: '#1e3a8a', fontFamily: 'inherit' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px' }}>
                  7. Exit Feedback (Optional)
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '40px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '750', marginBottom: '10px', color: '#1b2559' }}>
                      • What did you like most about working here?
                    </div>
                    <textarea
                      disabled={feedbackFilled && !isEditingFeedback}
                      value={exitFeedback.whatLikedMost}
                      onChange={e => setExitFeedback({ ...exitFeedback, whatLikedMost: e.target.value })}
                      placeholder={feedbackFilled ? "" : "Your comments..."}
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        border: 'none',
                        borderBottom: '2px solid #1e3a8a',
                        backgroundColor: 'transparent',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1b2559',
                        outline: 'none',
                        resize: 'none',
                        padding: '8px 0',
                        fontFamily: 'inherit',
                        lineHeight: '1.6'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '750', marginBottom: '10px', color: '#1b2559' }}>
                      • What can the company improve?
                    </div>
                    <textarea
                      disabled={feedbackFilled && !isEditingFeedback}
                      value={exitFeedback.areasForImprovement}
                      onChange={e => setExitFeedback({ ...exitFeedback, areasForImprovement: e.target.value })}
                      placeholder={feedbackFilled ? "" : "Your comments..."}
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        border: 'none',
                        borderBottom: '2px solid #1e3a8a',
                        backgroundColor: 'transparent',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1b2559',
                        outline: 'none',
                        resize: 'none',
                        padding: '8px 0',
                        fontFamily: 'inherit',
                        lineHeight: '1.6'
                      }}
                    />
                  </div>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px', marginTop: '40px' }}>
                  8. Signatures
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <span>• Employee Signature: <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px' }}>{exitFeedback.employeeSignature || user?.name || '_______________________'}</span></span>
                    <span>Date: <span style={{ color: '#1b2559', padding: '0 5px' }}>{exitFeedback.employeeSignatureDate ? formatSignatureDate(exitFeedback.employeeSignatureDate) : (feedbackFilled ? formatSignatureDate(new Date()) : '___________')}</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <span>• HR Signature: <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px' }}>{exitFeedback.hrSignature || '_______________________'}</span></span>
                    <span>Date: <span style={{ color: '#1b2559', padding: '0 5px' }}>{formatSignatureDate(exitFeedback.hrSignatureDate) || '___________'}</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <span>• Manager Signature: <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px' }}>{exitFeedback.managerSignature || '_______________________'}</span></span>
                    <span>Date: <span style={{ color: '#1b2559', padding: '0 5px' }}>{formatSignatureDate(exitFeedback.managerSignatureDate) || '___________'}</span></span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'auto', marginBottom: '20px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 10, textAlign: 'right', color: '#1e3a8a', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                  <span>Phone: 0821-3128831</span>
                  <div style={{ width: '30px', height: '10px', backgroundColor: '#0056b3' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                  <span>www.navabharathtechnologies.com</span>
                  <div style={{ width: '30px', height: '10px', backgroundColor: '#1b2559' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                  <span>hr@navabharathtechnologies.com</span>
                  <div style={{ width: '30px', height: '10px', backgroundColor: '#007bff' }}></div>
                </div>
              </div>

              <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                <polygon points="0,300 100,300 0,200" fill="#0056b3" />
                <polygon points="0,200 150,300 120,300 0,220" fill="#1b2559" />
                <polygon points="0,150 200,300 170,300 0,170" fill="#007bff" />
                <polygon points="0,100 250,300 220,300 0,120" fill="#1b2559" />
              </svg>
            </div>
          </div>
        ) : (
          <>
            <div style={s.header}>
              <BackButton onClick={onBack} />
              <h1 style={s.title}>Exit Management</h1>
            </div>

        {(user?.role === 'Manager' || user?.role === 'Admin') && (
          <div style={s.tabBar}>
            <button style={s.tab(activeTab === 'main')} onClick={() => setActiveTab('main')}><Send size={16} /> My Resignation</button>
            <button style={s.tab(activeTab === 'team')} onClick={() => setActiveTab('team')}><Users size={16} /> Team notice</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div key="main" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {(() => {
                const activeRes = myHistory.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || myHistory[0];
                if (!activeRes) return null;

                const designation = String(user?.designation || user?.role || '').toLowerCase();
                const role = String(user?.role || '').toLowerCase();
                const isExcludedFromTlReview = 
                  designation.includes('tl') || designation.includes('team lead') || designation.includes('teamleader') || designation.includes('lead') ||
                  role.includes('tl') || role.includes('team lead') || role.includes('teamleader') || role.includes('lead') ||
                  designation.includes('pm') || designation.includes('project manager') || designation.includes('project lead') ||
                  role.includes('pm') || role.includes('project manager') || role.includes('project lead') ||
                  designation.includes('hr') || designation.includes('human resource') ||
                  role.includes('hr') || role.includes('human resource');

                const userManagerId = Number(user?.reporting_manager_id || user?.reportingManagerId || user?.manager_id || user?.managerId || 0) || 0;
                const hasNoTl = userManagerId === 0;
                const hasTlApproved = isExcludedFromTlReview || hasNoTl || !!(activeRes.reviewed_by_tl || activeRes.reporting_manager_remark);
                const hasPmApproved = (activeRes.pm_status || '').toUpperCase() === 'APPROVED';
                const hasHrApproved = (activeRes.hr_status || '').toUpperCase() === 'APPROVED';

                const isRejected = (activeRes.status || '').toUpperCase() === 'REJECTED' || 
                                   (activeRes.pm_status || '').toUpperCase() === 'REJECTED' || 
                                   (activeRes.hr_status || '').toUpperCase() === 'REJECTED';

                const isAllApproved = !isRejected && (
                  (activeRes.status || '').toUpperCase() === 'APPROVED' || 
                  (hasTlApproved && hasPmApproved && hasHrApproved)
                );

                return (
                  <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {isRejected && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: '18px 24px',
                          backgroundColor: '#fef2f2',
                          border: '1.5px solid #fecaca',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          color: '#b91c1c',
                          boxShadow: '0 8px 20px rgba(220, 38, 38, 0.05)'
                        }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={22} color="#dc2626" />
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Rejected</div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#b91c1c95' }}>Your resignation is rejected</div>
                        </div>
                      </motion.div>
                    )}

                    {!isRejected && !isAllApproved && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: '24px',
                          backgroundColor: '#fffbeb',
                          border: '1.5px solid #fde68a',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '15px',
                          color: '#b45309',
                          boxShadow: '0 8px 20px rgba(217, 119, 6, 0.05)'
                        }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <AlertCircle size={22} color="#d97706" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Waiting</div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#b4530995', marginBottom: '16px' }}>Your resignation is waiting for approvals</div>
                          
                          <div style={{ display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: hasTlApproved ? '#f0fdf4' : '#fffbeb', border: `1.5px solid ${hasTlApproved ? '#bbf7d0' : '#fde68a'}`, padding: '8px 14px', borderRadius: '12px', color: hasTlApproved ? '#15803d' : '#b45309' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: hasTlApproved ? '#16a34a' : '#d97706' }}></div>
                              <span style={{ fontSize: '12px', fontWeight: '800' }}>Team Leader: {hasTlApproved ? 'Approved' : 'Pending'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: hasPmApproved ? '#f0fdf4' : '#fffbeb', border: `1.5px solid ${hasPmApproved ? '#bbf7d0' : '#fde68a'}`, padding: '8px 14px', borderRadius: '12px', color: hasPmApproved ? '#15803d' : '#b45309' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: hasPmApproved ? '#16a34a' : '#d97706' }}></div>
                              <span style={{ fontSize: '12px', fontWeight: '800' }}>Project Manager: {hasPmApproved ? 'Approved' : 'Pending'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: hasHrApproved ? '#f0fdf4' : '#fffbeb', border: `1.5px solid ${hasHrApproved ? '#bbf7d0' : '#fde68a'}`, padding: '8px 14px', borderRadius: '12px', color: hasHrApproved ? '#15803d' : '#b45309' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: hasHrApproved ? '#16a34a' : '#d97706' }}></div>
                              <span style={{ fontSize: '12px', fontWeight: '800' }}>HR Department: {hasHrApproved ? 'Approved' : 'Pending'}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {!isRejected && isAllApproved && (
                      <>
                        {!exitCompleted ? (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              padding: '18px 24px',
                              backgroundColor: '#f0fdf4',
                              border: '1.5px solid #bbf7d0',
                              borderRadius: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '15px',
                              color: '#15803d',
                              boxShadow: '0 8px 20px rgba(22, 163, 74, 0.05)'
                            }}
                          >
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check size={22} color="#16a34a" />
                            </div>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Approved</div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#15803d95' }}>Your resignation has been approved by Team Leader, Project Manager, and HR.</div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              padding: '24px',
                              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                              borderRadius: '25px',
                              color: 'white',
                              boxShadow: '0 12px 30px rgba(59, 130, 246, 0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '15px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={24} color="white" />
                              </div>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>Exit Formalities Completed</div>
                                <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '500', marginTop: '2px', lineHeight: '1.4' }}>
                                  Your exit formalities are completed so view the Feedback form and fill out this
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
                              <button
                                onClick={() => setShowFeedbackForm(true)}
                                style={{
                                  padding: '10px 20px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  backgroundColor: 'white',
                                  color: '#4f46e5',
                                  fontWeight: '800',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                {feedbackFilled ? 'View Exit Feedback' : 'View Feedback Form'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
              <div style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                  <div style={{ padding: '15px', borderRadius: '15px', backgroundColor: '#fef2f2', color: '#dc2626' }}><LogOut size={30} /></div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Resignation Intent</h2>
                    <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', margin: 0 }}>Step 1: Fill in your details to generate your official letter.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={s.label}>Intent Date</label>
                    <input type="date" style={s.input} value={resignationDate} disabled />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={s.label}>Proposed Last Working Day</label>
                    <input type="date" style={s.input} value={lastWorkingDay} onChange={e => setLastWorkingDay(e.target.value)} />
                  </div>
                </div>

                <label style={s.label}>Select Purpose</label>
                <div style={{ position: 'relative', width: '100%', marginBottom: '25px' }}>
                  <select 
                    style={{ ...s.select, marginBottom: 0, paddingRight: '45px' }} 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                  >
                    <option value="" disabled hidden>Select for the Purpose</option>
                    <option value="Better Career Opportunity">Better Career Opportunity</option>
                    <option value="Personal Reasons">Personal Reasons</option>
                    <option value="Higher Education">Higher Education</option>
                    <option value="Other">Other</option>
                  </select>
                  <div style={{ 
                    position: 'absolute', 
                    right: '20px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    pointerEvents: 'none',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <ChevronDown size={18} />
                  </div>
                </div>

                <label style={s.label}>Additional Details</label>
                <textarea style={s.textarea} placeholder="Describe your reasons briefly..." value={detailedReason} onChange={e => setDetailedReason(e.target.value)} />

                <button
                  style={{
                    ...s.submitBtn,
                    opacity: (loading || submitted) ? 0.7 : 1,
                    backgroundColor: submitted ? '#94a3b8' : '#dc2626',
                    cursor: (loading || submitted) ? 'not-allowed' : 'pointer',
                    boxShadow: submitted ? 'none' : '0 10px 25px rgba(220, 38, 38, 0.2)'
                  }}
                  onClick={submitted ? undefined : handleSubmit}
                  disabled={loading || submitted}
                >
                  {loading ? "Generating..." : submitted ? <><FileText size={18} /> Resignation Submitted</> : <><FileText size={18} /> Generate &amp; Submit Letter</>}
                </button>

                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '16px',
                      padding: '16px 20px',
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #bbf7d0',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#16a34a'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '900', marginBottom: '2px' }}>Resignation Submitted Successfully!</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#4ade80' }}>Your resignation letter has been sent. Check history below for status.</div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div style={s.card}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '30px' }}>My Resignation History</h2>
                {myHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: '700' }}>No history found.</div>
                ) : myHistory.map(r => (
                  <div key={r.id} style={s.historyItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div onClick={() => { setPreviewLetter(r); setActiveTab('letter'); }} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>{r.reason}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Submitted: {r.resignationDate} • LWD: {r.lastWorkingDay}</div>
                      </div>
                      <div style={s.statusBadge(r.status)}>{r.status}</div>
                    </div>
                    {r.status === 'PENDING' && (
                      <button style={s.revokeBtn} onClick={() => { setRevokeData({ id: r.id, reason: '' }); setShowRevokeModal(true); }}>
                        <RefreshCcw size={14} /> Revoke Notice
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}


          {activeTab === 'team' && (
            <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Team notice</h2>
                  <div style={{ padding: '6px 14px', backgroundColor: '#dc2626', color: 'white', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>
                    {teamResignations.filter(r => r.status === 'PENDING').length} PENDING
                  </div>
                </div>
                {teamResignations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '700' }}>No team resignations logged.</div>
                ) : teamResignations.map(r => (
                  <motion.div 
                    key={r.id} 
                    whileHover={{ scale: 1.01, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    onClick={() => setSelectedResignation(r)}
                    style={{ ...s.historyItem, borderLeft: '4px solid #dc2626', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#0B1E3F', marginBottom: '4px' }}>{r.userName}</div>
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '800', marginBottom: '8px' }}>Reason: {r.reason}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Submitted: {r.resignationDate} • LWD: <strong>{r.lastWorkingDay}</strong></div>
                      </div>
                      <div style={s.statusBadge(r.status)}>{r.status}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'letter' && previewLetter && (
            <motion.div key="letter" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', maxWidth: '1000px', margin: '0 auto 20px' }}>
                <button style={s.backBtn} onClick={() => setActiveTab('main')}>
                  <ArrowLeft size={18} /> Back to Resignation
                </button>
                {previewLetter.status === 'PENDING' && (
                  <button 
                    style={{ ...s.submitBtn, backgroundColor: '#dc2626', width: 'auto', padding: '10px 20px', boxShadow: 'none' }}
                    onClick={() => { setRevokeData({ id: previewLetter.id, reason: '' }); setShowRevokeModal(true); }}
                  >
                    <RefreshCcw size={16} /> Revoke Resignation
                  </button>
                )}
              </div>

              <div style={s.letterContainer}>
                <div style={s.topShape}></div>
                <div style={s.topShapePrimary}></div>
                <div style={s.topShapeSecondary}></div>

                <div style={s.watermark}>
                  <img src={logo} alt="Watermark" style={{ width: '500px' }} />
                </div>

                <div style={s.letterHeader}>
                  <img src={logo} alt="Company Logo" style={s.logo} />
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', letterSpacing: '2px' }}>
                    NAVABHARATH TECHNOLOGIES
                  </div>
                </div>

                <div style={{ position: 'relative', zIndex: 10, marginTop: '40px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '1000', color: '#1e3a8a', textAlign: 'center', textDecoration: 'underline', textUnderlineOffset: '8px', marginBottom: '50px' }}>
                    RESIGNATION LETTER
                  </div>
                  <div style={{ fontWeight: '800', marginBottom: '30px' }}>Date: {new Date(previewLetter.resignationDate || previewLetter.resignation_date || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontWeight: '1000', color: '#0B1E3F', marginBottom: '40px' }}>To, <br/>The Management, <br/>Navabharath Technologies</div>
                  
                  <div style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: '1.8', marginBottom: '40px' }}>
                    {previewLetter.letter_content || `Dear Sir/Madam,\n\nThis is to formally notify you of my resignation from the position of ${user?.designation || user?.role || 'Engineer'} at Navabharath Technologies. My proposed last working day will be ${new Date(previewLetter.lastWorkingDay || previewLetter.last_working_day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nI have decided to move on for ${previewLetter.reason || 'Personal Reasons'}.\n\n${previewLetter.detailedReason || previewLetter.detailed_reason || ''}\n\nI appreciate the opportunities provided to me during my time with the company.\n\nSincerely,\n${previewLetter.userName || user?.name}`}
                  </div>
                </div>

                <div style={s.footerInfo}>
                  <div style={s.footerItem}>
                    <span>Phone: 0821-3128831</span>
                    <div style={s.footerBar('#3b82f6')}></div>
                  </div>
                  <div style={s.footerItem}>
                    <span>www.navabharathtechnologies.com</span>
                    <div style={s.footerBar('#1d4ed8')}></div>
                  </div>
                  <div style={s.footerItem}>
                    <span>contact@navabharathtechnologies.com</span>
                    <div style={s.footerBar('#1e3a8a')}></div>
                  </div>
                </div>

                <div style={s.bottomShape}></div>
                <div style={s.bottomShapePrimary}></div>
                <div style={s.bottomShapeSecondary}></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
      </div>


      {/* DETAIL MODAL OVERLAY */}
      <AnimatePresence>
        {selectedResignation && (
          <div style={s.overlay} onClick={() => setSelectedResignation(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={s.detailCard}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '35px' }}>
                <button 
                  onClick={() => setSelectedResignation(null)}
                  style={{ ...s.backBtn }}
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Review Resignation</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <User size={32} />
                </div>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>{selectedResignation.userName}</h2>
                  <div style={s.statusBadge(selectedResignation.status)}>{selectedResignation.status}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '35px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Submitted On</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>{selectedResignation.resignationDate}</div>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>Last Working Day</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>{selectedResignation.lastWorkingDay}</div>
                </div>
              </div>

              <div style={{ marginBottom: '35px' }}>
                <div style={s.label}>Reason for Exit</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1E3F', backgroundColor: '#fef2f2', padding: '12px 18px', borderRadius: '12px', display: 'inline-block' }}>
                  {selectedResignation.reason}
                </div>
              </div>

              <div style={{ marginBottom: '40px' }}>
                <div style={s.label}>Formal Letter Content</div>
                <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderRadius: '25px', border: '1.5px solid #f1f5f9', fontSize: '14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', minHeight: '150px' }}>
                  {selectedResignation.detailedReason}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button style={{ flex: 1, padding: '18px', borderRadius: '18px', backgroundColor: '#f1f5f9', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }} onClick={() => setSelectedResignation(null)}>
                  Close
                </button>
                <button style={{ flex: 2, padding: '18px', borderRadius: '18px', backgroundColor: '#0B1E3F', border: 'none', color: 'white', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Info size={18} /> Discuss Release
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showRevokeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '450px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '25px' }}>Revoke Resignation</h2>
            <label style={s.label}>Reason for Revoking</label>
            <textarea style={{ ...s.textarea, minHeight: '100px' }} placeholder="Why are you revoking?" value={revokeData.reason} onChange={e => setRevokeData({ ...revokeData, reason: e.target.value })} />
            <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => setShowRevokeModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '15px', background: '#f1f5f9', border: 'none', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleRevoke} style={{ flex: 2, ...s.submitBtn, backgroundColor: '#0B1E3F', padding: '15px' }}>{loading ? "Revoking..." : "Confirm Revoke"}</button>
            </div>
          </motion.div>
        </div>
      )}

      {errorModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '400px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            {typeof errorModal === 'object' && errorModal.isSuccess ? (
              <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={30} />
              </div>
            ) : (
              <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertCircle size={30} />
              </div>
            )}
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0B1E3F', marginBottom: '15px' }}>
              {typeof errorModal === 'object' ? errorModal.title || 'Notice' : 'Notice'}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '30px', lineHeight: '1.5' }}>
              {typeof errorModal === 'object' ? errorModal.message : errorModal}
            </p>
            <button onClick={() => {
              const onClose = typeof errorModal === 'object' ? errorModal.onClose : null;
              setErrorModal(null);
              if (onClose) onClose();
            }} style={{ ...s.submitBtn, backgroundColor: '#0B1E3F', padding: '15px', width: '100%' }}>Okay</button>
          </motion.div>
        </div>
      )}


    </div>
  );
}
