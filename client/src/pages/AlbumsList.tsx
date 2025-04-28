import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // <-- import navigate
import "bootstrap/dist/css/bootstrap.min.css";

interface Album {
  id: number;
  name: string;
  albumArtUri: string;
  released: string;
  artist: {
    id: number;
    name: string;
  };
}

function AlbumsList() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const navigate = useNavigate(); // <-- initialize navigate

  useEffect(() => {
    async function fetchAlbums() {
      try {
        const response = await fetch("/getalbums");
        const data = await response.json();
        setAlbums(data);
      } catch (error) {
        console.error("Failed to fetch albums:", error);
      }
    }

    fetchAlbums();
  }, []);

  function handleAlbumClick(albumId: number) {
    navigate(`/album/${albumId}`);
  }

  return (
    <div className="container-fluid" style={{ backgroundColor: "#1d3538", minHeight: "100vh" }}>
      <div className="row justify-content-center p-4">
        {albums.map((album) => (
          <div
            key={album.id}
            className="m-3 d-flex flex-column align-items-center"
            onClick={() => handleAlbumClick(album.id)} // <-- click to navigate
            style={{
              width: "300px",  
              height: "auto",
              border: "none",
              color: "white",
              textAlign: "center",
              overflow: "hidden",
              borderRadius: "12px",
              cursor: "pointer", // <-- make it obvious it's clickable
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
            <div
              className="card-body p-2"
              style={{
                width: "100%",
                padding: "10px",
              }}
            >
              <h5 className="card-title" style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>
                {album.name}
              </h5>
              <p className="card-text" style={{ fontSize: "1.1rem", color: "#cccccc", margin: 0 }}>
                {album.artist.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlbumsList;