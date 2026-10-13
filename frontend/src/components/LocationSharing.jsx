import { useCallback, useEffect, useRef, useState } from "react";
import "./LocationSharing.css";

const API = "http://localhost:5000/api/location";
const STALE_AFTER_MS = 2 * 60 * 1000;

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function timeAgo(value) {
  if (!value) return "No location update yet";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Updated just now";
  if (seconds < 3600) return `Updated ${Math.floor(seconds / 60)} min ago`;
  return `Updated ${Math.floor(seconds / 3600)} hr ago`;
}

export default function LocationSharing() {
  const [sharing, setSharing] = useState(false);
  const [myPosition, setMyPosition] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [friendLocations, setFriendLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [thresholdKm, setThresholdKm] = useState("5");
  const watchId = useRef(null);
  const token = localStorage.getItem("token");
  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`, "Content-Type": "application/json",
  }), [token]);

  const loadData = useCallback(async () => {
    try {
      const [sr, fr] = await Promise.all([
        fetch(`${API}/me`, { headers: headers() }),
        fetch(`${API}/friends`, { headers: headers() }),
      ]);
      const status = await sr.json(), friends = await fr.json();
      if (sr.ok) {
        // The component starts with sharing off; refreshing data must not turn off
        // an active browser watch during the current session.
        setUpdatedAt(status.updatedAt || null);
      }
      if (fr.ok) setFriendLocations(Array.isArray(friends.locations) ? friends.locations : []);
      else setMessage(friends.message || "Could not load friends' shared locations.");
    } catch {
      setMessage("Could not connect to SafeSpace. Check that the backend is running.");
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => {
    loadData();
    return () => {
      if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [loadData]);

  const updateCoordinates = async (latitude, longitude) => {
    const response = await fetch(`${API}/me`, {
      method: "PUT", headers: headers(), body: JSON.stringify({ latitude, longitude }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Location update failed.");
    setMyPosition({ latitude, longitude });
    setUpdatedAt(data.updatedAt || new Date().toISOString());
  };

  const startSharing = () => {
    setMessage("");
    if (!navigator.geolocation) { setMessage("This browser does not support location services."); return; }
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setMessage("Location sharing requires HTTPS or localhost."); return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude, longitude = position.coords.longitude;
      try {
        const response = await fetch(`${API}/share`, {
          method: "PUT", headers: headers(),
          body: JSON.stringify({ enabled: true, latitude, longitude }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not start sharing.");
        setMyPosition({ latitude, longitude });
        setUpdatedAt(data.updatedAt || new Date().toISOString());
        setSharing(true);
        setMessage("Location sharing is on. Accepted friends who also share can see your latest location.");
        watchId.current = navigator.geolocation.watchPosition(async (next) => {
          try {
            await updateCoordinates(next.coords.latitude, next.coords.longitude);
            await loadData();
          } catch (error) { setMessage(error.message || "A location update failed."); }
        }, (error) => setMessage(`Location updates paused: ${error.message}`), {
          enableHighAccuracy: true, maximumAge: 15000, timeout: 20000,
        });
        await loadData();
        setSharing(true);
      } catch (error) { setMessage(error.message || "Could not start location sharing."); }
      finally { setBusy(false); }
    }, (error) => {
      setMessage(`Location permission or position unavailable: ${error.message}`);
      setBusy(false);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };

  const stopSharing = async () => {
    setBusy(true); setMessage("");
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current); watchId.current = null;
    }
    try {
      const response = await fetch(`${API}/share`, {
        method: "PUT", headers: headers(), body: JSON.stringify({ enabled: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not stop sharing.");
      setSharing(false); setMyPosition(null);
      setMessage("Location sharing is off. Friends can no longer retrieve your location.");
      await loadData();
    } catch (error) { setMessage(error.message || "Could not stop sharing. Please retry."); }
    finally { setBusy(false); }
  };

  const distanceLabel = (friend) => {
    if (!myPosition) return "Distance unavailable until you share your location";
    const km = distanceKm(myPosition.latitude, myPosition.longitude, friend.latitude, friend.longitude);
    return `${km.toFixed(1)} km away · ${km > Number(thresholdKm) ? "Outside" : "Within"} threshold`;
  };

  return <section className="ls-wrap">
    <div className="ls-heading">
      <div><div className="ls-eyebrow">PRIVACY-FIRST LOCATION</div><h2>Location sharing</h2><p>Share only when you choose. You can stop sharing at any time.</p></div>
      <span className={`ls-status ${sharing ? "is-on" : ""}`}><i />{sharing ? "Sharing on" : "Not tracking"}</span>
    </div>
    {message && <div className="ls-message" role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss">×</button></div>}
    <div className="ls-controls">
      <div className="ls-control-icon">⌖</div>
      <div className="ls-control-copy"><strong>{sharing ? "Your location is being shared" : "Your location is private"}</strong><p>{sharing ? "Your latest coordinates are available to accepted friends who enabled sharing." : "Start sharing to publish your location to accepted friends. Browser permission is required."}</p><small>{updatedAt ? timeAgo(updatedAt) : "No location has been shared yet"}</small></div>
      {sharing ? <button className="ls-stop" onClick={stopSharing} disabled={busy}>{busy ? "Updating…" : "Stop sharing"}</button> : <button className="ls-start" onClick={startSharing} disabled={busy}>{busy ? "Waiting for permission…" : "Start sharing"}</button>}
    </div>
    <div className="ls-threshold"><div><strong>Distance threshold</strong><p>Currently labels distances only. Automatic alerts come in the next milestone.</p></div><label>Threshold<select value={thresholdKm} onChange={(e) => setThresholdKm(e.target.value)}><option value="1">1 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option></select></label></div>
    <div className="ls-friends-head"><div><h3>Friends sharing location</h3><p>Only accepted friends who opted in are listed.</p></div><span>{friendLocations.length}</span></div>
    {loading ? <div className="ls-empty">Loading shared locations…</div> : friendLocations.length === 0 ? <div className="ls-empty"><span>⌖</span><strong>No friends are sharing right now</strong><p>Friends appear here only when connected to you and explicitly sharing their location.</p></div> :
      <div className="ls-friend-list">{friendLocations.map((friend) => {
        const stale = !friend.updatedAt || Date.now() - new Date(friend.updatedAt).getTime() > STALE_AFTER_MS;
        return <article className="ls-friend" key={friend.userId}>
          <div className="ls-friend-avatar">{(friend.fullName || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
          <div className="ls-friend-main"><strong>{friend.fullName}</strong><span>{friend.email}</span><small className={stale ? "ls-stale" : "ls-fresh"}><i />{stale ? `Location may be stale · ${timeAgo(friend.updatedAt)}` : timeAgo(friend.updatedAt)}</small></div>
          <div className="ls-distance">{distanceLabel(friend)}<small>{Number(friend.latitude).toFixed(4)}, {Number(friend.longitude).toFixed(4)}</small></div>
        </article>;
      })}</div>}
    <div className="ls-safety-note"><span>ⓘ</span><p>Location can become outdated if a device sleeps, loses connectivity, or the browser pauses background activity. Do not rely on this as an emergency service.</p></div>
  </section>;
}
