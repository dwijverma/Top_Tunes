const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authRoute = require("./Routes/authRoutes");
const profileRoute = require("./Routes/profileRoutes");

const app = express();
const port = process.env.PORT || 8888;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET,POST",
    credentials: true,
  })
);

app.use(cookieParser());

app.use("/login", authRoute);
app.use("/profile", profileRoute);

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
