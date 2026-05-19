import React, { useState, useEffect, useRef } from 'react';
import { Home, BookOpen, MessageSquare, AlertCircle, User, Palmtree, Clock, Gamepad2, CalendarDays } from 'lucide-react';
import { useThread } from '../context/ThreadContext';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../constants/Theme';
import { motion, AnimatePresence } from 'framer-motion';

const NavigationDock = ({ activeTab, onTabChange, isNewJoinee, isVisible }) => {
  const { user, isBlocked } = useAuth();
  const { unreadCount, clearNotifications } = useThread();
  const theme = getTheme(user?.role);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); 

  // Removed automatic clear on render so badge shows even if on the tab until clicked

  // (Removed Auto-show effect since it is now permanently visible)

  const navItems = [
    { id: 'HOME', icon: <Home className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Home' },
    { id: 'COURSES', icon: <BookOpen className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Courses' },
    { id: 'THREAD', icon: <MessageSquare className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Thread' },
    { id: 'FUN', icon: <Gamepad2 className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Fun' },
    { id: 'LEAVE', icon: <CalendarDays className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Leaves' },
    { id: 'PROFILE', icon: <User className="nav-icon" style={{ strokeWidth: '2.5px' }} />, label: 'Profile' },
  ].filter(item => isNewJoinee ? (item.id === 'HOME' || item.id === 'PROFILE' || item.id === 'FUN') : true);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="nav-dock-container"
          style={{ 
            position: 'fixed', 
            bottom: winWidth < 768 ? '0' : '20px', 
            left: winWidth < 768 ? '0' : '50%', 
            x: winWidth < 768 ? '0' : '-50%', 
            pointerEvents: isBlocked ? 'none' : 'auto', 
            opacity: isBlocked ? 0.5 : 1,
            width: winWidth < 768 ? '100%' : 'auto', 
            minWidth: winWidth < 768 ? '100%' : '460px', 
            maxWidth: winWidth < 768 ? '100%' : '600px', 
            zIndex: 9999 
          }}
          initial={{ opacity: 0, y: 50, x: winWidth < 768 ? '0' : '-50%' }}
          animate={{ opacity: 1, y: 0, x: winWidth < 768 ? '0' : '-50%' }}
          exit={{ opacity: 0, y: 50, x: winWidth < 768 ? '0' : '-50%' }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
            <div className="nav-dock" style={{ 
            backgroundColor: theme.headerBg, 
            borderRadius: winWidth < 768 ? '0' : '40px', 
            display: 'flex', 
            justifyContent: 'space-around', 
            alignItems: 'center', 
            padding: winWidth < 768 ? '4px 6px' : '5px 12px', 
            gap: winWidth < 768 ? '1px' : '8px', 
            boxShadow: winWidth < 768 ? '0 -4px 15px rgba(0,0,0,0.05)' : '0 10px 40px rgba(0,0,0,0.12)', 
            border: winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.5)', 
            borderTop: winWidth < 768 ? '2px solid rgba(255,255,255,0.3)' : (winWidth < 768 ? 'none' : '1.5px solid rgba(255,255,255,0.5)'),
            backdropFilter: 'blur(20px)' 
          }}>
            {navItems.map((item) => (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.9 }}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  onTabChange(item.id);
                  if (item.id === 'THREAD') {
                    clearNotifications();
                  }
                }}
                style={{ 
                  color: '#000', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  flex: 1, 
                  transition: 'all 0.2s ease',
                  borderBottom: activeTab === item.id ? '3px solid #EAB308' : '3px solid transparent',
                  paddingBottom: '2px',
                  borderRadius: '2px'
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                  {React.cloneElement(item.icon, { 
                    style: { 
                      ...item.icon.props.style, 
                      stroke: '#000',
                      width: winWidth < 768 ? '18px' : '20px',
                      height: winWidth < 768 ? '18px' : '20px'
                    } 
                  })}
                  {item.id === 'THREAD' && unreadCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-8px',
                      minWidth: '16px',
                      height: '16px',
                      background: '#FF3B30',
                      borderRadius: '10px',
                      border: '1.5px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      color: 'white',
                      fontWeight: '800',
                      padding: '0 3px',
                      boxShadow: '0 2px 8px rgba(255,59,48,0.3)',
                      zIndex: 10000
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="nav-label" style={{ 
                  fontWeight: '800', 
                  fontSize: winWidth < 768 ? '11px' : '13px', 
                  color: '#000', 
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '0.1px',
                  textTransform: 'none'
                }}>
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NavigationDock;
