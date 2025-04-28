import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg shadow-sm" style={{ backgroundColor: "#66a2a9", height: "8vh" }}>
      <div className="container-fluid d-flex justify-content-start">
        <Link 
          to="/" 
          className="navbar-brand text-dark fw-bold me-4" 
          style={{ fontSize: "1.5rem", transition: "color 0.3s" }}
        >
          Home
        </Link>
        <Link 
          to="/history" 
          className="nav-link text-dark fw-semibold" 
          style={{ fontSize: "1.25rem", transition: "color 0.3s" }}
        >
          History
        </Link>
        <Link 
          to="/albums" 
          className="nav-link text-dark fw-semibold" 
          style={{ fontSize: "1.25rem", transition: "color 0.3s" }}
        >
          Albums
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;