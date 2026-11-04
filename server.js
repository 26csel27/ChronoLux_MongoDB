require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chronolux";
const PUBLIC_DIR = path.join(__dirname, "public");

if (!process.env.SESSION_SECRET) {
  console.error("Missing SESSION_SECRET. Copy .env.example to .env and set a strong secret.");
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, required: true, match: /^[0-9]{10}$/ },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const User = mongoose.model("User", userSchema);

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

const sessionOptions = {
  name: "chronolux.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: "sessions",
    ttl: 8 * 60 * 60
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000
  }
};
app.use(session(sessionOptions));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." }
});

function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ success: false, message: "Please log in." });
    }
    return res.redirect("/login.html");
  }
  next();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    if (![name, email, phone, password].every(value => typeof value === "string")) {
      return res.status(400).json({ success: false, message: "Please complete all fields." });
    }

    const fullName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const mobile = phone.trim();

    if (fullName.length < 2 || fullName.length > 80 ||
        normalizedEmail.length > 254 || !validEmail(normalizedEmail) ||
        !/^[0-9]{10}$/.test(mobile) ||
        password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid name, email, 10-digit mobile number and password (8–72 bytes)."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phone: mobile,
      passwordHash
    });

    req.session.regenerate(error => {
      if (error) {
        return res.status(500).json({ success: false, message: "Account created, but session could not start. Please log in." });
      }

      req.session.user = {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email
      };

      req.session.save(saveError => {
        if (saveError) {
          return res.status(500).json({ success: false, message: "Account created, but session could not be saved. Please log in." });
        }
        return res.status(201).json({
          success: true,
          message: "Registration successful.",
          redirect: "/dashboard.html"
        });
      });
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: "This email is already registered." });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" ||
        email.length > 254 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ success: false, message: "Enter a valid email and password." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    req.session.regenerate(error => {
      if (error) {
        return res.status(500).json({ success: false, message: "Could not start your session." });
      }
      req.session.user = {
        id: user._id.toString(),
        name: user.fullName,
        email: user.email
      };
      req.session.save(saveError => {
        if (saveError) {
          return res.status(500).json({ success: false, message: "Could not save your session." });
        }
        return res.json({ success: true, message: "Login successful.", redirect: "/dashboard.html" });
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.session.user });
});

app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(error => {
    if (error) {
      return res.status(500).json({ success: false, message: "Logout failed." });
    }
    res.clearCookie("chronolux.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    res.json({ success: true, redirect: "/login.html" });
  });
});

// Protect dashboard before the static-file middleware.
app.get("/dashboard.html", requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});

app.use(express.static(PUBLIC_DIR, { index: false }));

app.get("/", (req, res) => {
  res.redirect(req.session.user ? "/dashboard.html" : "/login.html");
});

app.use((err, req, res, next) => {
  console.error("Unhandled application error:", err);
  res.status(500).send("Something went wrong.");
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB:", MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`ChronoLux running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Could not connect to MongoDB.");
    console.error("Check that MongoDB is installed and running, and verify MONGODB_URI in .env.");
    console.error(error.message);
    process.exit(1);
  }
}

start();
