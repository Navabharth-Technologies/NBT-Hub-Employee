import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import NavigationDock from './components/NavigationDock';
import Dashboard from './components/Dashboard';
import ProfileScreen from './components/profile/ProfileScreen';
import { API_ENDPOINTS } from './config';

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


function App() {
  const { user, loading } = useAuth();
  
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
        const validTabs = ['HOME', 'PROJECTS', 'COURSES', 'THREAD', 'TICKET', 'LEAVE', 'ATTENDANCE', 'FUN', 'PROFILE', 'BIRTHDAYS', 'CALENDAR', 'FOCUS_LOGS', 'AWARDS', 'REPORTS', 'PAYSLIP', 'EXPERIENCE_LETTER', 'RESIGNATION_LETTER', 'DOCUMENTS', 'SERVICE_CERTIFICATE', 'ATTENDANCE_DETAIL'];
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

  const [isNewJoinee, setIsNewJoinee] = useState(() => {
    if (!user) return false;
    const roleStr = String(user.role || '').toUpperCase();
    return !!(user.isNewJoinee || roleStr.includes('TRAINEE') || roleStr.includes('JOINEE'));
  });
  const [isNavVisible, setIsNavVisible] = useState(true);
  const scrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  React.useEffect(() => {
    const checkJoineeStatus = async () => {
      if (user?.email) {
        const roleStr = String(user.role || '').toUpperCase();
        // If the user already has the flag or is a trainee, no need to fetch
        if (user.isNewJoinee || roleStr.includes('TRAINEE') || roleStr.includes('JOINEE')) {
          setIsNewJoinee(true);
          return;
        }

        // Only fetch as a last resort if we don't know for sure
        try {
          const res = await fetch(API_ENDPOINTS.NEW_JOINEES_GET);
          if (res.ok) {
            const rawJoinees = await res.json();
            const joineesList = Array.isArray(rawJoinees) ? rawJoinees : (rawJoinees?.value || rawJoinees?.data || []);
            const isListed = joineesList.some(j => {
              const jEmail = String(j?.email || j?.email_id || j?.email_address || typeof j === 'string' ? j : '').toLowerCase();
              const inputEmail = String(user.email).toLowerCase();
              return (jEmail && (jEmail === inputEmail || jEmail.startsWith(inputEmail.split('@')[0])));
            });
            const uid = user?.id || user?.empId || user?.userId || user?.employee_id;
            if (!uid) return;
            setIsNewJoinee(isListed || roleStr.includes('TRAINEE') || roleStr.includes('JOINEE') || user.isNewJoinee);
          } else {
            setIsNewJoinee(roleStr.includes('TRAINEE') || roleStr.includes('JOINEE') || user.isNewJoinee);
          }
        } catch (e) { 
          console.error("Joinee check failed:", e); 
          setIsNewJoinee(roleStr.includes('TRAINEE') || roleStr.includes('JOINEE') || user.isNewJoinee);
        }
      }
    };
    checkJoineeStatus();
  }, [user]);

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

  const showNav = React.useCallback(() => {
    setIsNavVisible(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  }, []);

  const hideNavTemporarily = React.useCallback(() => {
    setIsNavVisible(false);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsNavVisible(true);
    }, 3000);
  }, []);

  const handleScroll = React.useCallback(() => {
    showNav();
  }, [showNav]);

  useEffect(() => {
    const mainEl = scrollRef.current;
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll);
      return () => {
        mainEl.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }
  }, [handleScroll]);

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
    
    // Update Browser History without full page reload
    if (window.location.hash !== displayPath && !(window.location.hash === '' && displayPath === '#/')) {
      window.history.replaceState(null, '', displayPath);
    }

    // Update Document Title
    const title = activeTab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    document.title = `NBT Hub | ${title === 'Home' ? 'Dashboard' : (title === 'Fun' ? 'Fun Zone' : title)}`;
  }, [activeTab, user]);

  // ✅ Keep back/forward navigation working
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const path = hash.startsWith('#') ? hash.substring(1) : '/';
      if (pathToTab[path]) {
        setActiveTab(pathToTab[path]);
      } else {
        if (path && path.startsWith('/')) {
          const legacyTab = path.substring(1).toUpperCase().replace(/-/g, '_');
          const validTabs = ['HOME', 'PROJECTS', 'COURSES', 'THREAD', 'TICKET', 'LEAVE', 'ATTENDANCE', 'FUN', 'PROFILE', 'BIRTHDAYS', 'CALENDAR', 'FOCUS_LOGS', 'AWARDS', 'REPORTS', 'PAYSLIP', 'EXPERIENCE_LETTER', 'RESIGNATION_LETTER', 'DOCUMENTS', 'SERVICE_CERTIFICATE', 'ATTENDANCE_DETAIL'];
          if (validTabs.includes(legacyTab)) {
            setActiveTab(legacyTab);
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    switch (activeTab) {
      case 'HOME': return (isNewJoinee || user.isNewJoinee) ? <TraineeDashboard /> : <Dashboard setActiveTab={handleTabChange} />;
      case 'PROJECTS': return <ProjectScreen onBack={() => setActiveTab('HOME')} defaultView={activeTabState?.view} defaultStatus={activeTabState?.status} />;
      case 'COURSES': return <Courses resumeCourseId={activeTabState?.resumeCourseId} clearState={() => { setActiveTabState(null); handleTabChange('HOME'); }} />;
      case 'THREAD': return <ThreadScreen onBack={() => setActiveTab('HOME')} />;
      case 'TICKET': return <TicketScreen onBack={() => handleTabChange('HOME')} />;
      case 'LEAVE': return <LeaveScreen onBack={() => handleTabChange('HOME')} onNavigate={handleTabChange} startWithForm={activeTabState?.showForm} />;
      case 'ATTENDANCE': return <AttendanceDashboard onBack={() => handleTabChange('HOME')} onNavigate={handleTabChange} />;

      case 'FUN': return <FunQuizScreen onBack={() => handleTabChange('HOME')} />;
      case 'PROFILE': return <ProfileScreen isNewJoinee={isNewJoinee} onNavigate={handleTabChange} />;
      case 'BIRTHDAYS': return <BirthdayScreen onBack={() => handleTabChange('HOME')} />;
      case 'CALENDAR': return <CalendarScreen onBack={() => handleTabChange('HOME')} />;
      case 'FOCUS_LOGS': return <FocusLogs onBack={() => handleTabChange('HOME')} />;
      case 'AWARDS': return <AwardsScreen onBack={() => handleTabChange('HOME')} />;
      case 'REPORTS': return <Reports onBack={() => handleTabChange('HOME')} onNavigate={handleTabChange} />;
      case 'PAYSLIP': return <PayslipScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'EXPERIENCE_LETTER': return <ServiceCertificateScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'RESIGNATION':
      case 'RESIGNATION_LETTER': return <ResignationScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'DOCUMENTS': return <DocumentsScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'SERVICE_CERTIFICATE': return <ServiceCertificateScreen onBack={() => handleTabChange('PROFILE')} />;
      case 'ATTENDANCE_DETAIL': return <EmployeeAttendanceDetail employeeId={activeTabState?.employeeId} onBack={() => handleTabChange('ATTENDANCE')} />;

      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };



  return (
    <ThreadProvider>
      <div className="App" style={{ overflowX: 'hidden' }} onClick={hideNavTemporarily}>
        <Header setActiveTab={handleTabChange} isNewJoinee={isNewJoinee} />
        <main key={activeTab} ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, backgroundColor: '#f8fafc', overflowY: "auto", paddingBottom: '90px', paddingTop: '110px' }}>
          {renderTab()}
        </main>
        <NavigationDock activeTab={activeTab} onTabChange={handleTabChange} isNewJoinee={isNewJoinee} isVisible={isNavVisible} />
        {!isNewJoinee && <TaskNotification onOpenTask={handleTabChange} />}
        <ScrollToTop scrollRef={scrollRef} />
      </div>
    </ThreadProvider>
  );
}

export default App;
