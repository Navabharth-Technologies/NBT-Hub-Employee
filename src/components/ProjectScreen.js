import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../config';
import { 
  User, Users, Briefcase, Clock, CheckCircle2, 
  Download, PlayCircle, Shield, ChevronRight,
  TrendingUp, Target, ArrowLeft
} from 'lucide-react';

const ProjectScreen = ({ onBack, defaultView, defaultStatus }) => {
  const { user } = useAuth();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [activeView, setActiveView] = useState(defaultView || 'INDIVIDUAL'); // INDIVIDUAL or TEAM
  const [statusFilter, setStatusFilter] = useState(defaultStatus || 'ALL');
  const [individualProjects, setIndividualProjects] = useState([]);
  const [teamProjects, setTeamProjects] = useState([]);
  const [sprintProgressMap, setSprintProgressMap] = useState({});
  const [sprintStatusMap, setSprintStatusMap] = useState({});
  const [taskReviews, setTaskReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [notificationFeedback, setNotificationFeedback] = useState(null);
  const [reviewData, setReviewData] = useState({}); // taskId -> { review, verified }
  const [taskDetailMap, setTaskDetailMap] = useState({}); // Stores explicit task metadata
  
  // Helper to strip legacy ":1" suffixes from IDs
  const sanitizeId = (id) => String(id || '').split(':')[0];

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    // Fast Hydration
    if (user) {
      try {
        const cachedInd = localStorage.getItem(`ind_projects_${user.id}`);
        const cachedTeam = localStorage.getItem(`team_projects_${user.id}`);
        if (cachedInd) setIndividualProjects(JSON.parse(cachedInd));
        if (cachedTeam) setTeamProjects(JSON.parse(cachedTeam));
      } catch (e) {}
      fetchProjectData();
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const fetchProjectData = async () => {
    const uid = sanitizeId(user?.id || user?.empId || user?.userId || user?.employee_id);
    if (!uid) return;
    setLoading(true);
    try {
      // Parallelize Initial Fetching
      const [indResp, profileResp] = await Promise.all([
        fetch(API_ENDPOINTS.TASKS_ASSIGNED(uid)),
        (!user?.manager_id && user?.email) ? fetch(API_ENDPOINTS.PROFILE(user.email)) : Promise.resolve(null)
      ]);

      // 1. Process Individual Projects
      if (indResp.ok) {
        const list = await indResp.json();
        const data = Array.isArray(list) ? list : (list.value || list.data || []);
        const valid = data.filter(p => !!(p && (p.projectName || p.project_name || p.project || p.task_name || p.taskName || p.title || p.taskTitle)));
        setIndividualProjects(valid);
        localStorage.setItem(`ind_projects_${user.id}`, JSON.stringify(valid));
        
        valid.forEach(p => {
          const pName = p.projectName || p.project_name || p.project || p.task_name;
          fetchSprintStatus(uid, pName);
        });
      }

      // 2. Process Team Projects
      let managerId = user?.manager_id || user?.tl_id || user?.team_leader_id || user?.reporting_manager_id || user?.managerId || user?.reportingManagerId;
      if (!managerId && profileResp && profileResp.ok) {
        const mData = await profileResp.json();
        managerId = mData?.id || mData?.manager_id || mData?.userId || mData?.managerId || mData?.reporting_manager_id;
      }

      if (managerId && String(managerId) !== String(uid)) {
        const teamResp = await fetch(API_ENDPOINTS.TASKS_ASSIGNED(managerId));
        if (teamResp.ok) {
          const tResp = await teamResp.json();
          const tData = Array.isArray(tResp) ? tResp : (tResp.value || tResp.data || []);
          const validT = tData.filter(p => {
            if (!p) return false;
            const nameRaw = p.projectName || p.project_name || p.project || p.task_name || p.taskName || p.title || p.taskTitle || '';
            const pName = String(nameRaw).toLowerCase();
            return pName !== '' && !pName.includes('individual');
          });
          setTeamProjects(validT);
          localStorage.setItem(`team_projects_${user.id}`, JSON.stringify(validT));
          
          validT.forEach(p => {
             const pName = p.projectName || p.project_name || p.project || p.task_name || p.taskName || p.title;
             if(pName) fetchSprintStatus(managerId, pName);
             const tid = p.id || p.assigned_id || p.task_id;
             if (tid) fetchTaskDetail(tid);
          });
        }
      } 
    } catch (err) {
      console.error("Project Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetail = async (taskId) => {
    try {
      const res = await fetch(API_ENDPOINTS.SINGLE_TASK_DETAIL(taskId));
      if (res.ok) {
        const data = await res.json();
        setTaskDetailMap(prev => ({ ...prev, [taskId]: data }));
      }
    } catch {}
  };

  const fetchSprintStatus = async (targetId, currentProjectName) => {
    const sid = sanitizeId(targetId);
    try {
      const res = await fetch(`${BASE_URL}/api/sprint-updates/${sid}`);
      if (res.ok) {
        const data = await res.json();
        // If names match, use it. If no name in response, assume it's the latest relevant update.
        const respName = data.project_name || data.projectName;
        if (!respName || respName === currentProjectName) {
          setSprintStatusMap(prev => ({ ...prev, [currentProjectName]: data.sprint_status || data.sprintStatus || 'Pending' }));
          setSprintProgressMap(prev => ({ ...prev, [currentProjectName]: data.progress_percentage || data.progressPercentage || data.progress || 0 }));
          localStorage.setItem(`sprint_progress_${targetId}_${currentProjectName}`, JSON.stringify({ 
            status: data.sprint_status || data.sprintStatus || 'Pending', 
            progress: data.progress_percentage || data.progressPercentage || data.progress || 0 
          }));
        }
      }
    } catch { }
  };

  // Consolidated Task Persistence
  const handleStatusUpdate = async (pName, st, taskId) => {
    const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
    const leadId = user?.reportingManagerId || user?.managerId || user?.reporting_manager_id || user?.representative_tl || user?.team_leader || user?.reporting_manager || user?.manager || uid;
    const ownerId = activeView === 'INDIVIDUAL' ? uid : leadId;
    
    const currentProgress = sprintProgressMap[pName] || 0;
    const progress = st === 'Completed' ? 100 : (st === 'In Progress' ? Math.min(95, currentProgress + 5) : currentProgress);
    
    if (st === 'Completed' && !window.confirm(`Mark "${pName}" as completed?`)) return;

    try {
      // 1. Log to Sprint History (Temporal)
      const sid = sanitizeId(ownerId);
      const res = await fetch(`${BASE_URL}/api/sprint-updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: pName,
          teamLeaderId: sid,
          sprintStatus: st,
          progressPercentage: progress
        })
      });

      // 2. Update Main Task Table (Persistence)
      if (taskId) {
        await fetch(API_ENDPOINTS.UPDATE_TASK_STATUS(taskId), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: st, 
              overallStatus: st,
              progress: progress 
            })
        });
      }

      if (res.ok) {
        setSprintStatusMap(prev => ({ ...prev, [pName]: st }));
        setSprintProgressMap(prev => ({ ...prev, [pName]: progress }));
        setNotificationFeedback(`Project "${pName}" updated to ${st}!`);
        setTimeout(() => setNotificationFeedback(null), 3000);
      }
    } catch { }
  };

  const s = {
    container: { padding: window.innerWidth < 768 ? '20px 15px' : '30px 40px', maxWidth: '100%', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: '40px' },
    title: { fontSize: '22px', fontWeight: '900', color: '#0B1E3F', margin: 0 },
    subtitle: { fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px' },
    toggleGrid: { 
      display: 'grid', 
      gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr', 
      gap: winWidth < 768 ? '15px' : '20px', 
      marginBottom: '30px' 
    },
    toggleCard: (active) => ({
      padding: winWidth < 768 ? '18px 22px' : '25px',
      borderRadius: '30px',
      backgroundColor: active ? '#3B5998' : 'white',
      border: '1.5px solid',
      borderColor: active ? '#3B5998' : '#eef2f6',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: active ? '0 15px 35px rgba(59, 89, 152, 0.15)' : '0 8px 25px rgba(0,0,0,0.02)',
      transform: active ? 'translateY(-2px)' : 'none'
    }),
    projectCard: {
      backgroundColor: 'white',
      borderRadius: '35px',
      padding: winWidth < 768 ? '22px' : '35px',
      marginBottom: '20px',
      border: '1.5px solid #f1f5f9',
      boxShadow: '0 15px 45px rgba(0,0,0,0.02)'
    }
  };

  const projectsToShow = (activeView === 'INDIVIDUAL' ? individualProjects : teamProjects)
    .filter(p => {
      if (statusFilter === 'Today') {
        const pDate = p.created_at || p.assigned_date || p.Date || p.createdAt || p.date || p.assignedDate || p.creation_date;
        if (!pDate) return false;
        try {
          const d1 = new Date(pDate).toDateString();
          const d2 = new Date().toDateString();
          return d1 === d2;
        } catch { return false; }
      }
      if (statusFilter === 'ALL') return true;
      const pStatus = p.status || p.sprint_status || p.overallStatus || sprintStatusMap[p.task_name || p.taskName || p.project_name || p.projectName] || 'Pending';
      return pStatus.toLowerCase() === statusFilter.toLowerCase();
    });

  return (
    <div style={s.container}>
      <header style={{ ...s.header, display: 'flex', alignItems: 'center', gap: '20px' }}>
        {onBack && (
          <button 
            onClick={onBack}
            style={{ 
              width: '45px', height: '45px', borderRadius: '15px', backgroundColor: 'white', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <ArrowLeft size={20} color="#0B1E3F" />
          </button>
        )}
        <div>
          <h1 style={s.title}>Project Center</h1>
          <div style={s.subtitle}>Mission oversight and technical brief manifest</div>
        </div>
      </header>

      <div style={{ ...s.toggleGrid, marginBottom: '20px' }}>
        {['INDIVIDUAL', 'TEAM'].map(type => (
          <div key={type} style={s.toggleCard(activeView === type)} onClick={() => setActiveView(type)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ backgroundColor: activeView === type ? 'rgba(255,255,255,0.2)' : '#f1f5f9', padding: '10px', borderRadius: '15px' }}>
                {type === 'INDIVIDUAL' ? <User size={22} color={activeView === type ? 'white' : '#3B5998'} /> : <Users size={22} color={activeView === type ? 'white' : '#3B5998'} />}
              </div>
              <div style={{ fontSize: winWidth < 768 ? '11px' : '13px', fontWeight: '900', color: activeView === type ? 'white' : '#64748b', letterSpacing: '0.3px' }}>
                {type === 'INDIVIDUAL' ? 'Individual' : 'Team'} projects
              </div>
            </div>
            <div style={{ fontSize: winWidth < 768 ? '18px' : '24px', fontWeight: '900', color: activeView === type ? 'white' : '#0B1E3F' }}>
              {type === 'INDIVIDUAL' ? individualProjects.length : teamProjects.length}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '5px' }}>
        {['ALL', 'Today', 'Pending', 'In Progress', 'Completed', 'Approved'].map(f => (
          <button 
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '8px 20px', borderRadius: '12px', border: '1.5px solid',
              backgroundColor: statusFilter === f ? '#3B5998' : 'white',
              color: statusFilter === f ? 'white' : '#64748b',
              borderColor: statusFilter === f ? '#3B5998' : '#eef2f6',
              fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {projectsToShow.length > 0 ? projectsToShow.map((proj, idx) => {
          const pName = proj.task_name || proj.taskName || proj.task_text || proj.title || proj.taskTitle || proj.projectName || proj.project_name || proj.project || proj.name || 'Unnamed Project';
          const pDesc = proj.description || proj.projectDescription || proj.project_description || proj.task_text || proj.task_description || 'No description provided.';
          
          const td = taskDetailMap[proj.id] || {};
          // Comprehensive mapping to handle all known backend naming variations
          const pStatus = proj.status || td.status || proj.sprint_status || proj.overallStatus || sprintStatusMap[pName] || 'Pending';
          const pProg = proj.progress !== undefined && proj.progress !== null ? proj.progress : 
                        (td.progress !== undefined && td.progress !== null ? td.progress : 
                        (proj.progress_percentage || proj.sprint_progress || sprintProgressMap[pName] || (pStatus === 'Completed' ? 100 : 0)));
          const pVerify = proj.verify ?? td.verified ?? td.verify ?? proj.verified ?? proj.approval_status ?? null;
          const pReview = proj.task_review || td.task_review || proj.taskReview || proj.review || proj.feedback || null;
          
          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={idx} style={s.projectCard}>
              <div style={{ display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', gap: '30px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ backgroundColor: '#eff6ff', color: '#3B5998', padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' }}>{activeView === 'INDIVIDUAL' ? 'Individual' : 'Team'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}><Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {proj.deadline ? new Date(proj.deadline).toLocaleDateString() : 'No deadline'}</div>
                  </div>
                  <h2 style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F', margin: '0 0 8px 0' }}>{pName}</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>{pDesc}</p>
                </div>

                <div style={{ minWidth: winWidth < 768 ? '100%' : '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px', borderLeft: winWidth < 768 ? 'none' : '1.5px solid #f1f5f9', paddingLeft: winWidth < 768 ? '0' : '30px', paddingTop: winWidth < 768 ? '20px' : '0', borderTop: winWidth < 768 ? '1.5px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#0B1E3F' }}>Sprint progress</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0B1E3F' }}>{pProg}%</span>
                  </div>
                  <div style={{ height: '10px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pProg}%` }} style={{ height: '100%', backgroundColor: pStatus === 'Completed' ? '#16a34a' : '#FDB913', borderRadius: '10px' }} />
                  </div>
                  
                  {activeView === 'INDIVIDUAL' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      {['Pending', 'In Progress', 'Completed'].map(st => (
                        <button 
                          key={st}
                          onClick={() => handleStatusUpdate(pName, st, proj.id)}
                          style={{ 
                            flex: 1, padding: '10px', borderRadius: '12px', border: '1.5px solid',
                            borderColor: pStatus === st ? (st === 'Completed' ? '#16a34a' : '#3B5998') : '#e2e8f0',
                            backgroundColor: pStatus === st ? (st === 'Completed' ? '#16a34a' : '#3B5998') : 'white',
                            color: pStatus === st ? 'white' : '#64748b',
                            fontSize: '9px', fontWeight: '800', cursor: pStatus === 'Completed' ? 'not-allowed' : 'pointer',
                            transition: '0.2s'
                          }}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Review & Verification Section — always visible */}
              {(() => {
                const rd = reviewData[proj.id];
                // Read directly from proj first (already in TASKS_ASSIGNED response), then from fetched review data
                const review = rd?.review || proj.task_review || proj.brief_review || proj.review || proj.taskReview || proj.feedback || proj.managerReview || null;
                const verified = rd?.verified !== undefined ? rd.verified : (proj.verified ?? proj.is_verified ?? proj.approval_status ?? null);
                const isApproved = verified !== null && (String(verified).toLowerCase() === 'approved' || verified === true || verified === 1);
                const isRejected = verified !== null && String(verified).toLowerCase() === 'rejected';

                return (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1.5px solid #f1f5f9' }}>
                    {/* Manager Review */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.3px', marginBottom: '8px' }}>
                        Manager review
                      </div>
                      <div style={{ fontSize: '12px', color: review ? '#334155' : '#cbd5e1', lineHeight: '1.6', backgroundColor: '#f8fafc', borderRadius: '12px', padding: '10px 14px', border: '1px solid #e2e8f0', fontStyle: review ? 'italic' : 'normal' }}>
                        {review ? `"${review}"` : 'No review submitted yet.'}
                      </div>
                    </div>

                    {/* Verification Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.3px' }}>
                        Verification status
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <div style={{
                          padding: '5px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '800',
                          backgroundColor: isApproved ? '#dcfce7' : '#f8fafc',
                          color: isApproved ? '#16a34a' : '#94a3b8',
                          border: `1.5px solid ${isApproved ? '#86efac' : '#e2e8f0'}`,
                          letterSpacing: '0.3px'
                        }}>✓ Approved</div>
                        <div style={{
                          padding: '5px 14px', borderRadius: '10px', fontSize: '10px', fontWeight: '800',
                          backgroundColor: isRejected ? '#fee2e2' : '#f8fafc',
                          color: isRejected ? '#dc2626' : '#94a3b8',
                          border: `1.5px solid ${isRejected ? '#fca5a5' : '#e2e8f0'}`,
                          letterSpacing: '0.3px'
                        }}>✗ Rejected</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          );
        }) : (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'white', borderRadius: '35px', color: '#94a3b8' }}>
            <Briefcase size={40} style={{ opacity: 0.3, marginBottom: '15px' }} />
            <div style={{ fontWeight: '800' }}>No active missions logged for this category.</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {notificationFeedback && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#3B5998', color: 'white', padding: '12px 30px', borderRadius: '15px', fontWeight: '900', boxShadow: '0 15px 30px rgba(0,0,0,0.1)', zIndex: 10000 }}>
            {notificationFeedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectScreen;
