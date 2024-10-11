const express = require("express");
const dotenv = require("dotenv");
const crypto = require("crypto");
const querystring = require("querystring");
const router = express.Router();
const axios = require("axios");

dotenv.config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

if (!client_id || !client_secret) {
  throw new Error(
    "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in the environment variables"
  );
}

function generateRandomString(length) {
  return crypto.randomBytes(length).toString("hex");
}

router.get("/", (req, res) => {
  const state = generateRandomString(8);
  res.cookie("spotify_auth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  const scope =
    "user-read-private user-read-email user-top-read user-follow-read user-library-read";
  const queryParams = querystring.stringify({
    response_type: "code",
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
    show_dialog: true,
  });

  res.redirect("https://accounts.spotify.com/authorize?" + queryParams);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies["spotify_auth_state"] : null;

  if (state === null || state !== storedState) {
    return res.status(400).json({
      error: `state_mismatch, state found was ${state} and stored state is- ${storedState}`,
    });
  }

  res.clearCookie("spotify_auth_state");

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
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

    const access_token = tokenResponse.data.access_token;
    const refresh_token = tokenResponse.data.refresh_token;

    res.cookie(
      "__session",
      JSON.stringify({
        accessToken: access_token,
        refreshToken: refresh_token,
      }),
      { httpOnly: true, secure: true, sameSite: "None" }
    );
    res.redirect("http://localhost:3000/");
  } catch (error) {
    console.error(
      "Error fetching token:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .json({ error: "failed_to_fetch_token", details: error.message });
  }
});
router.get("/logout", (req, res) => {
  try {
    // Clear session or token cookies
    res.clearCookie("spotify_auth_state", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.clearCookie("__session", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    // Optionally log the user out of Spotify as well
    // res.redirect("https://accounts.spotify.com/logout");

    // Redirect to the app's homepage
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000/");
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to log out" });
  }
});

module.exports = router;
