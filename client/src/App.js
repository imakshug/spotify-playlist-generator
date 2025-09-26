import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [songNames, setSongNames] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !user) {
      handleSpotifyCallback(code);
    }
  }, [user]);

  const handleSpotifyLogin = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/login`);
      window.location.href = response.data.url;
    } catch (error) {
      setMessage('Failed to initiate Spotify login');
      console.error('Login error:', error);
    }
  };

  const handleSpotifyCallback = async (code) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/auth/callback`, { code });
      setUser(response.data.user);
      localStorage.setItem('spotify_access_token', response.data.access_token);
      
      // Clean URL
      window.history.replaceState({}, document.title, '/');
      setMessage(`Welcome, ${response.data.user.display_name}!`);
    } catch (error) {
      setMessage('Failed to authenticate with Spotify');
      console.error('Callback error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTracks = async () => {
    if (!songNames.trim()) {
      setMessage('Please enter some song names');
      return;
    }

    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken) {
      setMessage('Please login with Spotify first');
      return;
    }

    try {
      setLoading(true);
      const songList = songNames.split('\n').filter(song => song.trim());
      
      const response = await axios.post(`${API_BASE_URL}/search`, {
        songNames: songList,
        accessToken
      });

      setSearchResults(response.data);
      setMessage(`Found ${response.data.found} out of ${response.data.total} songs`);
    } catch (error) {
      setMessage('Failed to search for tracks');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!searchResults || searchResults.tracks.length === 0) {
      setMessage('No tracks to add to playlist');
      return;
    }

    if (!playlistName.trim()) {
      setMessage('Please enter a playlist name');
      return;
    }

    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken || !user) {
      setMessage('Please login with Spotify first');
      return;
    }

    try {
      setLoading(true);
      const trackUris = searchResults.tracks.map(track => track.uri);
      
      const response = await axios.post(`${API_BASE_URL}/create-playlist`, {
        playlistName,
        trackUris,
        accessToken,
        userId: user.id
      });

      setMessage(`✅ Playlist "${playlistName}" created successfully with ${response.data.tracksAdded} tracks!`);
      
      // Reset form
      setSongNames('');
      setPlaylistName('');
      setSearchResults(null);
      
    } catch (error) {
      setMessage('Failed to create playlist');
      console.error('Playlist creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('spotify_access_token');
    setSearchResults(null);
    setSongNames('');
    setPlaylistName('');
    setMessage('Logged out successfully');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Spotify Playlist Generator</h1>
        <p>Paste song names and create playlists instantly!</p>
        
        {message && <div className={`message ${message.includes('✅') ? 'success' : 'info'}`}>{message}</div>}
        
        {!user ? (
          <div className="login-section">
            <p>Connect your Spotify account to get started</p>
            <button onClick={handleSpotifyLogin} disabled={loading} className="spotify-btn">
              {loading ? 'Connecting...' : 'Login with Spotify'}
            </button>
          </div>
        ) : (
          <div className="main-content">
            <div className="user-info">
              <span>Welcome, {user.display_name}!</span>
              <button onClick={logout} className="logout-btn">Logout</button>
            </div>
            
            <div className="form-section">
              <div className="input-group">
                <label htmlFor="songNames">Song Names (one per line):</label>
                <textarea
                  id="songNames"
                  value={songNames}
                  onChange={(e) => setSongNames(e.target.value)}
                  placeholder={`Enter song names like:
Bohemian Rhapsody - Queen
Imagine - John Lennon
Billie Jean - Michael Jackson`}
                  rows="10"
                  className="song-input"
                />
              </div>
              
              <button onClick={searchTracks} disabled={loading} className="search-btn">
                {loading ? 'Searching...' : 'Search Tracks'}
              </button>
            </div>
            
            {searchResults && (
              <div className="results-section">
                <h3>Search Results ({searchResults.found}/{searchResults.total} found)</h3>
                <div className="tracks-list">
                  {searchResults.tracks.map((track, index) => (
                    <div key={track.id} className="track-item">
                      <img src={track.album.images[2]?.url} alt={track.name} className="track-image" />
                      <div className="track-info">
                        <strong>{track.name}</strong>
                        <br />
                        <span>{track.artists.map(artist => artist.name).join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="playlist-section">
                  <div className="input-group">
                    <label htmlFor="playlistName">Playlist Name:</label>
                    <input
                      id="playlistName"
                      type="text"
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      placeholder="Enter playlist name"
                      className="playlist-input"
                    />
                  </div>
                  
                  <button onClick={createPlaylist} disabled={loading} className="create-btn">
                    {loading ? 'Creating...' : 'Create Playlist'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
