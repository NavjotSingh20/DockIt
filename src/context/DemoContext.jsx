import { createContext, useContext, useState } from 'react';
import { DEMO_BUSINESS, DEMO_LICENSES } from '../utils/demoData';
import { getDaysLeft } from '../utils/formatters';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemo, setIsDemo] = useState(false);

  const demoLicenses = DEMO_LICENSES.map((l) => ({
    ...l,
    daysLeft: getDaysLeft(l.expiry_date),
  }));

  const enterDemo = () => setIsDemo(true);
  const exitDemo = () => setIsDemo(false);

  return (
    <DemoContext.Provider value={{ isDemo, enterDemo, exitDemo, demoBusiness: DEMO_BUSINESS, demoLicenses }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
};
