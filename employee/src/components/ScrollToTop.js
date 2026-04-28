import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ScrollToTop = ({ scrollRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    const el = scrollRef?.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    el.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', handleScroll);
    };
  }, [scrollRef]);

  const scrollToTop = () => {
    if (scrollRef?.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const isMobile = winWidth < 768;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            // Primary position at the bottom of the interaction column
            bottom: isMobile ? '80px' : '100px', 
            right: isMobile ? '10px' : '30px',
            zIndex: 2500,
            width: isMobile ? '50px' : '60px',
            height: isMobile ? '50px' : '60px',
            backgroundColor: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 15px 35px rgba(0,0,0,0.12)',
            border: '2px solid #f1f5f9'
          }}
        >
          <ChevronUp size={isMobile ? 24 : 28} color="#0B1E3F" strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
