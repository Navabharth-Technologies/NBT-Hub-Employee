import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ArrowLeft, FileBadge, Send, Clock, CheckCircle2,
  AlertCircle, History, User, Calendar, Briefcase,
  FileText, Download, ShieldCheck, Shield, ChevronDown, Mail,
  MousePointer2, Keyboard, Monitor, Smartphone,
  Tablet, Camera, Database, Headphones, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../../config';

const cleanDisplayId = (id) => {
  if (!id) return 'N/A';
  let s = String(id).trim();

  // Handle comma-separated IDs (e.g., "20255,20255,20255" → "20255")
  if (s.includes(',')) {
    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    s = parts[0];
  }

  // Handle triple repetition (e.g., "202516202516202516" → "202516")
  if (s.length >= 6 && s.length % 3 === 0) {
    const partLen = s.length / 3;
    const p1 = s.substring(0, partLen);
    const p2 = s.substring(partLen, partLen * 2);
    const p3 = s.substring(partLen * 2);
    if (p1 === p2 && p1 === p3) return p1;
  }

  // Handle double repetition (e.g., "2025120251" → "20251")
  if (s.length >= 4 && s.length % 2 === 0) {
    const partLen = s.length / 2;
    const p1 = s.substring(0, partLen);
    const p2 = s.substring(partLen);
    if (p1 === p2) return p1;
  }

  return s;
};

