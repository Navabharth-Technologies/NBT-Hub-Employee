import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import NavigationDock from './components/NavigationDock';
import Dashboard from './components/Dashboard';
import ProfileScreen from './components/profile/ProfileScreen';
import { API_ENDPOINTS, BASE_URL } from './config';

import { ThreadProvider } from './context/ThreadContext';
import ThreadScreen from './components/ThreadScreen';
import TicketScreen from './components/TicketScreen';
import BirthdayScreen from './components/BirthdayScreen';
import CalendarScreen from './components/CalendarScreen';
import Courses from './components/Courses';
import FocusLogs from './components/FocusLogs';
import TaskNotification from './components/TaskNotification';
import ScrollToTop from './components/ScrollToTop';
import ProjectScreen from './components/ProjectScreen';
import TraineeDashboard from './components/TraineeDashboard';
import InternDashboard from './components/intern/InternDashboard';
import InternProfileScreen from './components/intern/InternProfileScreen';
import InternFunQuizScreen from './components/intern/InternFunQuizScreen';
import InternAwardsScreen from './components/intern/InternAwardsScreen';
import LeaveScreen from './components/LeaveScreen';
import AttendanceDashboard from './components/AttendanceDashboard';
import FunQuizScreen from './components/FunQuizScreen';
import AwardsScreen from './components/AwardsScreen';
import PayslipScreen from './components/profile/PayslipScreen';
import ExperienceLetter from './components/profile/ExperienceLetter';

import ResignationScreen from './components/profile/ResignationScreen';
import DocumentsScreen from './components/profile/DocumentsScreen';
import ServiceCertificateScreen from './components/profile/ServiceCertificateScreen';
import EmployeeAttendanceDetail from './components/EmployeeAttendanceDetail';
import Reports from './components/Reports';
import SaturdayRequirementsPopover from './components/SaturdayRequirementsPopover';
import SaturdaySuggestionsScreen from './components/SaturdaySuggestionsScreen';


const pathToTab = {
  '/': 'HOME',
  '/profile': 'PROFILE',
  '/courses': 'COURSES',
  '/thread': 'THREAD',
  '/leave': 'LEAVE',
  '/attendance': 'ATTENDANCE',
  '/fun': 'FUN',
  '/awards': 'AWARDS',
  '/resignation': 'RESIGNATION'
};


