# SafeSpace

SafeSpace is a location-sharing app for trusted friends. Users can create accounts, connect with friends, and choose when to share their location. When both friends are sharing, the Pair Radar shows the distance between them.

Friends can set a shared distance threshold in meters or kilometers. If the distance goes above that limit, the radar turns red and displays an alert.

## Features

- Create an account and log in
- Send and accept friend requests
- Choose when to start or stop location sharing
- View a friend’s location and distance on the Pair Radar
- Set a shared distance threshold for a friendship
- See an alert when the distance exceeds the threshold
- Receive optional browser notifications when permission is granted

The default threshold is **1 km** and the minimum is **1 m**. For live distance alerts, both users need to accept the friendship, enable location sharing, and have the radar open. Each user must grant location permission on their own device.

## Technology

- React
- Vite
- Node.js
- Express
- MongoDB and Mongoose
- JSON Web Tokens

## Project structure

```text
backend/    Express API, authentication, routes, and MongoDB models
frontend/   React and Vite web application
```

## Requirements

- Node.js **20.19+** or **22.12+**, as required by Vite 8 ([Vite documentation](https://vite.dev/guide/))
- npm
- MongoDB installed locally, or a MongoDB Atlas database

## Use your fork

1. Select **Fork** on this GitHub repository.
2. Clone your fork to your computer. Replace `YOUR-USERNAME` and `YOUR-FORK` with your GitHub username and repository name:

   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-FORK.git
   cd YOUR-FORK
   ```

3. Follow the local setup steps below.

## Configure MongoDB and the backend

You can use either a local MongoDB server or MongoDB Atlas.

### Local MongoDB

Start your local MongoDB server, then use this connection string in the backend environment file:

```text
mongodb://127.0.0.1:27017/safespace
```

### MongoDB Atlas

Create an Atlas database user, allow your computer’s IP address in the project’s network access settings, and copy the application connection string. See the [Atlas connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

Create a file named `backend/.env` and add your own settings:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/safespace
JWT_SECRET=replace_with_a_long_random_secret
```

For Atlas, replace the local MongoDB URL with your Atlas connection string. If your database password contains special characters, URL-encode them in the connection string.

Keep `backend/.env` private. Do not commit database credentials or secrets to GitHub. The repository’s `.gitignore` excludes environment files.

## Install and run the app

Run the backend and frontend in **two separate terminals**.

### Terminal 1: Backend

From the project folder:

```bash
cd backend
npm ci
npm run dev
```

The backend runs at `http://localhost:5000` by default. Keep this terminal open while using the app.

### Terminal 2: Frontend

From the project folder, open another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the URL Vite prints in the terminal, usually:

```text
http://localhost:5173
```

## Use SafeSpace

1. Open the frontend in your browser and create an account or log in.
2. Add a friend using their email address.
3. Have the friend log in and accept the friend request.
4. Select **Pair** next to the friend you want to share with. Allow location access when your browser asks.
5. The friend must also start sharing from their own device for both locations to appear.
6. When both locations are available, enter a distance threshold on the radar page, choose **m** or **km**, and save it.

The threshold is shared for that accepted friendship, so either user can change it. Browser notifications are optional and require browser permission.

## Location and privacy

Location sharing is opt-in. A friend’s location appears only when the friendship is accepted and that friend has enabled sharing. Each person grants location permission separately. Stopping sharing stops future location updates.

Browser geolocation requires a secure context such as HTTPS. Localhost is treated as secure for development. Do not rely on this application as an emergency service.

## Troubleshooting

- **The frontend cannot reach the backend:** Make sure the backend is running on port `5000`. The frontend currently uses `http://localhost:5000` for API requests.
- **MongoDB connection fails:** Check that the MongoDB server is running, or verify your Atlas connection string, database user, and network access settings.
- **Location is unavailable:** Allow location access in the browser. Each user needs to grant permission on their own device.
- **Friend location is missing:** Confirm the friend accepted the request and has started sharing from their device.

## License

No license has been specified for this project yet.
