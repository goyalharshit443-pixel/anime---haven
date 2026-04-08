# Anime Haven

## Overview

Anime Haven is a website with static frontend pages and a Node/SQLite backend for authentication, favourites, last watched history, contributor requests, and trending anime.

## Deployment Strategy

### Frontend (Netlify)
Netlify can host the static HTML/CSS/JS files, including `index.html`, category pages, and auth pages.

### Backend
The backend (`server.js`) requires Node and SQLite. Netlify cannot host this backend directly, so you should deploy it to a separate service such as Render, Railway, Fly.io, or Heroku.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run locally:
```bash
npm start
```

3. Google OAuth setup:
- Go to Google Cloud Console → APIs & Services → Credentials.
- Create an OAuth client ID for a Web application.
- Add authorized origins:
  - `http://localhost:3000`
  - your deployed frontend domain (for Netlify)
- Copy the OAuth client ID.

4. Configure the frontend:
- Open `config.js`.
- Set `window.API_BASE_URL` to your backend URL if the backend is deployed separately.
- Set `window.GOOGLE_CLIENT_ID` to the Google client ID.

5. Configure the backend:
- Set the environment variable `GOOGLE_CLIENT_ID` to the same Google OAuth client ID.
- Deploy your backend service and note the backend URL.

## Netlify Frontend Deployment

1. Push your repository to GitHub.
2. Create a new site on Netlify.
3. Set the publish directory to `.` and leave the build command blank.
4. Add `config.js` values:
   - `API_BASE_URL` should point to your backend URL.
   - `GOOGLE_CLIENT_ID` should match your Google OAuth client ID.

## Example config.js
```js
window.API_BASE_URL = 'https://anime-haven-backend.onrender.com';
window.GOOGLE_CLIENT_ID = '1234567890-abc123defgh.apps.googleusercontent.com';
```

## Backend Deployment

Use a service like Render or Railway.
- Add the repository.
- Set `NODE_ENV=production`.
- Set `GOOGLE_CLIENT_ID` as an environment variable.
- Ensure the backend URL is accessible from your Netlify frontend.

## Notes

- If frontend and backend are on the same origin, leave `API_BASE_URL` blank.
- If the backend is separate, all API fetches will use `config.js`.
- The Google OAuth client ID must be the same in both frontend and backend.