const ServiceCertificateScreen = ({ onBack }) => {
  const { user } = useAuth();
  const { employeeId } = useParams();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [purpose, setPurpose] = useState('');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle'); // idle, success, error
  const [errorModal, setErrorModal] = useState(null);
  const [resignationStatus, setResignationStatus] = useState(null);
  const [isExitCompleted, setIsExitCompleted] = useState(false);
  const [checkingResignation, setCheckingResignation] = useState(true);
  const [showEntrancePopup, setShowEntrancePopup] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    empId: cleanDisplayId(user?.employee_id || user?.id),
    designation: user?.designation || user?.role || 'Member',
    role: user?.role || ''
  });

  useEffect(() => {
    const checkResignationAndExit = async () => {
      const uid = employeeId || user?.employee_id || user?.id;
      if (!uid) {
        setCheckingResignation(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';

        const getResignationStatusFromRecord = (activeRes) => {
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

          const hasNoTl = !activeRes.manager_id || Number(activeRes.manager_id) === 0;
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

          return isRejected ? 'REJECTED' : (isAllApproved ? 'APPROVED' : 'PENDING');
        };

        let url = API_ENDPOINTS.RESIGNATION_MY;
        const isOwn = !employeeId || employeeId === 'undefined' || employeeId === 'null' || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);
        if (!isOwn) {
          url = `${BASE_URL}/api/resignations?employee_id=${uid}`;
        }

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });

        if (res.ok) {
          const raw = await res.json();
          let data = Array.isArray(raw) ? raw : (raw.data || raw.value || []);

          if (!isOwn && !url.includes('employee_id')) {
            data = data.filter(r => String(r.employee_id || r.userId || r.user_id) === String(uid));
          }

          const activeRes = data.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || data[0];
          if (activeRes) {
            const finalStatus = getResignationStatusFromRecord(activeRes);
            setResignationStatus(finalStatus);
            if (finalStatus !== 'APPROVED' && isOwn) {
              setShowEntrancePopup(true);
            }

            const exitRes = await fetch(`${BASE_URL}/api/exit-formalities/resignation/${activeRes.id}`, {
              headers: { 'Authorization': `Bearer ${cleanToken}` }
            });
            if (exitRes.ok) {
              const exitData = await exitRes.json();
              if (exitData && (exitData.id || (Array.isArray(exitData) && exitData.length > 0))) {
                setIsExitCompleted(true);
              } else {
                setIsExitCompleted(false);
              }
            } else {
              setIsExitCompleted(false);
            }
          } else {
            setResignationStatus(null);
            setIsExitCompleted(false);
            if (isOwn) {
              setShowEntrancePopup(true);
            }
          }
        } else {
          if (!isOwn) {
            const allRes = await fetch(`${BASE_URL}/api/resignations`, {
              headers: { 'Authorization': `Bearer ${cleanToken}` }
            });
            if (allRes.ok) {
              const raw = await allRes.json();
              const data = (Array.isArray(raw) ? raw : (raw.data || raw.value || [])).filter(r => String(r.employee_id || r.userId || r.user_id) === String(uid));
              const activeRes = data.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || data[0];
              if (activeRes) {
                const finalStatus = getResignationStatusFromRecord(activeRes);
                setResignationStatus(finalStatus);
                if (finalStatus !== 'APPROVED' && isOwn) {
                  setShowEntrancePopup(true);
                }
                const exitRes = await fetch(`${BASE_URL}/api/exit-formalities/resignation/${activeRes.id}`, {
                  headers: { 'Authorization': `Bearer ${cleanToken}` }
                });
                if (exitRes.ok) {
                  const exitData = await exitRes.json();
                  if (exitData && (exitData.id || (Array.isArray(exitData) && exitData.length > 0))) {
                    setIsExitCompleted(true);
                  } else {
                    setIsExitCompleted(false);
                  }
                } else {
                  setIsExitCompleted(false);
                }
              } else {
                setResignationStatus(null);
                setIsExitCompleted(false);
                if (isOwn) {
                  setShowEntrancePopup(true);
                }
              }
            }
          } else {
            setResignationStatus(null);
            setIsExitCompleted(false);
            setShowEntrancePopup(true);
          }
        }
      } catch (err) {
        console.warn("Error checking resignation & exit status:", err);
      } finally {
        setCheckingResignation(false);
      }
    };
    checkResignationAndExit();
  }, [employeeId, user]);

  const formatDateTime = (ts) => {
    if (!ts) return 'N/A';
    try {
      const parts = ts.split('T');
      const datePart = parts[0];
      const timePart = parts[1] ? parts[1].split('.')[0] : '00:00:00';
      const [year, month, day] = datePart.split('-');
      const [hh, mm, ss] = timePart.split(':');
      let hour = parseInt(hh);
      const ampm = hour >= 12 ? 'pm' : 'am';
      hour = hour % 12;
      hour = hour ? hour : 12;
      const formattedTime = `${String(hour).padStart(2, '0')}:${mm}:${ss ? ss.substring(0, 2) : '00'} ${ampm}`;
      return `${year}/${month}/${day} at ${formattedTime}`;
    } catch (e) {
      return ts;
    }
  };



  const isOwnProfile = !employeeId || employeeId === 'undefined' || employeeId === 'null' || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
        const isOwn = !employeeId || employeeId === 'undefined' || employeeId === 'null' || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);
        const url = isOwn ? API_ENDPOINTS.MY_EMPLOYEE_PROFILE : `${BASE_URL}/api/profile/${employeeId || user?.email}`;
        const resp = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Accept': 'application/json'
          }
        });
        if (resp.ok) {
          const data = await resp.json();
          setProfileData({
            name: data.employee_name || data.name || user?.name,
            empId: cleanDisplayId(data.employee_id || data.id || user?.employee_id || user?.id),
            designation: data.designation || data.role || user?.designation || user?.role,
            role: data.role || user?.role || ''
          });
        }
      } catch (err) {
        console.error('Service Certificate Profile Sync Error:', err);
      }
    };
    fetchFullProfile();
  }, [user, employeeId]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const uid = employeeId || user?.employee_id || user?.id;
      if (!uid || uid === 'undefined' || uid === 'null') return;
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      const isOwn = !employeeId || employeeId === 'undefined' || employeeId === 'null' || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);
      const url = isOwn ? API_ENDPOINTS.SERVICE_CERTIFICATES_MY : API_ENDPOINTS.SERVICE_CERTIFICATES_USER(uid);
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${cleanToken}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching certificate history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    const uid = employeeId || user?.employee_id || user?.id;
    if (uid && uid !== 'N/A') {
      fetchHistory();
    }
  }, [employeeId, user?.employee_id, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalPurpose = purpose === 'Other' ? otherPurpose : purpose;
    if (!finalPurpose) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      const resp = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATES(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`
        },
        body: JSON.stringify({
          employee_id: profileData.empId,
          purpose: finalPurpose,
          designation_at_request: profileData.designation,
          status: 'Pending',
          laptop_details: assetForm.brand,
          asset_name: assetForm.brand,
          serial_number: assetForm.serial || '',
          serial_no: assetForm.serial || '',
          asset_serial_no: assetForm.serial || '',
          has_mouse: assetForm.mouse,
          has_keyboard: assetForm.keyboard,
          has_laptop_stand: assetForm.laptop_stand,
          mouse: assetForm.mouse,
          keyboard: assetForm.keyboard,
          laptop_stand: assetForm.laptop_stand,
          ruf_pad: assetForm.ruf_pad,
          pendrive: assetForm.pendrive,
          company_mobile: assetForm.company_mobile,
          external_camera: assetForm.external_camera,
          earphone_headphone: assetForm.earphone_headphone,
          tablet: assetForm.tablet
        })
      });

      if (resp.ok) {
        setRequestStatus('success');
        fetchHistory();
      } else {
        const errorData = await resp.json();
        setErrorModal(errorData.message || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Submission Error:', err);
      setErrorModal('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [assetForm, setAssetForm] = useState({
    brand: '',
    serial: '',
    mouse: false,
    keyboard: false,
    laptop_stand: false,
    company_mobile: false,
    external_camera: false,
    earphone_headphone: false,
    tablet: false,
    pendrive: false,
    ruf_pad: false
  });
  const [assetStatus, setAssetStatus] = useState(null);
  const [assetRecordId, setAssetRecordId] = useState(null);
  const [isAssetLoading, setIsAssetLoading] = useState(false);
  const [hasSubmittedAssets, setHasSubmittedAssets] = useState(false);
  const [isAssetSubmitting, setIsAssetSubmitting] = useState(false);
  const [assetSubmittedDate, setAssetSubmittedDate] = useState(null);

  useEffect(() => {
    const fetchCurrentAssets = async () => {
      const uid = employeeId || user?.employee_id || user?.id;
      if (!uid) return;

      setAssetForm({
        brand: '', serial: '', mouse: false, keyboard: false, laptop_stand: false,
        company_mobile: false, external_camera: false, earphone_headphone: false,
        tablet: false, pendrive: false, ruf_pad: false
      });
      setHasSubmittedAssets(false);
      setAssetStatus(null);
      setAssetRecordId(null);

      setIsAssetLoading(true);
      try {
        const token = localStorage.getItem('token');
        const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
        const isOwn = !employeeId || employeeId === 'undefined' || employeeId === 'null' || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);
        const historyUrl = isOwn ? API_ENDPOINTS.SERVICE_CERTIFICATES_MY : API_ENDPOINTS.SERVICE_CERTIFICATES_USER(uid);
        const [res, hRes] = await Promise.all([
          fetch(API_ENDPOINTS.MY_ASSETS(uid), {
            headers: { 'Authorization': `Bearer ${cleanToken}`, 'Accept': 'application/json' }
          }),
          fetch(historyUrl, {
            headers: { 'Authorization': `Bearer ${cleanToken}` }
          })
        ]);

        let fetchedHistory = [];
        if (hRes.ok) fetchedHistory = await hRes.json();

        if (res.ok) {
          const data = await res.json();
          const asset = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;

          if (asset && (asset.id || asset.employee_id || asset.laptop_details)) {
            const isT = (val) => {
              if (val === true || val === 1 || val === '1' || val === 'true') return true;
              return String(val || '').toLowerCase().trim() === 'yes';
            };

            let status = asset.status;
            let assetReq = null;

            if (Array.isArray(fetchedHistory)) {
              assetReq = fetchedHistory.find(h => h.purpose === 'Professional Asset Declaration');
              if (assetReq) status = assetReq.status;
            }

            const hasSubmitted = !!assetReq;

            setAssetForm({
              brand: asset.laptop_details || '',
              serial: asset.serial_no || '',
              mouse: hasSubmitted ? isT(asset.mouse) : false,
              keyboard: hasSubmitted ? isT(asset.keyboard) : false,
              laptop_stand: hasSubmitted ? isT(asset.laptop_stand) : false,
              company_mobile: hasSubmitted ? isT(asset.company_mobile || asset.mobile) : false,
              external_camera: hasSubmitted ? isT(asset.external_camera || asset.camera) : false,
              earphone_headphone: hasSubmitted ? isT(asset.earphone_headphone) : false,
              tablet: hasSubmitted ? isT(asset.tablet) : false,
              pendrive: hasSubmitted ? isT(asset.pendrive) : false,
              ruf_pad: hasSubmitted ? isT(asset.ruf_pad) : false
            });

            setAssetRecordId(assetReq ? assetReq.id : null);
            setAssetStatus(status || null);
            setAssetSubmittedDate(assetReq ? assetReq.created_at : (asset.created_at || asset.updated_at || null));
            setHasSubmittedAssets(hasSubmitted);
          } else {
            const assetReq = Array.isArray(fetchedHistory) && fetchedHistory.find(h => h.purpose === 'Professional Asset Declaration');
            if (assetReq) {
              setAssetStatus(assetReq.status);
              setAssetSubmittedDate(assetReq.created_at);
              setHasSubmittedAssets(true);
              setAssetRecordId(assetReq.id);
            } else {
              setHasSubmittedAssets(false);
              setAssetStatus(null);
              setAssetRecordId(null);
            }
          }
        }
      } catch (err) {
        console.error('Asset Fetch Error:', err);
      } finally {
        setIsAssetLoading(false);
      }
    };

    fetchCurrentAssets();
  }, [employeeId, user]);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleAssetSubmit = async (e) => {
    e.preventDefault();
    setIsAssetSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
      const resp = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATES(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${cleanToken}`
        },
        body: JSON.stringify({
          id: assetRecordId,
          employee_id: profileData.empId,
          purpose: 'Professional Asset Declaration',
          designation_at_request: profileData.designation,
          status: 'Pending Audit',
          admin_remark: 'Hardware Declaration Submitted',
          laptop_details: assetForm.brand,
          asset_name: assetForm.brand,
          serial_number: assetForm.serial || '',
          serial_no: assetForm.serial || '',
          asset_serial_no: assetForm.serial || '',
          mouse: assetForm.mouse,
          keyboard: assetForm.keyboard,
          laptop_stand: assetForm.laptop_stand,
          company_mobile: assetForm.company_mobile,
          external_camera: assetForm.external_camera,
          earphone_headphone: assetForm.earphone_headphone,
          tablet: assetForm.tablet,
          pendrive: assetForm.pendrive,
          ruf_pad: assetForm.ruf_pad,
          has_mouse: assetForm.mouse,
          has_keyboard: assetForm.keyboard,
          has_laptop_stand: assetForm.laptop_stand
        })
      });

      if (resp.ok) {
        setHasSubmittedAssets(true);
        setAssetStatus('Pending Audit');
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);
        fetchHistory();
      } else {
        let errMsg = 'Failed to submit hardware declaration.';
        try {
          const errText = await resp.text();
          try {
            const errData = JSON.parse(errText);
            errMsg = errData.message || errData.error || JSON.stringify(errData);
          } catch (e) {
            errMsg = `Status ${resp.status}: ${errText.substring(0, 50)}`;
          }
        } catch (e) { }
        setErrorModal(errMsg);
      }
    } catch (err) {
      console.error('Asset Submission Error:', err);
      setErrorModal('Network error or server is down. Please try again.');
    } finally {
      setIsAssetSubmitting(false);
    }
  };

  const s = {
    container: { padding: isMobile ? '15px' : (isTablet ? '25px' : '35px'), maxWidth: '100%', margin: '0', boxSizing: 'border-box' },
    header: { display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', marginBottom: '30px' },
    title: { fontSize: isMobile ? '22px' : '32px', fontWeight: '900', color: '#10274A', margin: 0 },
    card: { backgroundColor: 'white', borderRadius: '25px', padding: isMobile ? '20px' : (isTablet ? '30px' : '40px'), border: '1.5px solid #f1f5f9', boxShadow: '0 10px 40px rgba(0,0,0,0.02)', marginBottom: '25px' },
    sectionTitle: { fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: '#10274A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    label: { fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '10px', display: 'block' },
    select: { width: '100%', padding: '15px 20px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '15px', fontWeight: '600', color: '#000000', outline: 'none', appearance: 'none', backgroundColor: '#f8fafc' },
    textarea: { width: '100%', padding: '15px 20px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '15px', fontWeight: '600', color: '#000000', outline: 'none', minHeight: '120px', resize: 'none', backgroundColor: '#f8fafc' },
    submitBtn: { width: '100%', padding: '16px', borderRadius: '18px', backgroundColor: '#10274A', color: 'white', border: 'none', fontSize: isMobile ? '14px' : '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', marginTop: '10px' },
    historyCard: { padding: isMobile ? '15px' : '20px', borderRadius: '20px', border: '1.5px solid #f1f5f9', backgroundColor: '#fcfdfe', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '15px', gap: isMobile ? '15px' : '0' },
    statusBadge: (status) => ({
      padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
      backgroundColor: (status === 'Approved' || status === 'Completed') ? '#dcfce7' : (status === 'Pending' ? '#fef9c3' : '#fee2e2'),
      color: (status === 'Approved' || status === 'Completed') ? '#16a34a' : (status === 'Pending' ? '#a16207' : '#ef4444')
    })
  };

  if (requestStatus === 'success') {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#10274A', marginBottom: '15px' }}>Application Submitted!</h2>
          <p style={{ color: '#64748b', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 30px' }}>
            Your request for an Experience Letter has been sent to the HR department. You will be notified once it is processed.
          </p>
          <button style={{ ...s.submitBtn, width: 'auto', margin: '0 auto', padding: '15px 40px' }} onClick={() => setRequestStatus('idle')}>Apply Another</button>
          <button style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '700', marginTop: '20px', cursor: 'pointer' }} onClick={onBack}>Go Back to Profile</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <button onClick={onBack} style={{
          padding: isMobile ? '8px' : '12px',
          borderRadius: '12px',
          backgroundColor: 'white',
          border: '1.5px solid #e2e8f0',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <ArrowLeft size={isMobile ? 20 : 24} color="#0B1E3F" strokeWidth={3} />
        </button>
        <div>
          <h1 style={s.title}>Experience Letter</h1>
          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Request Official Experience Letter</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr' : '1.5fr 1fr'), gap: isMobile ? '20px' : '30px', width: '100%' }}>

        {/* Form Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={s.card}>
            <div style={s.sectionTitle}><FileBadge size={22} color="#10274A" /> Experience Letter Application</div>

            {!isOwnProfile ? (
              <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '15px', border: '1.5px solid #e2e8f0' }}>
                <Shield size={32} color="#64748b" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#10274A' }}>VIEW ONLY MODE</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Team Leaders can only view request history for their members.</div>
              </div>
            ) : checkingResignation ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ width: '24px', height: '24px', border: '3px solid #64748b40', borderTop: '3px solid #64748b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>Checking clearance status...</div>
              </div>
            ) : (resignationStatus !== 'APPROVED') ? (
              <div style={{
                padding: '30px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                borderRadius: '20px',
                border: '1.5px solid #fca5a5',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.03)',
                color: '#b91c1c'
              }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#dc2626' }}>
                  <AlertCircle size={28} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#991b1b', marginBottom: '8px' }}>Request Locked</h3>
                <p style={{ fontSize: '13px', color: '#991b1b90', lineHeight: '1.5', margin: 0, fontWeight: '600' }}>
                  Experience letter requests are only available after your resignation is approved by TL, PM, and HR, and exit formalities are fully completed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '25px' }}>
                  <label style={s.label}>Purpose of Request <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <select
                      style={{
                        ...s.select,
                        paddingRight: '44px',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        cursor: 'pointer',
                        color: '#000000'
                      }}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Purpose</option>
                      <option value="Higher Education">Higher Education</option>
                      <option value="New Job Opportunity">New Job Opportunity</option>
                      <option value="Personal Reasons">Personal Reasons</option>
                      <option value="Other">Other (Specify below)</option>
                    </select>
                    <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {purpose === 'Other' && (
                  <div style={{ marginBottom: '25px' }}>
                    <label style={s.label}>Specify Reason <span style={{ color: '#ef4444' }}>*</span></label>
                    <textarea
                      style={s.textarea}
                      placeholder="Describe why you need the certificate..."
                      value={otherPurpose}
                      onChange={(e) => setOtherPurpose(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Dynamic Employee Info (Read-only) */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '25px' }}>
                  <div style={{ padding: '16px 20px', backgroundColor: '#eef2ff', borderRadius: '16px', border: '1.5px solid #c7d2fe' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Position</div>
                    <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '800', color: '#10274A' }}>{profileData.designation}</div>
                  </div>
                  <div style={{ padding: '16px 20px', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1.5px solid #bbf7d0' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Employee ID</div>
                    <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '800', color: '#10274A', letterSpacing: '1px' }}>{profileData.empId}</div>
                  </div>
                </div>

                {/* Submit / Status Button */}
                {(() => {
                  const latestReq = history.find(h => h.purpose !== 'Professional Asset Declaration');
                  const reqStatus = latestReq ? String(latestReq.status || '').toLowerCase().trim() : '';
                  const isApproved = reqStatus === 'approved' || reqStatus === 'completed';
                  const alreadySubmitted = latestReq && !isApproved;

                  if (isApproved) {
                    return (
                      <motion.button type="button" disabled style={{ ...s.submitBtn, backgroundColor: '#16a34a', opacity: 1, cursor: 'default', boxShadow: '0 8px 24px rgba(22,163,74,0.25)' }}>
                        <Mail size={20} />
                        Sent in Email — Check Your Mail
                      </motion.button>
                    );
                  }

                  if (alreadySubmitted) {
                    return (
                      <motion.button type="button" disabled style={{ ...s.submitBtn, opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#64748b' }}>
                        <CheckCircle2 size={20} />
                        Application Already Submitted
                      </motion.button>
                    );
                  }

                  const canSubmit = hasSubmittedAssets && !!purpose && !isSubmitting;
                  return (
                    <motion.button
                      whileHover={canSubmit ? { scale: 1.02 } : {}}
                      whileTap={canSubmit ? { scale: 0.98 } : {}}
                      type="submit"
                      style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.55, cursor: canSubmit ? 'pointer' : 'not-allowed', backgroundColor: canSubmit ? '#10274A' : '#94a3b8' }}
                      disabled={!canSubmit}
                    >
                      {isSubmitting ? <Clock className="animate-spin" size={20} /> : (hasSubmittedAssets ? <Send size={20} /> : <ShieldCheck size={20} />)}
                      {isSubmitting ? 'Processing Request...' : (hasSubmittedAssets ? 'Submit Application' : 'Declare Assets to Unlock')}
                    </motion.button>
                  );
                })()}

                {/* Validation hints */}
                {!hasSubmittedAssets && (
                  <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={16} color="#b45309" />
                    <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '700' }}>Asset declaration is mandatory before applying for a service certificate.</span>
                  </div>
                )}
                {hasSubmittedAssets && !purpose && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={16} color="#e11d48" />
                    <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '700' }}>Please select a Purpose of Request to continue.</span>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Asset Submission Card */}
          {(isOwnProfile || hasSubmittedAssets) && (
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ ...s.sectionTitle, color: '#6366f1', marginBottom: 0 }}>
                  <Briefcase size={22} color="#6366f1" /> Professional Asset Declaration
                </div>
                {hasSubmittedAssets && assetStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{
                      padding: '6px 12px',
                      backgroundColor: (assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? '#f0fdf4' : '#fff7ed',
                      border: `1px solid ${(assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? '#bbf7d0' : '#ffedd5'}`,
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: (assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? '#10b981' : '#f59e0b' }}></div>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: (assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? '#166534' : '#9a3412', textTransform: 'uppercase' }}>
                        {(assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? 'VERIFIED' : assetStatus}
                      </span>
                    </div>
                    {assetSubmittedDate && (
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>
                        Saved on {(() => { const d = new Date(assetSubmittedDate); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
                {hasSubmittedAssets
                  ? "Your asset audit is complete. These details are now part of your official record."
                  : "Please declare the assets currently assigned to you for our audit records."}
              </div>

              <form onSubmit={handleAssetSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={s.label}>Laptop Brand / Model <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      style={s.select}
                      placeholder="e.g. RedmiBook 15 Pro, 8GB/256GB"
                      value={assetForm.brand}
                      onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={s.label}>Serial Number <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      style={s.select}
                      placeholder="e.g. PF5P6L2E"
                      value={assetForm.serial}
                      onChange={(e) => setAssetForm({ ...assetForm, serial: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '24px', marginBottom: '25px', border: '1.5px solid #f1f5f9' }}>
                  <label style={{ ...s.label, marginBottom: '20px', color: '#10274A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#6366f1" /> Hardware Peripherals Verified
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Optical Mouse', key: 'mouse', icon: <MousePointer2 size={16} /> },
                      { label: 'External Keyboard', key: 'keyboard', icon: <Keyboard size={16} /> },
                      { label: 'Laptop Stand', key: 'laptop_stand', icon: <Monitor size={16} /> },
                      { label: 'Company Mobile', key: 'company_mobile', icon: <Smartphone size={16} /> },
                      { label: 'Earphones', key: 'earphone_headphone', icon: <Headphones size={16} /> },
                      { label: 'External Camera', key: 'external_camera', icon: <Camera size={16} /> },
                      { label: 'Tablet', key: 'tablet', icon: <Tablet size={16} /> },
                      { label: 'Pendrive / Storage', key: 'pendrive', icon: <Database size={16} /> },
                      { label: 'Ruf Pad / Notebook', key: 'ruf_pad', icon: <FileText size={16} /> }
                    ].map(item => {
                      const active = assetForm[item.key];
                      return (
                        <div
                          key={item.key}
                          onClick={() => setAssetForm({ ...assetForm, [item.key]: !active })}
                          style={{
                            padding: '12px 8px',
                            borderRadius: '15px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: `1.5px solid ${active ? '#10B981' : '#000000'}`,
                            backgroundColor: active ? '#f0fdf4' : 'white',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: active ? '0 4px 12px rgba(16, 185, 129, 0.08)' : 'none',
                            color: active ? '#10B981' : '#000000',
                            opacity: 1,
                            minHeight: '80px'
                          }}
                        >
                          {active ? <CheckCircle2 size={18} /> : item.icon}
                          <span style={{ fontSize: '11px', fontWeight: '800', textAlign: 'center', lineHeight: '1.2' }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <motion.button
                  whileHover={!isAssetSubmitting ? { scale: 1.01 } : {}}
                  whileTap={!isAssetSubmitting ? { scale: 0.98 } : {}}
                  type="submit"
                  disabled={isAssetSubmitting}
                  style={{
                    width: '100%',
                    padding: '18px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: isAssetSubmitting ? '#94a3b8' : (hasSubmittedAssets ? '#6366f1' : '#10B981'),
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: isAssetSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: isAssetSubmitting ? 'none' : (hasSubmittedAssets ? '0 10px 25px rgba(99,102,241,0.2)' : '0 10px 25px rgba(16,185,129,0.2)')
                  }}
                >
                  {isAssetSubmitting ? (
                    <>
                      <div style={{ width: '18px', height: '18px', border: '3px solid #ffffff40', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Syncing with Audit...
                    </>
                  ) : (
                    <>
                      <Shield size={18} />
                      {hasSubmittedAssets ? 'Update Hardware Declaration' : 'Finalize Hardware Declaration'}
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          )}

          {/* Success Notification Popup */}
          <AnimatePresence>
            {showSuccessPopup && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                  backgroundColor: 'white',
                  padding: '30px',
                  borderRadius: '30px',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '15px',
                  minWidth: '280px',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={32} color="#10b981" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Success!</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Asset declaration stored successfully</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar: Guidelines & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ ...s.card, padding: '30px' }}>
            <div style={{ ...s.sectionTitle, fontSize: '16px' }}><ShieldCheck size={20} color="#16a34a" /> Guidelines</div>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {[
                'Standard processing time is 3-5 working days.',
                'Certificates will be issued in digital (PDF) format.',
                'Tenure must be at least 6 months for experience letters.',
                'Management approval is required for all requests.'
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                  <div style={{ minWidth: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a', marginTop: '6px' }} />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#10274A', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} /> Request History
            </div>

            {isLoadingHistory ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                <Clock className="animate-spin" size={24} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '13px', fontWeight: '600' }}>Loading history...</div>
              </div>
            ) : (() => {
              const certHistory = history.filter(item => item.purpose !== 'Professional Asset Declaration');
              return certHistory.length === 0 ? (
                <div style={{ ...s.card, padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                  <FileText size={40} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>No requests yet</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>Your certificate applications will appear here.</div>
                </div>
              ) : (
                certHistory.map((item, idx) => (
                  <div key={item.id} style={s.historyCard}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Service Certificate</div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#6366f1', backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: '8px' }}>
                          #{String(item.id || (idx + 1)).padStart(4, '0')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: '700' }}>
                          Name: <span style={{ fontWeight: '500', color: '#475569' }}>{item.employee_name || item.name || profileData.name}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: '700' }}>
                          Employee ID: <span style={{ fontWeight: '500', color: '#475569' }}>{item.employee_id || profileData.empId}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: '700' }}>
                          Reason: <span style={{ fontWeight: '500', color: '#475569' }}>{item.purpose}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                        Submitted on {formatDateTime(item.created_at || item.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <div style={s.statusBadge(item.status)}>{item.status}</div>
                      {(item.status === 'Approved' || item.status === 'Completed') && item.file_path && (
                        <button
                          onClick={() => window.open(`${BASE_URL}/${item.file_path}`, '_blank')}
                          style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Download size={12} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                ))
              );
            })()}
          </div>
        </div>
      </div>

      {/* Entrance Warning Modal */}
      <AnimatePresence>
        {showEntrancePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{
                backgroundColor: 'white',
                borderRadius: '28px',
                padding: '40px 30px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                border: '1px solid #f1f5f9',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <AlertCircle size={32} />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '900',
                color: '#0f172a',
                marginBottom: '16px',
                lineHeight: '1.3'
              }}>
                Resignation Approval Required
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#475569',
                lineHeight: '1.6',
                marginBottom: '32px',
                fontWeight: '600'
              }}>
                You should get approval for your resignation first then only you can apply for experience letter.
              </p>
              <button
                onClick={() => setShowEntrancePopup(false)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1e293b'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0f172a'}
              >
                Okay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '400px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              {typeof errorModal === 'object' && errorModal.isSuccess ? (
                <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Check size={30} />
                </div>
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <AlertCircle size={30} />
                </div>
              )}
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#10274A', marginBottom: '15px' }}>
                {typeof errorModal === 'object' ? errorModal.title || 'Notice' : 'Notice'}
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '30px', lineHeight: '1.5' }}>
                {typeof errorModal === 'object' ? errorModal.message : errorModal}
              </p>
              <button onClick={() => {
                const onClose = typeof errorModal === 'object' ? errorModal.onClose : null;
                setErrorModal(null);
                if (onClose) onClose();
              }} style={{ ...s.submitBtn, backgroundColor: '#10274A', padding: '15px', width: '100%', marginTop: 0 }}>Okay</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceCertificateScreen;