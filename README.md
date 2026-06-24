# BFHL Challenge

Node.js + Express backend with a simple JS frontend for the Chitkara Full Stack Engineering Challenge.

## Run locally

1. `npm install`
2. `npm start`
3. Open `http://localhost:3000`

## API

- POST `/bfhl`
- Request body: `{ "data": ["A->B", "A->C"] }`
- Response includes `hierarchies`, `invalid_entries`, `duplicate_edges`, and `summary`.

## Notes

- Replace placeholders in `server.js` with your actual `user_id`, `email_id`, and `college_roll_number`.
- The frontend is served from `public/index.html`.
