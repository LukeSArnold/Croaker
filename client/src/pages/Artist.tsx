import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

interface Album {
  id: number;
  name: string;
  albumArtUri: string;
  released: string;
}

interface Artist {
  id: number;
  name: string;
  albums: Album[];
}

function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);

  useEffect(() => {
    async function fetchArtist() {
      try {
        const response = await fetch(`/getartist?artistId=${artistId}`);
        const data = await response.json();
        setArtist(data);
      } catch (error) {
        console.error("Failed to fetch artist:", error);
      }
    }

    fetchArtist();
  }, [artistId]);

  if (!artist) {
    return <div style={{ color: "white", textAlign: "center", marginTop: "50px" }}>Loading...</div>;
  }

  return (
    <div className="container-fluid" style={{ backgroundColor: "#1d3538", minHeight: "100vh", padding: "2rem" }}>
      {/* Artist Name */}
      <h1 style={{ color: "white", fontSize: "3rem", textAlign: "center", marginBottom: "2rem" }}>
        {artist.name}
      </h1>

      {/* Albums */}
      <div className="row justify-content-center">
        {artist.albums.map((album) => (
          <div
            key={album.id}
            className="m-3 d-flex flex-column align-items-center"
            style={{
              width: "300px",
              height: "auto",
              border: "none",
              color: "white",
              textAlign: "center",
              overflow: "hidden",
              cursor: "pointer",
            }}
            onClick={() => navigate(`/album/${album.id}`)}
          >
            <div
              style={{
                width: "100%",
                overflow: "hidden",
                borderRadius: "12px",
              }}
            >
              <img
                src={album.albumArtUri}
                alt={`${album.name} cover`}
                style={{
                  width: "80%",
                  objectFit: "contain",
                  borderRadius: "12px",
                }}
              />
            </div>
            <div className="card-body p-2" style={{ width: "100%" }}>
              <h5 className="card-title" style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
                {album.name}
              </h5>
              <p className="card-text" style={{ fontSize: "1.1rem", color: "#cccccc", margin: 0 }}>
                {album.released}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArtistPage;