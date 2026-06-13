import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle, FileText, AlertCircle, Calendar, Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';

// Resolve relative media paths (video/PDF) to absolute using the API base URL
// Automatically corrects hardcoded localhost references to match the BASE_URL host
const resolveMediaUrl = (url) => {
  if (!url) return null;
  let finalUrl = String(url).replace(/\\/g, '/');

  // If backend saved 'localhost' but app is running on a network IP
  if (finalUrl.includes('localhost') && BASE_URL && !BASE_URL.includes('localhost')) {
    const baseIp = BASE_URL.replace(/https?:\/\//, '').split(':')[0];
    finalUrl = finalUrl.replace('localhost', baseIp);
  }

  if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) return finalUrl;
  return `${BASE_URL}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
};

const cleanMediaUrl = (url) => {
  if (!url) return null;
  const normalized = String(url).trim().replace(/\\/g, '/');
  const lower = normalized.toLowerCase();
  if (lower === '' || lower === 'null' || lower === 'undefined') return null;
  if (lower.endsWith('/null') || lower.endsWith('/undefined')) return null;
  return normalized;
};

const TraineeDashboard = () => {
  const { user, setUser, logout, isBlocked, refreshUser, updateProfile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const fileInputRef = useRef(null);
  // Redundant showBlocked removed — now using global isBlocked from AuthContext
  const fetchDataRef = useRef(null); // stable ref so BroadcastChannel closure always calls latest

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (e.target.closest('[title="Logout Securely"]')) return;
      const photoContainer = e.target.closest('[title="My Documents & Profile"]');
      if (photoContainer) {
        setShowProfileMenu(prev => !prev);
      } else if (!e.target.closest('#joinee-profile-menu')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    fetchData();

    // Listen for completion signal from the video-player tab (BroadcastChannel)
    let bc;
    try {
      bc = new BroadcastChannel('trainee_video_complete');
      bc.onmessage = (e) => {
        if (e.data?.type === 'VIDEO_COMPLETED') {
          console.log('[TraineeDash] BroadcastChannel: Video completed, refreshing...');
          // Use ref to avoid stale closure
          if (fetchDataRef.current) fetchDataRef.current();
        }
      };
    } catch (err) {
      console.warn('[TraineeDash] BroadcastChannel not supported.');
    }

    // Fallback: refresh when user switches back to this tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[TraineeDash] Tab focused — refreshing data...');
        if (fetchDataRef.current) fetchDataRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (bc) bc.close();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const fetchData = async () => {
    // Attempt multiple ID sources: user.id (preferred), user.employee_id, etc.
    const resolvedUid = user?.empId || user?.employee_id || user?.id || user?.userId || 1;
    console.log("[TraineeDash] UID resolution:", resolvedUid);

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token && token !== 'undefined') {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const [detailRes, enrollmentRes, masterRes] = await Promise.allSettled([
        fetch(API_ENDPOINTS.NEW_JOINEE_DETAIL(resolvedUid), { headers }),
        fetch(API_ENDPOINTS.NEW_JOINEE_COURSES(resolvedUid), { headers }), // ?joineeId=ID
        fetch(API_ENDPOINTS.NEW_JOINEE_COURSES_BASE, { headers }) // Global list fallback (completed will be 0 for all)
      ]);

      let detail = null;
      if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
        detail = await detailRes.value.json();
        if (detail && setUser) {
          setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, role: detail.role || detail.designation || prev.role, name: detail.name || prev.name };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
          });
        }
      }

      let enrollmentArr = [];
      if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value.ok) {
        const raw = await enrollmentRes.value.json();
        enrollmentArr = Array.isArray(raw) ? raw : (raw.value || raw.data || []);
        console.log("[TraineeDash] Specific enrollment count:", enrollmentArr.length);
      }

      let globalArr = [];
      if (masterRes.status === 'fulfilled' && masterRes.value.ok) {
        const raw = await masterRes.value.json();
        globalArr = Array.isArray(raw) ? raw : (raw.value || raw.data || []);
        console.log("[TraineeDash] Global onboarding courses found:", globalArr.length);
      }

      // Merge Logic: Prioritize specific enrollment, then global list
      let finalArr = [];
      const sourceArr = enrollmentArr.length > 0 ? enrollmentArr : globalArr;

      finalArr = sourceArr.map(item => {
        const rawPdf = item.pdf_url || item.pdf || item.pdfUrl || item.pdf_path || item.file || item.document || item.file_url || item.document_url || item.doc_url || null;
        const rawVideo = item.video_url || item.video || item.videoUrl || item.video_link || item.link || item.video_path || item.media_url || null;
        const cleanedPdf = cleanMediaUrl(rawPdf);
        const cleanedVideo = cleanMediaUrl(rawVideo);
        return {
          ...item,
          id: item.id,
          title: item.title || 'Untitled Mission',
          description: item.description,
          deadline: item.deadline,
          category: item.category || 'TECHNICAL',
          pdf_url: cleanedPdf,
          pdf: cleanedPdf,
          video_url: cleanedVideo,
          video: cleanedVideo,
          status: item.status || 'Not Started',
          uploaderName: item.uploaded_by || 'HR'
        };
      });

      setCourses(finalArr);

      // --- 10-DAY BLOCK LOGIC ---
      // Step 1: Try to get joining_date from the detail endpoint
      // Step 2: Fallback — scan the new-joinees list and match by email/id to get their joining_date
      let joiningDateStr = detail?.joining_date || detail?.created_at || user?.joining_date || user?.created_at;

      if (!joiningDateStr) {
        try {
          const joineeListRes = await fetch(API_ENDPOINTS.NEW_JOINEES_GET, { headers });
          if (joineeListRes.ok) {
            const joineeList = await joineeListRes.json();
            const arr = Array.isArray(joineeList) ? joineeList : (joineeList?.value || joineeList?.data || []);
            const match = arr.find(j => {
              const jEmail = String(j?.email || j?.email_id || '').toLowerCase();
              const jId = String(j?.id || j?.employee_id || '');
              return jEmail === String(user?.email || '').toLowerCase() || jId === String(resolvedUid);
            });
            joiningDateStr = match?.joining_date || match?.created_at || match?.join_date;
            console.log('[TraineeDash] Joining date from list:', joiningDateStr, '| match:', match);
          }
        } catch (e) { console.error('[TraineeDash] Joinee list date fetch failed:', e); }
      }

      // Step 3: If still not found, cannot determine — don't block
      const startDate = joiningDateStr ? new Date(joiningDateStr) : null;
      const today = new Date();
      const diffDays = startDate ? Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) : 0;
      console.log('[TraineeDash] diffDays:', diffDays, '| joiningDate:', joiningDateStr);

      // Blocking logic is now handled globally by AuthContext
      // This fetchData still updates local course data
    } catch (err) {
      console.error("[TraineeDash] Critical sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
        let newImg = null;
        try {
           const data = await res.json();
           newImg = data.profileImage || data.profile_pic || data.profile_picture || data.avatar;
        } catch(e) {}
        
        if (newImg) {
           updateProfile('profileImage', newImg);
        } else {
           if (refreshUser) refreshUser();
        }
        alert('Profile picture updated successfully!');
      } else {
        alert('Failed to upload image.');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert('Network error during upload.');
    }
    // Clear the input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowProfileMenu(false);
  };

  const handleRemoveImage = async () => {
    try {
      const targetEmail = (user?.email || '').toLowerCase();
      const uid = user?.employee_id || user?.id || user?.userId;
      const payload = { 
        email: targetEmail, 
        userId: uid,
        profile_image: null,
        profileImage: null
      };

      const syncHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };

      await fetch(`${API_ENDPOINTS.UPDATE_PROFILE}?email=${encodeURIComponent(targetEmail)}`, {
        method: 'PUT',
        headers: syncHeaders,
        body: JSON.stringify(payload)
      });
      await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'POST',
        headers: syncHeaders,
        body: JSON.stringify(payload)
      });

      updateProfile('profileImage', null);
      alert('Profile picture removed!');
    } catch (e) {
      console.error(e);
      alert('Network error while removing image.');
    }
    setShowProfileMenu(false);
  };

  // Keep ref in sync so BroadcastChannel & visibilitychange always call the latest version
  fetchDataRef.current = fetchData;

  const handleStart = async (courseId) => {
    const uid = user?.empId || user?.employee_id || user?.id || user?.userId || 1;
    try {
      await fetch(API_ENDPOINTS.UPDATE_JOINEE_COURSE(courseId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In Progress', joineeId: uid })
      });
      // Refresh to show 'In Progress' pill
      fetchData();
    } catch (e) {
      console.error("[TraineeDash] handleStart update failed:", e);
    }
  };

  const handleComplete = async (courseId) => {
    const uid = user?.empId || user?.employee_id || user?.id || user?.userId || 1;
    try {
      // 1. Mark the course as completed in the enrollments/assignments table
      const res = await fetch(API_ENDPOINTS.UPDATE_JOINEE_COURSE(courseId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed', joineeId: uid })
      });

      if (res.ok) {
        // 2. Fetch latest courses to calculate NEW overall percentage
        const coursesResp = await fetch(API_ENDPOINTS.NEW_JOINEE_COURSES(uid));
        if (coursesResp.ok) {
          const raw = await coursesResp.json();
          const list = Array.isArray(raw) ? raw : (raw.data || []);

          if (list.length > 0) {
            const completedCount = list.filter(c => c.status === 'Completed').length;
            // Add 1 if the current update hasn't reflected in the list yet (safety)
            const totalCount = list.length;
            const newPercentage = Math.round((completedCount / totalCount) * 100);

            // 3. Update the main Joinee record with the overall percentage
            await fetch(API_ENDPOINTS.NEW_JOINEE_DETAIL(uid), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ course_completion: newPercentage })
            });
          }
        }

        // 4. Finally, refresh the dashboard UI
        fetchData();
      }
    } catch (e) {
      console.error("[TraineeDash] handleComplete update failed:", e);
    }
  };

  const handleClosePdf = async () => {
    if (activeCourse) {
      if (String(activeCourse.status).toLowerCase() !== 'completed') {
        await handleComplete(activeCourse.id);
      }
    }
    setActivePdfUrl(null);
    setActiveCourse(null);
  };

  const openVideoInNewTab = (course) => {
    if (String(course.status).toLowerCase() === 'not started' || !course.status || String(course.status).toLowerCase() === 'pending') {
      handleStart(course.id);
    }
    const uid = user?.empId || user?.employee_id || user?.id || user?.userId || 1;
    const videoSrc = resolveMediaUrl(course.video_url || course.video);
    const params = new URLSearchParams({
      url: videoSrc,
      courseId: course.id,
      title: course.title || '',
      desc: course.description || '',
      apiBase: BASE_URL,
      uid: uid
    });
    const basePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
    window.open(`${basePath}video-player.html?${params.toString()}`, '_blank');
  };

  if (activePdfUrl) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        {/* Header bar */}
        <div style={{
          height: '70px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          zIndex: 10
        }}>
          <button
            onClick={handleClosePdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0f172a',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '900',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
              transition: 'all 0.2s'
            }}
          >
            ← Back to Home
          </button>
          <span style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
            {activeCourse?.title || 'Document Viewer'}
          </span>
          <div style={{ width: '120px' }}></div>
        </div>

        {/* PDF Iframe */}
        <div style={{ flex: 1, backgroundColor: '#525659' }}>
          <iframe
            src={activePdfUrl}
            title={activeCourse?.title || 'PDF Document'}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }} />
    </div>
  );

  // --- BLOCKED ACCESS SCREEN ---
  if (isBlocked) return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: '500px', textAlign: 'center', background: 'white', padding: '50px', borderRadius: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px auto' }}>
          <AlertCircle size={40} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '15px' }}>Access Blocked</h1>
        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '35px' }}>
          Your 10-day training window has expired. Workforce security protocols have automatically restricted your access until the assigned curriculum is mastered.
        </p>
        <button
          onClick={() => window.location.href = 'mailto:hr@nbthub.com'}
          style={{ width: '100%', padding: '18px', borderRadius: '18px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '900', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Contact HR for reactivation
        </button>
        <button onClick={logout} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#94a3b8', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>
          Log Out Account
        </button>
      </motion.div>
    </div>
  );

  const cardStyle = {
    background: 'white',
    borderRadius: '24px',
    padding: '28px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  return (
    <div style={{ padding: window.innerWidth < 768 ? '20px 15px' : '30px 40px', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      <AnimatePresence>
        {showProfileMenu && (
          <motion.div
            id="joinee-profile-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: window.innerWidth < 768 ? '65px' : '90px',
              right: window.innerWidth < 768 ? '15px' : '30px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
              padding: '10px',
              zIndex: 9999,
              width: '200px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <button onClick={() => { setShowProfileMenu(false); setShowProfileModal(true); }} style={{ padding: '12px', background: 'none', border: 'none', textAlign: 'left', fontWeight: '800', color: '#0f172a', cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>View Profile</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px', background: 'none', border: 'none', textAlign: 'left', fontWeight: '800', color: '#0f172a', cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>Add Profile</button>
            <button onClick={handleRemoveImage} style={{ padding: '12px', background: 'none', border: 'none', textAlign: 'left', fontWeight: '800', color: '#ef4444', cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>Remove Profile</button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleImageUpload}
      />

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}
            >
              <button 
                onClick={() => setShowProfileModal(false)}
                style={{ 
                  position: 'absolute', top: '-15px', right: '-15px', 
                  background: 'white', border: 'none', width: '36px', height: '36px', 
                  borderRadius: '50%', cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', color: '#333', zIndex: 10
                }}
              >✕</button>

              <div style={{ 
                width: '300px', height: '300px', borderRadius: '50%', 
                overflow: 'hidden', border: '5px solid white',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)', background: '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {user?.profileImage || user?.profile_image ? (
                  <img src={resolveMediaUrl(user.profileImage || user.profile_image)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: '100px', color: '#94a3b8', fontWeight: 'bold' }}>
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: '100%', margin: '0 auto' }}>

        {/* Progress Overview Section */}
        {!loading && courses.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '32px',
            padding: '35px 50px',
            marginBottom: '40px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.02)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '40px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#081e3cff', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>
                    Overall Progress <span style={{ color: '#3b82f6', marginLeft: '8px' }}>{Math.round((courses.filter(c => String(c.status).toLowerCase() === 'completed').length / (courses.length || 1)) * 100)}%</span>
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6' }}>
                    {courses.filter(c => String(c.status).toLowerCase() === 'completed').length} / {courses.length} Tasks
                  </span>
                </div>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(courses.filter(c => String(c.status).toLowerCase() === 'completed').length / courses.length) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ textAlign: 'center', padding: '0 20px', borderRight: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{courses.length}</div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>Courses</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>{courses.filter(c => String(c.status).toLowerCase() === 'completed').length}</div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>Completed</div>
              </div>
            </div>
          </div>
        )}

        <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#041835ff', marginBottom: '30px', }}>
          Assigned to <span style={{ color: '#051d43ff' }}>You</span>
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px' }}>
          {courses.map(course => (
            <div key={course.id} style={cardStyle}>
              {/* Category and Deadline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ background: course.category === 'TECHNICAL' ? '#fee2e2' : '#eff6ff', color: course.category === 'TECHNICAL' ? '#ef4444' : '#3b82f6', padding: '4px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '800' }}>
                  {course.category || 'Technical'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#121822ff', fontSize: '11px', fontWeight: '700' }}>
                  <Calendar size={13} /> Deadline: {course.deadline ? (() => { const p = String(course.deadline).split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : course.deadline; })() : 'No Date'}
                </div>
              </div>
              {/* Course Title and Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0 }}>{course.title}</h2>
                <div style={{
                  background: String(course.status).toLowerCase() === 'completed' ? '#dcfce7' :
                    String(course.status).toLowerCase() === 'in progress' ? '#dbeafe' : '#fef3c7',
                  color: String(course.status).toLowerCase() === 'completed' ? '#063e1bff' :
                    String(course.status).toLowerCase() === 'in progress' ? '#2563eb' : '#d97706',
                  padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                  transition: 'all 0.4s'
                }}>
                  {course.status || 'Not started'}
                </div>
              </div>

              {/* Course Description */}
              <p style={{ fontSize: '13px', color: '#394d69ff', margin: '5px 0' }}>
                {course.description}
              </p>

              {/* Uploader Metadata */}
              <div style={{ color: '#0e1722ff', fontSize: '13px', fontWeight: '800', marginTop: '5px' }}>
                Upload by {course.uploaderName || course.uploaded_by || 'HR'}
              </div>

              {/* Media Button Content */}
              <div style={{ marginTop: '15px' }}>
                {(() => {
                  const hasVideo = !!(course.video_url || course.video);
                  const hasPdf = !!(course.pdf_url || course.pdf);
                  const statusStr = String(course.status).toLowerCase();
                  const isCompleted = statusStr === 'completed';
                  const isInProgress = statusStr === 'in progress' || statusStr === 'inprogress';

                  const getStyle = (defaultColor, defaultHover) => {
                    if (isCompleted) return { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', hover: '#bbf7d0' };
                    if (isInProgress) return { color: '#d97706', bg: '#fef3c7', border: '#fde68a', hover: '#fde68a' };
                    return { color: defaultColor, bg: 'white', border: '#f1f5f9', hover: defaultHover };
                  };

                  if (hasVideo && hasPdf) {
                    const pStyle = getStyle('#3b82f6', '#eff6ff');
                    const vStyle = getStyle('#3b82f6', '#eff6ff');
                    return (
                      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        <button
                          onClick={() => {
                            const pdfUrl = resolveMediaUrl(course.pdf_url || course.pdf);
                            if (pdfUrl) {
                              if (String(course.status).toLowerCase() === 'not started' || !course.status || String(course.status).toLowerCase() === 'pending') {
                                handleStart(course.id);
                              }
                              setActivePdfUrl(pdfUrl);
                              setActiveCourse(course);
                            } else {
                              console.warn('[TraineeDash] No valid PDF URL found for course:', course.id);
                            }
                          }}
                          style={{ flex: 1, padding: '14px', borderRadius: '16px', background: pStyle.bg, border: `1.5px solid ${pStyle.border}`, color: pStyle.color, fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = pStyle.hover; e.currentTarget.style.borderColor = pStyle.hover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = pStyle.bg; e.currentTarget.style.borderColor = pStyle.border; }}
                        >
                          <FileText size={18} /> {isCompleted ? 'Viewed PDF' : isInProgress ? 'Viewing PDF' : 'View PDF'}
                        </button>
                        <button
                          onClick={() => openVideoInNewTab(course)}
                          style={{ flex: 1, padding: '14px', borderRadius: '16px', background: vStyle.bg, border: `1.5px solid ${vStyle.border}`, color: vStyle.color, fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = vStyle.hover; e.currentTarget.style.borderColor = vStyle.hover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = vStyle.bg; e.currentTarget.style.borderColor = vStyle.border; }}
                        >
                          <Video size={18} /> {isCompleted ? 'Watched Video' : isInProgress ? 'Watching Video' : 'Watch Video'}
                        </button>
                      </div>
                    );
                  }

                  if (hasVideo) {
                    const vStyle = getStyle('#ef4444', '#fef2f2');
                    return (
                      <button
                        onClick={() => openVideoInNewTab(course)}
                        style={{ width: '100%', padding: '14px', borderRadius: '16px', background: vStyle.bg, border: `1.5px solid ${vStyle.border}`, color: vStyle.color, fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = vStyle.hover; e.currentTarget.style.borderColor = vStyle.hover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = vStyle.bg; e.currentTarget.style.borderColor = vStyle.border; }}
                      >
                        <PlayCircle size={18} /> {isCompleted ? 'Watched Video' : isInProgress ? 'Watching Video' : 'Watch Video'}
                      </button>
                    );
                  }

                  if (hasPdf) {
                    const pStyle = getStyle('#3b82f6', '#eff6ff');
                    return (
                      <button
                        onClick={() => {
                          const pdfUrl = resolveMediaUrl(course.pdf_url || course.pdf);
                          if (pdfUrl) {
                            if (String(course.status).toLowerCase() === 'not started' || !course.status || String(course.status).toLowerCase() === 'pending') {
                              handleStart(course.id);
                            }
                            setActivePdfUrl(pdfUrl);
                            setActiveCourse(course);
                          } else {
                            console.warn('[TraineeDash] No valid PDF URL found for course:', course.id);
                          }
                        }}
                        style={{ width: '100%', padding: '14px', borderRadius: '16px', background: pStyle.bg, border: `1.5px solid ${pStyle.border}`, color: pStyle.color, fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = pStyle.hover; e.currentTarget.style.borderColor = pStyle.hover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = pStyle.bg; e.currentTarget.style.borderColor = pStyle.border; }}
                      >
                        <FileText size={18} /> {isCompleted ? 'Viewed PDF' : isInProgress ? 'Viewing PDF Content' : 'View PDF Content'}
                      </button>
                    );
                  }

                  return (
                    <div style={{ width: '100%', padding: '14px', borderRadius: '16px', background: '#f8fafc', border: '1.5px dashed #e2e8f0', color: '#94a3b8', fontWeight: '800', fontSize: '12px', textAlign: 'center' }}>
                      No Materials Available
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Video now opens in a new tab via /video-player.html */}
    </div>
  );
};

export default TraineeDashboard;
