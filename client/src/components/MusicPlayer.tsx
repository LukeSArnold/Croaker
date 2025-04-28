import { createContext, useContext, useRef, useState } from "react";

// Interfaces for TypeScript typing
interface Track {
  id: number;  // Changed to number
  name: string;
  artist: { name: string };
  album: { albumArtUri: string };
}

interface MusicPlayerContextProps {
  tracks: Track[];
  currentTrackId: number | null;  // Changed to number | null
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  setTracks: (tracks: Track[]) => void;
  setCurrentTrackId: (id: number) => void;  // Changed to number
  togglePlayerPlayback: () => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextProps | undefined>(undefined);

export const MusicPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null); // Changed to number | null
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null); // Ref for audio element

  const togglePlayerPlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  return (
    <MusicPlayerContext.Provider value={{
      tracks,
      currentTrackId,
      isPlaying,
      currentTime,
      duration,
      audioRef,  // Pass the ref through context
      setTracks,
      setCurrentTrackId,
      togglePlayerPlayback,
      handleSeek
    }}>
      {children}
      <audio
        ref={audioRef}  // Use the ref here
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
      />
    </MusicPlayerContext.Provider>
  );
};

// Default export for the hook
export default function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}