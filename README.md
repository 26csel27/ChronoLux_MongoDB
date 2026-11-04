# ChronoLux — Local MongoDB Edition

## Requirements
- Node.js LTS
- MongoDB Community Server running locally

## 1. Start MongoDB
Install MongoDB Community Server for Windows and ensure the MongoDB service is running.
The default local connection is:
`mongodb://127.0.0.1:27017/chronolux`

You can also start it from an Administrator terminal if installed as a Windows service:
`net start MongoDB`

If you installed MongoDB without a Windows service, start `mongod` using your own configured dbPath.

## 2. Configure environment
In this project folder, copy `.env.example` to `.env`.
Generate a secret:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
Paste it after `SESSION_SECRET=` in `.env`.

## 3. Install packages
Open Command Prompt in the ChronoLuxApp folder:
`npm install`

## 4. Start the website
`npm start`

Open:
`http://localhost:3000`

Do not open the HTML files by double-clicking them. The application must run through Express.

## 5. Database
Mongoose creates the `chronolux` database and `users` collection when the first account is registered.
MongoDB also stores Express sessions in the `sessions` collection.

To inspect data, use MongoDB Compass and connect to:
`mongodb://127.0.0.1:27017`

## Notes
- Registration and login use bcrypt password hashing.
- Sessions are stored in MongoDB.
- Dashboard HTML is protected by the server session.
- The cart in this starter is browser-memory only; it resets on refresh. It is not yet saved in MongoDB.
- Use HTTPS, secure production cookie settings, CSRF protection, backups, and a production-ready deployment setup before exposing the site publicly.
