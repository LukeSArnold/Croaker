import { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useTrack } from "../contexts/TrackContext";


function MusicPlayer() {
  const { trackId, setTrackId } = useTrack();

  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Track play status
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null); // Track that is playing
  const [currentTime, setCurrentTime] = useState<number>(0); // Current time of track
  const [duration, setDuration] = useState<number>(0); // Track duration
  const [currentTrackName, setCurrentTrackName] = useState<String>("")
  const [currentArtistName, setCurrentArtistName] = useState<String>("")
  const [albumArtUri, setAlbumArtUri] = useState<string>("")
  const audioRef = useRef<HTMLAudioElement | null>(null); // Audio element reference

  useEffect(() => {
    console.log("MUSIC PLAYER REGISTERED A TRACK CHANGE")
    playTrack(trackId, true)
  }, [trackId])


  useEffect(() => {
      // Set up the audio element once
      const audio = audioRef.current;

      if (audio) {
        // Handle audio time update to sync with the player
        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
        };

        // Handle audio loaded metadata to get the track duration
        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
        };
      }
    }, []);

  // Function to handle track play
  const playTrack = async (trackId: number, created: boolean) => {
    if (!created) return; // Don't play if track is not created

    // If the same track is clicked again, pause it
    if (currentTrackId === trackId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        // Fetch the song file from the server based on trackId
        const response = await fetch(`/getsong?trackId=${trackId}`);

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          // Set the new source for the existing audio element
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

  // Function to handle track download
  const downloadTrack = async (trackId: number, trackName: string, artistName: string, created: boolean) => {
    if (!created) return; // Don't download if track is not created

    try {
      const response = await fetch(`/getsong?trackId=${trackId}`);
      if (response.ok) {
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        const link = document.createElement("a");
        link.href = url;
        // Set the filename to "songName - artistName.mp3"
        link.download = `${trackName} - ${artistName}.mp3`;
        link.click();
      } else {
        console.error("Error fetching the song for download");
      }
    } catch (error) {
      console.error("Failed to download track:", error);
    }
  };

  // Handle Play/Pause toggle from the player bar
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

  // Handle seeking in the audio from the player bar
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
      {/* Music Player Bar at the bottom of the screen */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#012d2c", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="col-md-4 d-flex justify-content-left">
        <img
          src={albumArtUri}
          alt="Album Cover"
          style={{ width: "60px", height: "60px", borderRadius: "5px", marginRight: "10px" }}
        />
        <div className="d-flex flex-column justify-content-center">
          <h4 style={{ color: "white", marginBottom: "5px" }}>
            {currentTrackName}
          </h4>
          <span style={{ color: "white" }}>
            {currentArtistName}
          </span>
        </div>
      </div>

      <div className="col-md-4 d-flex flex-column align-items-center">
        <button
          onClick={togglePlayerPlayback}
          style={{
          backgroundColor: "#66a2a9",
          border: "none",
          color: "white",
          cursor: "pointer",
          }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="d-flex align-items-center">
          <span style={{ color: "white", margin: "10px" }}>
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
                width: "300px", // Adjust this value for longer/shorter scrubber
                margin: "0 10px", // Adds spacing between the scrubber and time labels
                background: `linear-gradient(to right, #66a2a9 ${currentTime / duration * 100}%, #444444 ${currentTime / duration * 100}%)`, // This sets the color change based on the progress
                appearance: "none", // Remove default styling
                height: "8px", // Make the scrubber a little thicker
                borderRadius: "5px", // Optional: smooth the edges
            }}
            />
            <span style={{ color: "white", margin: "10px" }}>
                {`${Math.floor(duration / 60)
                .toString()
                .padStart(2, '0')}:${Math.floor(duration % 60)
                .toString()
                .padStart(2, '0')}`}
            </span> 
        </div>
    </div>

    <div className="col-md-4 d-flex justify-content-center">
    
    </div>
  </div>

  {/* Audio element */}
  <audio ref={audioRef} />
  </div>
  );
}

export default MusicPlayer;