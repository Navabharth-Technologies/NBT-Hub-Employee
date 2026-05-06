import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, FileBadge, Send, Clock, CheckCircle2,
  AlertCircle, History, User, Calendar, Briefcase,
  FileText, Download, ShieldCheck, Shield,
  MousePointer2, Keyboard, Monitor, Smartphone,
  Tablet, Camera, Database, Headphones
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../../config';

const ExperienceLetter = ({ onBack }) => {
  const { user } = useAuth();
  const { employeeId } = useParams();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [purpose, setPurpose] = useState('');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState('idle'); // idle, success, error
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    empId: user?.employee_id || user?.id || 'N/A',
    designation: user?.designation || user?.role || 'Member',
    role: user?.role || ''
  });

  const formatDateTime = (ts) => {
    if (!ts) return 'N/A';
    try {
      // Manual parsing to avoid timezone shifts: YYYY-MM-DD HH:mm:ss
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
      
      return `${day}/${month}/${year} at ${formattedTime}`;
    } catch (e) {
      return ts;
    }
  };

  const cleanDisplayId = (id) => {
    if (!id) return 'N/A';
    const s = String(id).trim();
    if (s.length >= 6 && s.length % 3 === 0) {
      const partLen = s.length / 3;
      const p1 = s.substring(0, partLen);
      const p2 = s.substring(partLen, partLen * 2);
      const p3 = s.substring(partLen * 2);
      if (p1 === p2 && p1 === p3) return p1;
    }
    return s;
  };

  const isOwnProfile = !employeeId || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const isOwn = !employeeId || String(employeeId) === String(user?.employee_id) || String(employeeId) === String(user?.id);
        const url = isOwn ? API_ENDPOINTS.MY_EMPLOYEE_PROFILE : `${BASE_URL}/api/profile/${employeeId || user?.email}`;
        const resp = await fetch(url, {
          headers: { 
            'Authorization': `Bearer ${token?.trim()}`,
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
      if (!uid) return;
      
      const token = localStorage.getItem('token');
      const resp = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATES_USER(uid), {
        headers: { 'Authorization': `Bearer ${token}` }
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
      const resp = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATES(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
        fetchHistory(); // Refresh history after successful submission
      } else {
        const errorData = await resp.json();
        alert(errorData.message || 'Failed to submit application');
      }
    } catch (err) {
      console.error('Submission Error:', err);
      alert('An error occurred. Please try again.');
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
        const [res, hRes] = await Promise.all([
          fetch(API_ENDPOINTS.MY_ASSETS(uid), {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
          }),
          fetch(API_ENDPOINTS.SERVICE_CERTIFICATES_USER(uid), {
            headers: { 'Authorization': `Bearer ${token}` }
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
            
            setAssetRecordId(asset.id);
            setAssetForm({
              brand: asset.laptop_details || '',
              serial: asset.serial_no || '', 
              mouse: isT(asset.mouse),
              keyboard: isT(asset.keyboard),
              laptop_stand: isT(asset.laptop_stand),
              company_mobile: isT(asset.company_mobile || asset.mobile),
              external_camera: isT(asset.external_camera || asset.camera),
              earphone_headphone: isT(asset.earphone_headphone),
              tablet: isT(asset.tablet),
              pendrive: isT(asset.pendrive),
              ruf_pad: isT(asset.ruf_pad)
            });
            
            let status = asset.status;
            let assetReq = null;
            
            if (Array.isArray(fetchedHistory)) {
              assetReq = fetchedHistory.find(h => h.purpose === 'Professional Asset Declaration');
              if (assetReq) status = assetReq.status;
            }

            setAssetStatus(status || null);
            setAssetSubmittedDate(assetReq ? assetReq.created_at : (asset.created_at || asset.updated_at || null));
            
            // Only consider it "submitted" if there's an actual entry in the certificate requests table
            setHasSubmittedAssets(!!assetReq);
          } else {
            // Final check: even if no master asset record, check service_certificate_requests table
            const assetReq = Array.isArray(fetchedHistory) && fetchedHistory.find(h => h.purpose === 'Professional Asset Declaration');
            if (assetReq) {
              setAssetStatus(assetReq.status);
              setAssetSubmittedDate(assetReq.created_at);
              setHasSubmittedAssets(true);
            } else {
              setHasSubmittedAssets(false);
              setAssetStatus(null);
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
      const resp = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATES(assetRecordId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
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
        fetchHistory(); // Refresh history list since it's now in the same table
      }
    } catch (err) {
      console.error('Asset Submission Error:', err);
    } finally {
      setIsAssetSubmitting(false);
    }
  };

  const s = {
    container: { padding: isMobile ? '15px' : (isTablet ? '25px' : '35px'), maxWidth: '100%', margin: '0', boxSizing: 'border-box' },
    header: { display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', marginBottom: '30px' },
    backBtn: { padding: '10px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: isMobile ? '22px' : '32px', fontWeight: '900', color: '#10274A', margin: 0 },

    card: { backgroundColor: 'white', borderRadius: '25px', padding: isMobile ? '20px' : (isTablet ? '30px' : '40px'), border: '1.5px solid #f1f5f9', boxShadow: '0 10px 40px rgba(0,0,0,0.02)', marginBottom: '25px' },
    sectionTitle: { fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: '#10274A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },

    label: { fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '10px', display: 'block' },
    select: { width: '100%', padding: '15px 20px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '15px', fontWeight: '600', color: '#1e293b', outline: 'none', appearance: 'none', backgroundColor: '#f8fafc' },
    textarea: { width: '100%', padding: '15px 20px', borderRadius: '15px', border: '1.5px solid #e2e8f0', fontSize: '15px', fontWeight: '600', color: '#1e293b', outline: 'none', minHeight: '120px', resize: 'none', backgroundColor: '#f8fafc' },

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
        <motion.button whileHover={{ scale: 1.05 }} style={s.backBtn} onClick={onBack}><ChevronLeft size={24} color="#10274A" /></motion.button>
        <div>
          <h1 style={s.title}>Experience Letter</h1>
          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Request official service certificate</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr' : '1.5fr 1fr'), gap: isMobile ? '20px' : '30px', width: '100%' }}>

        {/* Form Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Service Certificate Application Card - ONLY show if assets are submitted (or view-only mode) */}
          {(hasSubmittedAssets || !isOwnProfile) && (
            <div style={{ ...s.card, order: hasSubmittedAssets ? 1 : 2 }}>
              <div style={s.sectionTitle}><FileBadge size={22} color="#10274A" /> Service Certificate Application</div>

              {!isOwnProfile ? (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '15px', border: '1.5px solid #e2e8f0' }}>
                  <Shield size={32} color="#64748b" style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#10274A' }}>VIEW ONLY MODE</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Team Leaders can only view request history for their members.</div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '25px' }}>
                    <label style={s.label}>Purpose of Request <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                      style={s.select}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      required
                    >
                      <option value="">Select Purpose</option>
                      <option value="Higher Education">Higher Education</option>
                      <option value="Bank Loan / Financial">Bank Loan / Financial</option>
                      <option value="Visa / Immigration">Visa / Immigration</option>
                      <option value="Job Change">Internal Movement / Job Change</option>
                      <option value="Other">Other (Specify below)</option>
                    </select>
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
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '25px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Position</div>
                      <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '700', color: '#1e293b' }}>{profileData.designation}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Employee ID</div>
                      <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '700', color: '#1e293b' }}>{profileData.empId}</div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      ...s.submitBtn,
                      opacity: (isSubmitting || history.length > 0) ? 0.6 : 1,
                      cursor: (isSubmitting || history.length > 0) ? 'not-allowed' : 'pointer',
                      backgroundColor: '#10274A'
                    }}
                    disabled={isSubmitting || history.length > 0}
                  >
                    {isSubmitting ? <Clock className="animate-spin" size={20} /> : (
                      history.length > 0 ? <CheckCircle2 size={20} /> : <Send size={20} />
                    )}
                    {isSubmitting ? 'Processing Request...' : (
                      history.length > 0 ? 'Application Already Submitted' : 'Submit Application'
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          )}

          {/* Asset Submission Card */}
          {(isOwnProfile || hasSubmittedAssets) && (
            <div style={{ ...s.card, order: hasSubmittedAssets ? 2 : 1 }}>
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
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: (assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? '#10b981' : '#f59e0b' 
                      }}></div>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        color: (assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? '#166534' : '#9a3412', 
                        textTransform: 'uppercase' 
                      }}>
                        {(assetStatus === 'Approved' || assetStatus === 'Verified' || assetStatus === 'Yes') ? 'VERIFIED' : assetStatus}
                      </span>
                    </div>
                    {assetSubmittedDate && (
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>
                        Saved on {new Date(assetSubmittedDate).toLocaleDateString()}
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
                            border: `1.5px solid ${active ? '#10B981' : '#e2e8f0'}`,
                            backgroundColor: active ? '#f0fdf4' : 'white',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: active ? '0 4px 12px rgba(16, 185, 129, 0.08)' : 'none',
                            color: active ? '#10B981' : '#cbd5e1',
                            opacity: active ? 1 : 0.4,
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
                  whileHover={(!isAssetSubmitting && !hasSubmittedAssets) ? { scale: 1.01 } : {}}
                  whileTap={(!isAssetSubmitting && !hasSubmittedAssets) ? { scale: 0.98 } : {}}
                  type="submit"
                  disabled={isAssetSubmitting || hasSubmittedAssets}
                  style={{
                    width: '100%',
                    padding: '18px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: (isAssetSubmitting || hasSubmittedAssets) ? '#94a3b8' : '#10B981',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: (isAssetSubmitting || hasSubmittedAssets) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)'
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
            ) : history.length === 0 ? (
              <div style={{ ...s.card, padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <FileText size={40} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>No requests yet</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>Your certificate applications will appear here.</div>
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} style={s.historyCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Service Certificate</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>
                      Purpose: {item.purpose}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>
                      {formatDateTime(item.created_at || item.createdAt)}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceLetter;
