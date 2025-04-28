import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

function Navbar() {
  return (
    <div className="d-flex justify-content-left align-items-center" style={{ backgroundColor: "#66a2a9", height: "5vh" }}>
      <Link to="/history" className="me-4 nav-bar-item" style={{ textDecoration: "none", color: "black" }}>
        <h4>History</h4>
      </Link>
      <Link to="/" className="me-4 nav-bar-item" style={{ textDecoration: "none", color: "black" }}>
        <h4>Home</h4>
      </Link>
    </div>
  );
}

export default Navbar;