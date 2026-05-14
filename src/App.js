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
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('nbt_active_tab');
      // If it's a sub-profile page, default to PROFILE to avoid broken back buttons
      const profileSubPages = ['PAYSLIP', 'EXPERIENCE_LETTER', 'RESIGNATION_LETTER', 'DOCUMENTS', 'SERVICE_CERTIFICATE'];
      if (saved && profileSubPages.includes(saved)) return 'PROFILE';
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
  const [isNavVisible, setIsNavVisible] = useState(true);
  const scrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  React.useEffect(() => {
    const checkJoineeStatus = async () => {
      if (user?.email) {
        // If the user already has the flag or is a trainee, no need to fetch
        if (user.isNewJoinee || user.role === 'Trainee' || user.role === 'TRAINEE') {
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
            setIsNewJoinee(isListed || user.role === 'Trainee' || user.isNewJoinee);
          } else {
            setIsNewJoinee(user.role === 'Trainee' || user.isNewJoinee);
          }
        } catch (e) { 
          console.error("Joinee check failed:", e); 
          setIsNewJoinee(user.role === 'Trainee' || user.isNewJoinee);
        }
      }
    };
    checkJoineeStatus();
  }, [user]);

  const showNav = () => {
    setIsNavVisible(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  };

  const hideNavTemporarily = () => {
    setIsNavVisible(false);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsNavVisible(true);
    }, 3000);
  };

  const handleScroll = () => {
    showNav();
  };

  useEffect(() => {
    const mainEl = scrollRef.current;
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll);
      return () => {
        mainEl.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }
  }, []);

  if (loading) return null;
  if (!user) return <LoginScreen />;

  const handleTabChange = (tab, state = null) => {
    setActiveTab(tab);
    setActiveTabState(state);
    
    // Reset scroll position to top when changing tabs to prevent "merging" with header
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
      case 'LEAVE': return <LeaveScreen onBack={() => setActiveTab('HOME')} onNavigate={handleTabChange} startWithForm={activeTabState?.showForm} />;
      case 'ATTENDANCE': return <AttendanceDashboard onBack={() => setActiveTab('HOME')} onNavigate={handleTabChange} />;

      case 'FUN': return <FunQuizScreen onBack={() => setActiveTab('HOME')} />;
      case 'PROFILE': return <ProfileScreen isNewJoinee={isNewJoinee} onNavigate={handleTabChange} />;
      case 'BIRTHDAYS': return <BirthdayScreen onBack={() => setActiveTab('HOME')} />;
      case 'CALENDAR': return <CalendarScreen onBack={() => setActiveTab('HOME')} />;
      case 'FOCUS_LOGS': return <FocusLogs onBack={() => setActiveTab('HOME')} />;
      case 'AWARDS': return <AwardsScreen onBack={() => setActiveTab('HOME')} />;
      case 'REPORTS': return <Reports onBack={() => setActiveTab('HOME')} onNavigate={setActiveTab} />;
      case 'PAYSLIP': return <PayslipScreen onBack={() => setActiveTab('PROFILE')} />;
      case 'EXPERIENCE_LETTER': return <ExperienceLetter onBack={() => setActiveTab('PROFILE')} />;
      case 'RESIGNATION_LETTER': return <ResignationScreen onBack={() => setActiveTab('PROFILE')} />;
      case 'DOCUMENTS': return <DocumentsScreen onBack={() => setActiveTab('PROFILE')} />;
      case 'SERVICE_CERTIFICATE': return <ServiceCertificateScreen onBack={() => setActiveTab('PROFILE')} />;
      case 'ATTENDANCE_DETAIL': return <EmployeeAttendanceDetail employeeId={activeTabState?.employeeId} onBack={() => setActiveTab('ATTENDANCE')} />;

      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };



  return (
    <ThreadProvider>
      <div className="App" style={{ overflowX: 'hidden' }} onClick={hideNavTemporarily}>
        <Header setActiveTab={handleTabChange} isNewJoinee={isNewJoinee} />
        <main key={activeTab} ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, backgroundColor: '#f8fafc', overflowY: "auto", paddingBottom: '90px', paddingTop: '40px' }}>
          {renderTab()}
        </main>
        <NavigationDock activeTab={activeTab} onTabChange={handleTabChange} isNewJoinee={isNewJoinee} isVisible={isNavVisible} />
        <TaskNotification onOpenTask={handleTabChange} />
        <ScrollToTop scrollRef={scrollRef} />
      </div>
    </ThreadProvider>
  );
}

export default App;
