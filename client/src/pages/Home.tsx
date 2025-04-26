import { useState } from 'react'
import { useNavigate } from "react-router";
import { Link } from "react-router";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect } from "react";

function Home() {

  async function convertContent() {
    console.log("CLIENT FETCHING CONTENT...");
    console.log(`converting from url "${inputUrl}"`);
    await fetch("/convert", {
    
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({inputUrl}),
    })
  }

  const [inputUrl, setInputUrl] = useState("")

  return (
    <div>
      <div className="container-fluid">
        <div className="row" style={{ height: "100%" }}>
          <div className="col-md-9" style={{height: "100vh", backgroundColor: "#1d3538" }}>
            <div className="d-flex justify-content-left align-items-center" style={{backgroundColor: "#66a2a9", height: "5vh"}}>
              <h4 className="me-4 nav-bar-item"> Profile </h4>
              <h4 className="me-4 nav-bar-item"> History </h4>
              <h4 className="me-4 nav-bar-item"> New Conversion </h4>
            </div>

            <div className="d-flex align-items-center flex-column h-100">
              <div className="d-flex justify-content-center p-5">
                <h1 style={{color: "white"}}> FROGGY WARE </h1>
              </div>

              <div className="d-flex justify-content-center w-100"> 
                <input style={{width: "70%"}} value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}/>
                <div className="d-flex justify-content-center align-items-center" style={{width: "100px", height: "50px", backgroundColor:"black"}} onClick={()=>convertContent()}>
                    <h1 className="convert-button"> GO! </h1>
                </div>
              </div>
            </div>
          </div>
        
          <div className="col-md-3" style={{ height: "100vh", backgroundColor: "#00646f" }}>
      
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;