import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import History from './pages/History';
import Navbar from './components/Navbar';
import MusicPlayer from './components/MusicPlayer';

function App() {
  return (
    <div>
    <Navbar/>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/history" element={<History />} />
    </Routes>
    {/* <MusicPlayer/> */}
    </div>
  );
}

export default App;