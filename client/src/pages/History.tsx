import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const { setTrackId, setTrackName, setArtistName, setArtistId, setAlbumArtUri } = useTrack();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);

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

  const downloadTrack = async (trackId: number, trackName: string, artistName: string, created: boolean) => {
    if (!created) return;

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

  const updatePlayerInfo = (track: Track) => {
    setTrackId(track.id);
    setArtistName(track.artist.name);
    setTrackName(track.name);
    setAlbumArtUri(track.album.albumArtUri);
    setArtistId(track.artist.id);
  };

  const handlePlayTrack = (track: Track) => {
    if (!track.created) return;
    updatePlayerInfo(track);
  };

  return (
    <div className="container-fluid" style={{ height: "100vh" }}>
      <div>
        <div className="row" style={{ height: "100%" }}>
          <div className="col-md-12" style={{ height: "100%", backgroundColor: "#1d3538" }}>
            <div className="d-flex flex-wrap justify-content-center p-4" style={{ flex: 1 }}>
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="card m-3 track-card"
                  style={{
                    width: "200px",
                    backgroundColor: track.created ? "#2d4d50" : "#1e3b3d",
                    border: "none",
                    position: "relative",
                    overflow: "hidden",
                    height: "auto",
                    cursor: track.created ? "pointer" : "not-allowed",
                    transition: "background-color 0.3s ease",
                  }}
                  onClick={() => handlePlayTrack(track)}
                >
                  <div
                    className="image-wrapper"
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <img
                      src={track.album.albumArtUri}
                      alt={`${track.album.name} cover`}
                      className="card-img-top album-image"
                      style={{
                        width: "100%",
                        transition: "all 0.3s ease",
                      }}
                    />
                    <div
                      className="overlay"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                      }}
                    />
                    <div
                      className="play-button-overlay"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: "30px",
                        color: "#ffffff",
                        opacity: 0,
                        transition: "opacity 0.3s ease",
                      }}
                    >
                      ▶
                    </div>
                  </div>

                  <div className="card-body text-center">
                    <h5
                      className="card-title"
                      style={{ color: "white", marginBottom: "8px" }}
                      onClick={() => handlePlayTrack(track)}
                    >
                      {track.name}
                    </h5>

                    <p
                      className="card-text album-text"
                      style={{
                        color: "#66a2a9",
                        marginBottom: "4px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/album/${track.album.id}`);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.textShadow = "0 0 10px #66a2a9";
                        e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.textShadow = "none";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {track.album.name}
                    </p>

                    <p
                      className="card-text artist-text"
                      style={{
                        color: "#aaaaaa",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/artist/${track.artist.id}`);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                        e.currentTarget.style.textShadow = "0 0 10px #66a2a9";
                        e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                        e.currentTarget.style.textShadow = "none";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {track.artist.name}
                    </p>
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTrack(track.id, track.name, track.artist.name, track.created);
                    }}
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      backgroundColor: "#66a2a9",
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "50%",
                      cursor: track.created ? "pointer" : "not-allowed",
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