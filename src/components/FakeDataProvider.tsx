import React, { createContext, useContext, useMemo } from 'react';
import { useDailyPrompt } from '@/hooks/useDailyPrompt';

interface FakeDataContextType {
  todaysPrompt: string;
  fakeTakes: any[];
}

const FakeDataContext = createContext<FakeDataContextType>({
  todaysPrompt: '',
  fakeTakes: []
});

export const useFakeData = () => useContext(FakeDataContext);

export const FakeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { prompt } = useDailyPrompt();
  
  // No fake data - using real data only
  const fakeTakes = useMemo(() => [], []);

  const value = useMemo(() => {
    try {
      return {
        todaysPrompt: prompt || '',
        fakeTakes
      };
    } catch (error) {
      console.error('Error creating fake data context value:', error);
      return {
        todaysPrompt: '',
        fakeTakes: []
      };
    }
  }, [prompt, fakeTakes]);

  return (
    <FakeDataContext.Provider value={value}>
      {children}
    </FakeDataContext.Provider>
  );
};