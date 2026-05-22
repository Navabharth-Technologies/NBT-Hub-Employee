import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const BackButton = ({ onClick }) => {
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = winWidth < 768;

  if (!onClick) return null;

  return (
    <motion.button
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        width: isMobile ? '36px' : '45px',
        height: isMobile ? '36px' : '45px',
        borderRadius: isMobile ? '12px' : '15px',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid #f1f5f9',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        flexShrink: 0,
        padding: 0,
        outline: 'none'
      }}
    >
      <ArrowLeft size={isMobile ? 18 : 20} color="#0B1E3F" strokeWidth={2.5} />
    </motion.button>
  );
};

export default BackButton;
