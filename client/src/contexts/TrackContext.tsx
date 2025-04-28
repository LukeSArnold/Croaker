import { createContext, useContext, useState, ReactNode } from 'react';

interface TrackContextType {
  trackId: number;
  setTrackId: (id: number) => void;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const TrackProvider = ({ children }: { children: ReactNode }) => {
  const [trackId, setTrackId] = useState<number>(-1); // Default -1 means "no track loaded"

  return (
    <TrackContext.Provider value={{ trackId, setTrackId }}>
      {children}
    </TrackContext.Provider>
  );
};

export const useTrack = () => {
  const context = useContext(TrackContext);
  if (!context) {
    throw new Error('useTrack must be used inside a TrackProvider');
  }
  return context;
};