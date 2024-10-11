const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

if (!client_id || !client_secret) {
  throw new Error(
    "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in the environment variables"
  );
}

async function refreshAccessToken(refresh_token) {
  console.log("contact with refrech function");
  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
        },
      }
    );

    return tokenResponse.data.access_token;
  } catch (error) {
    throw new Error("Failed to refresh access token");
  }
}

router.get("/", async (req, res) => {
  const sessionData = req.cookies.__session
    ? JSON.parse(req.cookies.__session)
    : null;
  console.log(sessionData);
  let access_token = sessionData ? sessionData.accessToken : null;
  const refresh_token = sessionData ? sessionData.refreshToken : null;

  // If access token is missing, attempt to refresh it
  if (!access_token) {
    if (!refresh_token) {
      return res.status(400).json({ error: "missing_refresh_token" });
    }
    try {
      access_token = await refreshAccessToken(refresh_token);
      res.cookie(
        "__session",
        JSON.stringify({
          accessToken: access_token,
          refreshToken: refresh_token,
        }),
        { httpOnly: true, secure: true, sameSite: "None" }
      );
    } catch (error) {
      console.error("Error refreshing token:", error);
      return res.status(500).json({ error: "failed_to_refresh_token" });
    }
  }

  try {
    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + access_token },
    });

    const topTracksResponse = {
      shortTermTracks: [],
      mediumTermTracks: [],
      longTermTracks: [],
    };

    const topArtistsResponse = {
      shortTermArtists: [],
      mediumTermArtists: [],
      longTermArtists: [],
    };
    const savedPlaylistsResponse = {
      playlists: [],
    };

    try {
      const shortTermTrack = await axios.get(
        "https://api.spotify.com/v1/me/top/tracks?time_range=short_term",
        {
          headers: { Authorization: "Bearer " + access_token },
        }
      );
      topTracksResponse.shortTermTracks = shortTermTrack.data.items || [];
    } catch (error) {
      console.error("Error fetching top tracks (short term):", error);
    }

    try {
      const mediumTermTrack = await axios.get(
        "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term",
        {
          headers: { Authorization: "Bearer " + access_token },
        }
      );
      topTracksResponse.mediumTermTracks = mediumTermTrack.data.items || [];
    } catch (error) {
      console.error("Error fetching top tracks (medium term):", error);
    }

    try {
      const longTermTrack = await axios.get(
        "https://api.spotify.com/v1/me/top/tracks?time_range=long_term",
        {
          headers: { Authorization: "Bearer " + access_token },
        }
      );
      topTracksResponse.longTermTracks = longTermTrack.data.items || [];
    } catch (error) {
      console.error("Error fetching top tracks (long term):", error);
    }

    try {
      const shortTermArtists = await axios.get(
        "https://api.spotify.com/v1/me/top/artists?time_range=short_term",
        {
          headers: { Authorization: "Bearer " + access_token },
        }
      );
      topArtistsResponse.shortTermArtists = shortTermArtists.data.items || [];
    } catch (error) {
      console.error("Error fetching top artists (short term):", error);
    }

    try {
      const mediumTermArtists = await axios.get(
        "https://api.spotify.com/v1/me/top/artists?time_range=medium_term",
        {
          headers: { Authorization: "Bearer " + access_token },
        }
      );
      topArtistsResponse.mediumTermArtists = mediumTermArtists.data.items || [];
    } catch (error) {
      console.error("Error fetching top artists (medium term):", error);
    }

    try {
      const longTermArtists = await axios.get(
        "https://api.spotify.com/v1/me/top/artists?time_range=long_term",
        {
          headers: { Authorization: "Bearer " + access_token },
        }
      );
      topArtistsResponse.longTermArtists = longTermArtists.data.items || [];
    } catch (error) {
      console.error("Error fetching top artists (long term):", error);
    }

    try {
      const savedPlaylists = await axios.get(
        "https://api.spotify.com/v1/me/playlists",
        {
          headers: { Authorization: "Bearer " + access_token },
        }
      );
      // topArtistsResponse.longTermArtists = longTermArtists.data.items || [];
      savedPlaylistsResponse.playlists = savedPlaylists.data.items;
    } catch (error) {
      console.error("Error fetching top artists (long term):", error);
    }

    res.json({
      user_profile: profileResponse.data,
      topTracks: topTracksResponse,
      topArtists: topArtistsResponse,
      savedPlaylists: savedPlaylistsResponse,
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    res
      .status(500)
      .json({ error: "failed_to_fetch_profile", details: error.message });
  }
});

module.exports = router;
