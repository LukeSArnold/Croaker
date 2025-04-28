import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import History from './pages/History';
import Navbar from './components/Navbar';
import MusicPlayer from './components/MusicPlayer';
import AlbumsList from './pages/AlbumsList';
import AlbumPage from './pages/Album'; // <-- import your album page
import ArtistPage from './pages/Artist';

function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/albums" element={<AlbumsList />} />
        <Route path="/album/:albumId" element={<AlbumPage />} />
        <Route path="/artist/:artistId" element={<ArtistPage />} />
      </Routes>
      <MusicPlayer />
    </div>
  );
}

export default App;