// 🔄 Service Certificate Revocation → Re-activation Check
// If HR deletes a service cert from DB, the resigned employee is re-activated automatically.
function useCertRevocationReactivation(user, setUser) {
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    const cleanToken = token.replace(/['"+]+/g, '').trim();

    // Only run for users that appear resigned/deactivated
    const status = String(user?.status || '').toLowerCase().trim();
    const empStatus = String(user?.employment_status || user?.employmentStatus || '').toLowerCase().trim();
    const isInactive =
      ['relieved', 'resigned', 'inactive', 'terminated', 'former'].includes(status) ||
      ['relieved', 'resigned', 'inactive', 'terminated', 'former'].includes(empStatus) ||
      Number(user?.is_active) === 0 ||
      user?.is_active === false;

    if (!isInactive) return;

    (async () => {
      try {
        const certRes = await fetch(`${BASE_URL}/api/service-certificates/my`, {
          headers: { Authorization: `Bearer ${cleanToken}` }
        });
        if (!certRes.ok) return;
        const certData = await certRes.json();
        const certs = Array.isArray(certData) ? certData : (certData.data || certData.requests || []);

        // If NO service certificate record exists (was deleted from DB) → re-activate
        if (certs.length === 0) {
          if (setUser) {
            setUser(prev => ({
              ...prev,
              status: 'active',
              employment_status: 'active',
              is_active: 1,
              isActive: true
            }));
          }
        }
      } catch (e) {
        // Network error — fail gracefully, never lock user out
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.employee_id]);
}

function App() {
  const { user, loading, logout, setUser, updateProfile } = useAuth();
  useCertRevocationReactivation(user, setUser);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      // 1. Try to read from URL hash (e.g. #/leave)
      const hash = window.location.hash;
      const path = hash.startsWith('#') ? hash.substring(1) : '/';
      if (pathToTab[path]) {
        return pathToTab[path];
      }
      
      // Fallback for paths not in the map
      if (path && path.startsWith('/')) {
        const legacyTab = path.substring(1).toUpperCase().replace(/-/g, '_');
        const validTabs = ['HOME', 'PROJECTS', 'COURSES', 'THREAD', 'TICKET', 'LEAVE', 'ATTENDANCE', 'FUN', 'PROFILE', 'BIRTHDAYS', 'CALENDAR', 'FOCUS_LOGS', 'AWARDS', 'REPORTS', 'PAYSLIP', 'EXPERIENCE_LETTER', 'RESIGNATION_LETTER', 'DOCUMENTS', 'SERVICE_CERTIFICATE', 'ATTENDANCE_DETAIL', 'SATURDAY_SUGGESTIONS'];
        if (validTabs.includes(legacyTab)) {
          return legacyTab;
        }
      }
      
      // 2. Fallback to localStorage
      const saved = localStorage.getItem('nbt_active_tab');
      return saved || 'HOME';
    } catch { return 'HOME'; }
  });

  const [activeTabState, setActiveTabState] = useState(() => {
    try {
      const saved = localStorage.getItem('nbt_active_tab_state');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isNewJoinee, setIsNewJoinee] = useState(false);
  const scrollRef = useRef(null);
  const isInitialMount = useRef(true);

  const previousUser = useRef(user);

  // ✅ Always redirect to Home/Dashboard after successful login, and clean up on logout
  useEffect(() => {
    if (!user) {
      // User just logged out
      setActiveTab('HOME');
      setActiveTabState(null);
    } else {
      if (!isInitialMount.current && !previousUser.current) {
        // Transitioned from null to logged-in user (Fresh Login)
        setActiveTab('HOME');
        setActiveTabState(null);
        localStorage.setItem('nbt_active_tab', 'HOME');
        localStorage.removeItem('nbt_active_tab_state');
        try {
          window.location.hash = '/';
        } catch (e) {}
      }
    }
    isInitialMount.current = false;
    previousUser.current = user;
  }, [user]);

  // ✅ Fetch actual designation for new joinees to display in header/profile
  useEffect(() => {
    if (!user) return;
    const isJoinee = String(user.role || '').toLowerCase() === 'new_joinee';
    if (isJoinee && !user.designation && updateProfile) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const uid = user.id || user.employee_id;
      if (uid && cleanToken) {
        fetch(`${BASE_URL}/api/new-joinees/${uid}`, {
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Accept': 'application/json'
          }
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.role) {
            updateProfile('designation', data.role, true);
          }
        })
        .catch(err => console.warn('Failed to fetch joinee designation:', err));
      }
    }
  }, [user?.id, user?.designation, updateProfile]);



  // ✅ Proper Navigation: Sync URL and Title with Active Tab
  useEffect(() => {
    if (!user) return;
    
    const tabToPathMap = {
      'HOME': '/',
      'PROFILE': '/profile',
      'COURSES': '/courses',
      'THREAD': '/thread',
      'LEAVE': '/leave',
      'ATTENDANCE': '/attendance',
      'FUN': '/fun',
      'AWARDS': '/awards',
      'RESIGNATION': '/resignation'
    };
    
    const path = tabToPathMap[activeTab] || '/' + activeTab.toLowerCase().replace(/_/g, '-');
    const displayPath = '#' + path;
    
    // Update Browser History: Use pushState for screen transitions and sentinel for HOME page to block exit
    if (window.location.hash !== displayPath && !(window.location.hash === '' && displayPath === '#/')) {
      if (activeTab === 'HOME') {
        window.history.pushState({ sentinel: true }, '', displayPath);
      } else {
        window.history.pushState(null, '', displayPath);
      }
    } else if (activeTab === 'HOME' && (!window.history.state || !window.history.state.sentinel)) {
      // If we are already on HOME but don't have the sentinel state (e.g. initial load), push it
      window.history.pushState({ sentinel: true }, '', '#/');
    }

    // Update Document Title
    const title = activeTab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    document.title = `NBT Hub | ${title === 'Home' ? 'Dashboard' : (title === 'Fun' ? 'Fun Zone' : title)}`;
  }, [activeTab, user]);

  // ✅ Keep back/forward navigation working & restrict exiting from HOME tab
  useEffect(() => {
    if (!user) return;

    const handlePopState = (event) => {
      const hash = window.location.hash;
      const path = hash.startsWith('#') ? hash.substring(1) : '/';
      
      let targetTab = 'HOME';
      if (pathToTab[path]) {
        targetTab = pathToTab[path];
      } else if (path && path.startsWith('/')) {
        const legacyTab = path.substring(1).toUpperCase().replace(/-/g, '_');
        const validTabs = ['HOME', 'PROJECTS', 'COURSES', 'THREAD', 'TICKET', 'LEAVE', 'ATTENDANCE', 'FUN', 'PROFILE', 'BIRTHDAYS', 'CALENDAR', 'FOCUS_LOGS', 'AWARDS', 'REPORTS', 'PAYSLIP', 'EXPERIENCE_LETTER', 'RESIGNATION_LETTER', 'DOCUMENTS', 'SERVICE_CERTIFICATE', 'ATTENDANCE_DETAIL', 'SATURDAY_SUGGESTIONS'];
        if (validTabs.includes(legacyTab)) {
          targetTab = legacyTab;
        }
      }

      // If they popped a state and target is HOME, make sure it has the sentinel state
      if (targetTab === 'HOME') {
        if (!event.state || !event.state.sentinel) {
          // Push sentinel back so back button has to pop it again
          window.history.pushState({ sentinel: true }, '', '#/');
          setActiveTab('HOME');
          return;
        }
      }

      setActiveTab(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    
    // Ensure sentinel state is active on initial load if starting on HOME
    const hash = window.location.hash;
    const path = hash.startsWith('#') ? hash.substring(1) : '/';
    if ((path === '/' || !path) && (!window.history.state || !window.history.state.sentinel)) {
      window.history.pushState({ sentinel: true }, '', '#/');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);



  if (loading) return null;
  if (!user) return <LoginScreen />;

  const handleTabChange = (tab, state = null) => {
    setActiveTab(tab);
    setActiveTabState(state);
    
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }

    try {
      localStorage.setItem('nbt_active_tab', tab);
      if (state) {
        localStorage.setItem('nbt_active_tab_state', JSON.stringify(state));
      } else {
        localStorage.removeItem('nbt_active_tab_state');
      }
    } catch (e) {
      console.warn("Failed to persist tab state:", e);
    }
  };

  const renderTab = () => {
    const isIntern = !!(
      String(user?.role || '').toUpperCase().includes('INTERN') ||
      String(user?.designation || '').toUpperCase().includes('INTERN')
    );

    switch (activeTab) {
      case 'HOME': 
        if (isIntern) return <InternDashboard setActiveTab={handleTabChange} />;
        return <Dashboard setActiveTab={handleTabChange} />;
      case 'PROJECTS': return <ProjectScreen onBack={() => setActiveTab('HOME')} defaultView={activeTabState?.view} defaultStatus={activeTabState?.status} />;
      case 'COURSES': return <Courses resumeCourseId={activeTabState?.resumeCourseId} clearState={() => { setActiveTabState(null); handleTabChange('HOME'); }} />;
      case 'THREAD': return <ThreadScreen onBack={() => setActiveTab('HOME')} />;
      case 'TICKET': return <TicketScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'LEAVE': return <LeaveScreen onBack={() => handleTabChange('HOME')} onNavigate={handleTabChange} startWithForm={activeTabState?.showForm} />;
      case 'ATTENDANCE': return <AttendanceDashboard onBack={() => handleTabChange('HOME')} onNavigate={handleTabChange} />;

      case 'FUN': 
        if (isIntern) return <InternFunQuizScreen onBack={() => handleTabChange('HOME')} />;
        return <FunQuizScreen onBack={() => handleTabChange('HOME')} />;
      case 'PROFILE': 
        if (isIntern) return <InternProfileScreen onNavigate={handleTabChange} />;
        return <ProfileScreen isNewJoinee={isNewJoinee} onNavigate={handleTabChange} />;
      case 'BIRTHDAYS': return <BirthdayScreen onBack={() => handleTabChange('HOME')} />;
      case 'CALENDAR': return <CalendarScreen onBack={() => handleTabChange('HOME')} />;
      case 'FOCUS_LOGS': return <FocusLogs onBack={() => handleTabChange('HOME')} />;
      case 'AWARDS': 
        if (isIntern) return <InternAwardsScreen onBack={() => handleTabChange('HOME')} />;
        return <AwardsScreen onBack={() => handleTabChange('HOME')} />;
      case 'REPORTS': return <Reports onBack={() => handleTabChange('HOME')} onNavigate={handleTabChange} />;
      case 'PAYSLIP': return <PayslipScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'EXPERIENCE_LETTER': return <ServiceCertificateScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'RESIGNATION':
      case 'RESIGNATION_LETTER': return <ResignationScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'DOCUMENTS': 
        const isInternOrJoinee = isNewJoinee || isIntern;
        if (isInternOrJoinee) {
          if (isIntern) return <InternProfileScreen onNavigate={handleTabChange} />;
          return <ProfileScreen isNewJoinee={isNewJoinee} onNavigate={handleTabChange} />;
        }
        return <DocumentsScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'SERVICE_CERTIFICATE': return <ServiceCertificateScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'ATTENDANCE_DETAIL': return <EmployeeAttendanceDetail employeeId={activeTabState?.employeeId} onBack={() => handleTabChange('ATTENDANCE')} />;
      case 'SATURDAY_SUGGESTIONS': return <SaturdaySuggestionsScreen onBack={() => handleTabChange('HOME')} />;

      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };



  return (
    <ThreadProvider>
      <div className="App" style={{ overflowX: 'hidden' }}>
        <Header setActiveTab={handleTabChange} isNewJoinee={isNewJoinee} />
        <main key={activeTab} ref={scrollRef} style={{ flex: 1, backgroundColor: '#f8fafc', overflowY: "auto", paddingBottom: isNewJoinee ? '20px' : '90px', paddingTop: '110px' }}>
          {renderTab()}
        </main>
        {!isNewJoinee && <NavigationDock activeTab={activeTab} onTabChange={handleTabChange} isNewJoinee={isNewJoinee} />}
        {!isNewJoinee && <TaskNotification onOpenTask={handleTabChange} />}
        <SaturdayRequirementsPopover />
        <ScrollToTop scrollRef={scrollRef} />
      </div>
    </ThreadProvider>
  );
}

export default App;
