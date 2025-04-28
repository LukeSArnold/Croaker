import { useState } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";

function Home() {
  const [inputUrl, setInputUrl] = useState("");

  async function convertContent() {
    console.log("CLIENT FETCHING CONTENT...");
    console.log(`converting from url "${inputUrl}"`);
    await fetch("/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputUrl }),
    });
  }

  return (
    <div className="container-fluid" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="row" style={{ flexGrow: 1 }}>
        <div className="col-md-9" style={{ backgroundColor: "#1d3538" }}>
          <div className="d-flex align-items-center flex-column h-100">
            <div className="d-flex justify-content-center p-5">
              <h1 style={{ color: "white" }}> FROGGY WARE </h1>
            </div>
            <div className="d-flex justify-content-center w-100">
              <input
                style={{ width: "70%" }}
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
              />
              <div
                className="d-flex justify-content-center align-items-center"
                style={{
                  width: "100px",
                  height: "50px",
                  backgroundColor: "black",
                  cursor: "pointer",
                }}
                onClick={convertContent}
              >
                <h1 className="convert-button" style={{ color: "white" }}>
                  GO!
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3" style={{ backgroundColor: "#00646f" }} />
      </div>
    </div>
  );
}

export default Home;