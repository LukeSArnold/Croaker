import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useTrack } from "../contexts/TrackContext";
import SaveIcon from "../assets/SaveIcon.svg";

function MusicPlayer() {
  const { trackId, trackName, artistName, artistId, albumArtUri, setTrackId, setTrackName, setArtistName, setArtistId, setAlbumArtUri } = useTrack();
  
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    console.log("MUSIC PLAYER REGISTERED A TRACK CHANGE")
    playTrack(trackId, true)
  }, [trackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration);
    }
  }, []);

  const downloadTrack = async () => {
    try {
      const response = await fetch(`/getsong?trackId=${trackId}`);
      if (response.ok) {
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${trackName} - ${artistName}.mp3`;
        link.click();
      } else {
        console.error("Error fetching the song for download");
      }
    } catch (error) {
      console.error("Failed to download track:", error);
    }
  };

  const playTrack = async (trackId: number, created: boolean) => {
    if (!created) return;
    if (currentTrackId === trackId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        const response = await fetch(`/getsong?trackId=${trackId}`);
        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = audioRef.current;
          if (audio) {
            audio.src = audioUrl;
            audio.play();
            setCurrentTrackId(trackId);
            setIsPlaying(true);
          }
        } else {
          console.error("Error fetching the song");
        }
      } catch (error) {
        console.error("Failed to play track:", error);
      }
    }
  };

  const togglePlayerPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = parseFloat(e.target.value);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div>
      <div style={{
        position: "fixed", 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: "#012d2c", 
        padding: "10px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center"
      }}>
        
        {/* Left side: Album Art + Track info */}
        <div className="col-md-4 d-flex justify-content-left align-items-center">
          <img
            src={albumArtUri}
            alt="Album Cover"
            style={{
              width: "60px", 
              height: "60px", 
              borderRadius: "5px", 
              marginRight: "10px"
            }}
          />
          <div className="d-flex flex-column justify-content-center">
            <h4 style={{ color: "white", marginBottom: "5px" }}>
              {trackName}
            </h4>

            {/* Artist Name with Hover Glow and Click */}
            <span
              style={{
                color: "white",
                cursor: "pointer",
                textDecoration: "none",
                transition: "all 0.3s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = "underline";
                e.currentTarget.style.textShadow = "0 0 10px #66a2a9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = "none";
                e.currentTarget.style.textShadow = "none";
              }}
              onClick={() => navigate(`/artist/${artistId}`)}
            >
              {artistName}
            </span>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="col-md-4 d-flex flex-column align-items-center">
          <button
            onClick={togglePlayerPlayback}
            style={{
              backgroundColor: "#66a2a9",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "1.5rem",
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              marginBottom: "10px",
            }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          {/* Scrubber */}
          <div className="d-flex align-items-center">
            <span style={{ color: "white", margin: "0 10px" }}>
              {`${Math.floor(currentTime / 60)
                .toString()
                .padStart(2, '0')}:${Math.floor(currentTime % 60)
                .toString()
                .padStart(2, '0')}`}
            </span>

            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              style={{
                width: "300px",
                margin: "0 10px",
                background: `linear-gradient(to right, #66a2a9 ${currentTime / duration * 100}%, #444444 ${currentTime / duration * 100}%)`,
                appearance: "none",
                height: "8px",
                borderRadius: "5px",
              }}
            />

            <span style={{ color: "white", margin: "0 10px" }}>
              {`${Math.floor(duration / 60)
                .toString()
                .padStart(2, '0')}:${Math.floor(duration % 60)
                .toString()
                .padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {/* Right side: Save Button */}
        <div className="col-md-4 d-flex justify-content-center align-items-center">
          <div className="d-flex justify-content-center" onClick={downloadTrack}>
            <img src={SaveIcon} alt="Save Icon" style={{ height: "30px", width: "30px", cursor: "pointer" }} />
          </div>
        </div>

      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
}

export default MusicPlayer;