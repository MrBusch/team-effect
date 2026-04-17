import React, { createContext, useContext, useState } from 'react';

const PrivacyContext = createContext();

export function PrivacyProvider({ children }) {
  const [privateMode, setPrivateMode] = useState(() =>
    localStorage.getItem('te_private') === 'true'
  );

  function toggle() {
    setPrivateMode(v => {
      localStorage.setItem('te_private', String(!v));
      return !v;
    });
  }

  return (
    <PrivacyContext.Provider value={{ privateMode, toggle }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
