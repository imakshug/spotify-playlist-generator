const express = require('express');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'http://localhost:8888', 'http://127.0.0.1:8888'],
  credentials: true
}));
app.use(express.json());

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback'
});

// Routes

// Get Spotify authorization URL
app.get('/auth/login', (req, res) => {
  const scopes = ['playlist-modify-public', 'playlist-modify-private', 'user-read-private'];
  
  // Create manual authorization URL to ensure exact match
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI);
  const scopeString = encodeURIComponent(scopes.join(' '));
  
  const authorizeURL = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopeString}`;
  
  console.log('Authorization URL:', authorizeURL);
  console.log('Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
  
  res.json({ url: authorizeURL });
});

// Handle Spotify callback and get access token
app.post('/auth/callback', async (req, res) => {
  const { code } = req.body;
  
  try {
    console.log('Received authorization code:', code);
    
    // Manual token exchange to ensure exact redirect URI match
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET
    });
    
    console.log('Token exchange parameters:', {
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      client_id: process.env.SPOTIFY_CLIENT_ID
    });
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokenData);
      throw new Error(tokenData.error_description || 'Failed to exchange code for token');
    }
    
    const { access_token, refresh_token } = tokenData;
    
    // Set tokens for spotify API
    spotifyApi.setAccessToken(access_token);
    if (refresh_token) spotifyApi.setRefreshToken(refresh_token);
    
    // Get user profile
    const userProfile = await spotifyApi.getMe();
    
    res.json({
      access_token,
      refresh_token,
      user: userProfile.body
    });
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(400).json({ error: 'Failed to authenticate with Spotify' });
  }
});

// Search for tracks
app.post('/search', async (req, res) => {
  const { songNames, accessToken } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }
  
  spotifyApi.setAccessToken(accessToken);
  
  try {
    const searchPromises = songNames.map(async (songName) => {
      try {
        const result = await spotifyApi.searchTracks(songName.trim(), { limit: 1 });
        return result.body.tracks.items[0] || null;
      } catch (error) {
        console.error(`Error searching for "${songName}":`, error);
        return null;
      }
    });
    
    const tracks = await Promise.all(searchPromises);
    const foundTracks = tracks.filter(track => track !== null);
    
    res.json({
      tracks: foundTracks,
      found: foundTracks.length,
      total: songNames.length
    });
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

// Create playlist
app.post('/create-playlist', async (req, res) => {
  const { playlistName, trackUris, accessToken, userId } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }
  
  spotifyApi.setAccessToken(accessToken);
  
  try {
    // Create playlist
    const playlist = await spotifyApi.createPlaylist(userId, playlistName, {
      description: 'Created with Spotify Playlist Generator',
      public: true
    });
    
    const playlistId = playlist.body.id;
    
    // Add tracks to playlist
    if (trackUris.length > 0) {
      await spotifyApi.addTracksToPlaylist(playlistId, trackUris);
    }
    
    res.json({
      playlist: playlist.body,
      tracksAdded: trackUris.length
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`🎵 Spotify Playlist Generator Server running on port ${PORT}`);
});