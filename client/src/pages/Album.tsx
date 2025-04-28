import { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // for accessing albumId from the URL
import "bootstrap/dist/css/bootstrap.min.css";
import { useTrack } from "../contexts/TrackContext";

interface Track {
  id: number;
  name: string;
  duration_ms: number;
  track_number: number;
  artist: {
    id: number;
    name: string;
  };
}

interface Album {
  id: number;
  name: string;
  albumArtUri: string;
  released: string;
  artist: {
    id: number;
    name: string;
  };
  tracks: Track[];
}

function msToMinutesAndSeconds(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function AlbumPage() {
  const { setTrackId, setTrackName, setArtistName, setAlbumArtUri } = useTrack();
  const { albumId } = useParams<{ albumId: string }>(); // assume albumId is in the route
  const [album, setAlbum] = useState<Album | null>(null);

  useEffect(() => {
    async function fetchAlbum() {
      try {
        const response = await fetch(`/getalbum?albumId=${albumId}`);
        const data = await response.json();
        setAlbum(data);
      } catch (error) {
        console.error("Failed to fetch album:", error);
      }
    }

    fetchAlbum();
  }, [albumId]);

  if (!album) {
    return <div>Loading...</div>;
  }

  const handleTrackClick = (track: Track) => {
    setTrackId(track.id);
    setTrackName(track.name);
    setArtistName(track.artist.name);
    setAlbumArtUri(album.albumArtUri);
  };

  return (
    <div style={{backgroundColor:"#1d3538"}}>
    <div className="container pt-5" style={{ color: "white", minHeight: "100vh"}}>
      <div className="row align-items-center mb-5">
        {/* Album cover */}
        <div className="col-md-4 text-center">
          <img
            src={album.albumArtUri}
            alt={album.name}
            style={{
              width: "100%",
              maxWidth: "300px",
              height: "auto",
              borderRadius: "12px",
            }}
          />
        </div>

        {/* Album title and artist */}
        <div className="col-md-8">
          <h1 style={{ fontSize: "2.5rem" }}>{album.name}</h1>
          <h3 style={{ color: "#cccccc", marginTop: "10px" }}>{album.artist.name}</h3>
          <p style={{ color: "#aaaaaa", marginTop: "5px" }}>Released: {album.released}</p>
        </div>
      </div>

      {/* Tracklist */}
      <div>
        <h2 className="mb-3" style={{ fontSize: "2rem" }}>Tracks</h2>
        <ul className="list-group list-group-flush">
          {album.tracks.map((track) => (
            <li
              key={track.id}
              className="list-group-item"
              onClick={() => handleTrackClick(track)} // <-- click to update context
              style={{
                backgroundColor: "#1d3538",
                color: "white",
                borderBottom: "1px solid #2e4e51",
                fontSize: "1.2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer", // <-- add pointer cursor
              }}
            >
              <span>
                {track.track_number}. {track.name}
              </span>
              <span style={{ color: "#aaaaaa", fontSize: "0.9rem" }}>
                {msToMinutesAndSeconds(track.duration_ms)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
    </div>
  );
}

export default AlbumPage;
