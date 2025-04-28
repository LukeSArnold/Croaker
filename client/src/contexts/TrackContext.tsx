import { createContext, useContext, useState, ReactNode } from 'react';

interface TrackContextType {
  trackId: number;
  trackName: string;
  artistName: string;
  artistId: number;
  albumArtUri: string;
  setTrackId: (id: number) => void;
  setTrackName: (name: string) => void;
  setArtistName: (name: string) => void;
  setArtistId: (id: number) => void;
  setAlbumArtUri: (uri: string) => void;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const TrackProvider = ({ children }: { children: ReactNode }) => {
  const [trackId, setTrackId] = useState<number>(-1); // Default -1 means "no track loaded"
  const [trackName, setTrackName] = useState<string>('');
  const [artistName, setArtistName] = useState<string>('');
  const [artistId, setArtistId] = useState<number>(-1);
  const [albumArtUri, setAlbumArtUri] = useState<string>('');

  return (
    <TrackContext.Provider
      value={{
        trackId,
        trackName,
        artistName,
        artistId,
        albumArtUri,
        setTrackId,
        setTrackName,
        setArtistName,
        setArtistId,
        setAlbumArtUri,
      }}
    >
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