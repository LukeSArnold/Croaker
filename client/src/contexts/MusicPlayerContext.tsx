import React, { createContext, useContext, useState, useRef, ReactNode } from "react";

interface MusicPlayerContextProps {
  tracks: any[];
  currentTrackId: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlayerPlayback: () => void;
  handleSeek: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setTracks: (tracks: any[]) => void;
  setCurrentTrackId: (id: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicPlayerContext = createContext<MusicPlayerContextProps | undefined>(undefined);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayerPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = parseFloat(event.target.value);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        tracks,
        currentTrackId,
        isPlaying,
        currentTime,
        duration,
        togglePlayerPlayback,
        handleSeek,
        setTracks,
        setCurrentTrackId,
        audioRef,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = (): MusicPlayerContextProps => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
};