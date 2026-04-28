export const getTheme = (role) => {
  const roleThemes = {
    teamleader: {
      color: '#0B1E3F',
      contrast: '#000',
      headerBg: '#a7d6da',
      pageBg: '#F8F9FB',
      text: '#0B1E3F',
      label: 'LEAD SOFTWARE ENGINEER'
    },
    employee: {
      color: '#0B1E3F',
      contrast: '#000',
      headerBg: '#a7d6da',
      pageBg: '#F8F9FB',
      text: '#0B1E3F',
      label: 'SOFTWARE ENGINEER'
    },
    default: {
      color: '#0B1E3F',
      contrast: '#FDB913',
      headerBg: '#a7d6da',
      pageBg: '#F8F9FB',
      text: '#0B1E3F',
      label: 'MEMBER'
    }
  };
  return roleThemes[role] || roleThemes.default;
};
