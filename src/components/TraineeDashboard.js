import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayCircle, FileText, AlertCircle, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import SaturdayRequirementsPopover from './SaturdayRequirementsPopover';

// Resolve relative media paths (video/PDF) to absolute using the API base URL
const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const TraineeDashboard = () => {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlocked, setShowBlocked] = useState(false);
  const fetchDataRef = useRef(null); // stable ref so BroadcastChannel closure always calls latest

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
      
      finalArr = sourceArr.map(item => ({
        ...item,
        id: item.id,
        title: item.title || 'Untitled Mission',
        description: item.description,
        deadline: item.deadline,
        category: item.category || 'TECHNICAL',
        pdf_url: item.pdf_url,
        video_url: item.video_url,
        status: item.status || 'Not Started',
        uploaderName: item.uploaded_by || 'HR'
      }));

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

      const isAllCompleted = finalArr.length > 0 && finalArr.every(c => c.status === 'Completed');

      // Block access only after 10 days if curriculum is not yet completed
      if (diffDays > 10 && !isAllCompleted) {
        setShowBlocked(true);

        // Send a notification to the DB (only once — avoid repeated inserts on refresh)
        const notifKey = `trainee_blocked_notif_${resolvedUid}`;
        if (!localStorage.getItem(notifKey)) {
          try {
            await fetch(API_ENDPOINTS.NOTIFICATIONS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                target_user_id: resolvedUid,
                message: `Your 10-day onboarding training window has expired with ${finalArr.filter(c => c.status !== 'Completed').length} course(s) still pending. Access has been automatically restricted.`,
                type: 'TRAINING_BLOCKED',
                is_read: 0
              })
            });
            localStorage.setItem(notifKey, '1');
            console.log('[TraineeDash] Block notification sent to DB.');
          } catch (ne) { console.error('[TraineeDash] Notification insert failed:', ne); }
        }
      } else {
        setShowBlocked(false);
      }

    } catch (err) {
      console.error("[TraineeDash] Critical sync error:", err);
    } finally {
      setLoading(false);
    }
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

  const openVideoInNewTab = (course) => {
    if (String(course.status).toLowerCase() === 'not started' || !course.status || String(course.status).toLowerCase() === 'pending') {
      handleStart(course.id);
    }
    const uid = user?.empId || user?.employee_id || user?.id || user?.userId || 1;
    const videoSrc = resolveMediaUrl(course.video_url || course.video);
    const params = new URLSearchParams({
      url:      videoSrc,
      courseId: course.id,
      title:    course.title || '',
      desc:     course.description || '',
      apiBase:  BASE_URL,
      uid:      uid
    });
    window.open(`/video-player.html?${params.toString()}`, '_blank');
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }} />
    </div>
  );

  // --- BLOCKED ACCESS SCREEN ---
  if (showBlocked) return (
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
                  <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>Overall progress</h3>
                  <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                    {Math.round((courses.filter(c => String(c.status).toLowerCase() === 'completed').length / courses.length) * 100)}% <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700' }}>Mastered</span>
                  </h2>
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

        <h1 style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '30px', letterSpacing: '0.5px' }}>
          Assigned to <span style={{ color: '#3b82f6' }}>You</span>
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px' }}>
          {courses.map(course => (
            <div key={course.id} style={cardStyle}>
              {/* Category and Deadline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ background: course.category === 'TECHNICAL' ? '#fee2e2' : '#eff6ff', color: course.category === 'TECHNICAL' ? '#ef4444' : '#3b82f6', padding: '4px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '800' }}>
                  {course.category || 'Technical'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>
                  <Calendar size={13} /> Deadline: {course.deadline ? new Date(course.deadline).toLocaleDateString() : 'No Date'}
                </div>
              </div>
              {/* Course Title and Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin:0 }}>{course.title}</h2>
                <div style={{
                  background: String(course.status).toLowerCase() === 'completed' ? '#dcfce7' : 
                              String(course.status).toLowerCase() === 'in progress' ? '#dbeafe' : '#fef3c7',
                  color:      String(course.status).toLowerCase() === 'completed' ? '#16a34a' : 
                              String(course.status).toLowerCase() === 'in progress' ? '#2563eb' : '#d97706',
                  padding: '2px 10px', borderRadius: '10px', fontSize: '9px', fontWeight: '800',
                  transition: 'all 0.4s'
                }}>
                  {course.status || 'Not started'}
                </div>
              </div>

              {/* Course Description */}
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', margin: '5px 0' }}>
                {course.description}
              </p>

              {/* Uploader Metadata */}
              <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '800', marginTop: '5px' }}>
                 Upload by {course.uploaderName || course.uploaded_by || 'HR'}
              </div>

              {/* Media Button Content */}
              <div style={{ marginTop: '15px' }}>
                {course.video_url || course.video ? (
                   <button 
                     onClick={() => openVideoInNewTab(course)}
                     style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'white', border: '1.5px solid #f1f5f9', color: '#ef4444', fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
                     onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fee2e2'; }}
                     onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                   >
                      <PlayCircle size={18} /> Watch Video
                   </button>
                ) : (course.pdf_url || course.pdf) ? (
                   <button 
                     onClick={() => {
                        // Mark status accordingly
                        if (String(course.status).toLowerCase() !== 'completed') {
                          if (String(course.status).toLowerCase() === 'not started' || !course.status || String(course.status).toLowerCase() === 'pending') {
                            handleStart(course.id);
                          } else {
                            handleComplete(course.id);
                          }
                        }
                       window.open(resolveMediaUrl(course.pdf_url || course.pdf), '_blank');
                     }}
                     style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'white', border: '1.5px solid #f1f5f9', color: '#3b82f6', fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                   >
                      <FileText size={18} /> View PDF Content
                   </button>
                ) : (
                   <div style={{ width: '100%', padding: '14px', borderRadius: '16px', background: '#f8fafc', border: '1.5px dashed #e2e8f0', color: '#94a3b8', fontWeight: '800', fontSize: '12px', textAlign: 'center' }}>
                      No Materials Available
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SaturdayRequirementsPopover />
      {/* Video now opens in a new tab via /video-player.html */}
    </div>
  );
};

export default TraineeDashboard;
