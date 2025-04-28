import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import "bootstrap/dist/css/bootstrap.min.css";
import { useTrack } from "../contexts/TrackContext";


interface Track {
  id: number;
  name: string;
  duration_ms: number;
  track_number: number;
  created: boolean;
  artist: {
    id: number;
    name: string;
  };
  album: {
    id: number;
    name: string;
    albumArtUri: string;
    released: string;
    artist: {
      id: number;
      name: string;
    };
  };
}

function History() {
  const { trackId, setTrackId } = useTrack();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Track play status
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null); // Track that is playing
  const [currentTime, setCurrentTime] = useState<number>(0); // Current time of track
  const [duration, setDuration] = useState<number>(0); // Track duration
  const audioRef = useRef<HTMLAudioElement | null>(null); // Audio element reference

  useEffect(() => {
    async function fetchHistory() {
      console.log("Fetching history...");
      try {
        const response = await fetch("/gethistory");
        const data = await response.json();
        setTracks(data);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    }

    fetchHistory();
  }, []);

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

  return (
    <div>
      <div className="container-fluid">
        <div className="row" style={{ height: "100%" }}>
          <div className="col-md-12" style={{ height: "100vh", backgroundColor: "#1d3538" }}>    
            {/* Track List */}
            <div className="d-flex flex-wrap justify-content-center p-4">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="card m-3"
                  style={{
                    width: "200px",
                    backgroundColor: track.created ? "#2d4d50" : "#1e3b3d", // Darken if created is false
                    border: "none",
                    position: "relative",
                    overflow: "hidden",
                    transition: "background-color 0.3s ease",
                    height: "auto",
                    cursor: track.created ? "pointer" : "not-allowed", // Disable click if created is false
                  }}
                >
                  <div className="image-wrapper" onClick={() => track.created && setTrackId(track.id)}>
                    <img
                      src={track.album.albumArtUri}
                      alt={`${track.album.name} cover`}
                      className="card-img-top album-image"
                      style={{ width: "100%" }}
                    />
                    {currentTrackId === track.id && isPlaying && (
                      <div
                        className="pause-button"
                        onClick={() => track.created && setTrackId(track.id)} // Use the same function for pausing
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          color: "white",
                          fontSize: "30px",
                          cursor: "pointer",
                        }}
                      >
                        ⏸
                      </div>
                    )}
                    {currentTrackId !== track.id || !isPlaying && (
                      <div
                        className="play-button"
                        onClick={() => track.created && setTrackId(track.id)} // Use the same function for play
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          color: "white",
                          fontSize: "30px",
                          cursor: "pointer",
                        }}
                      >
                        ▶
                      </div>
                    )}
                  </div>

                  <div className="card-body text-center">
                    <h5 className="card-title" style={{ color: "white" }}>{track.name}</h5>
                    <p className="card-text" style={{ color: "#cccccc", marginBottom: "4px" }}>{track.album.name}</p>
                    <p className="card-text" style={{ color: "#aaaaaa", fontSize: "0.9rem" }}>{track.artist.name}</p>
                  </div>

                  {/* Download Button at the bottom right of the card */}
                  <div
                    onClick={() => downloadTrack(track.id, track.name, track.artist.name, track.created)}
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      backgroundColor: "#66a2a9",
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "50%",
                      cursor: track.created ? "pointer" : "not-allowed", // Disable if created is false
                      fontSize: "20px",
                    }}
                  >
                    ⬇️
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default History;