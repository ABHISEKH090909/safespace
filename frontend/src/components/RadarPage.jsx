import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./RadarPage.css";

const API = "http://localhost:5000/api/location";
const POLL_MS = 3000;

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function initials(name = "?") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
}

function timeAgo(value) {
  if (!value) return "No update";
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)} hr ago`;
}

export default function RadarPage({ user, friend, initialPosition, onBack }) {
  const [myPosition, setMyPosition] = useState(initialPosition || null);
  const [friendPosition, setFriendPosition] = useState(null);
  const [friendUpdatedAt, setFriendUpdatedAt] = useState(null);
  const [loadingFriend, setLoadingFriend] = useState(true);
  const [message, setMessage] = useState("");
  const [stopping, setStopping] = useState(false);
  const [thresholdKm, setThresholdKm] = useState(1);
  const [thresholdDraft, setThresholdDraft] = useState("1");
  const [thresholdUnit, setThresholdUnit] = useState("km");
  const thresholdEdited = useRef(false);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [thresholdAlert, setThresholdAlert] = useState(false);
  const alertWasActive = useRef(false);
  const watchId = useRef(null);

  const token = localStorage.getItem("token");

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const selectedFriendId = String(friend?._id || friend?.id || "");

  const refreshFriendLocation = useCallback(async () => {
    try {
      const response = await fetch(`${API}/friends`, {
        headers: headers(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load your friend's location.");
      }

      const locations = Array.isArray(data.locations) ? data.locations : [];
      const match = locations.find(
        (location) => String(location.userId) === selectedFriendId
      );

      if (match) {
        setFriendPosition({
          latitude: Number(match.latitude),
          longitude: Number(match.longitude),
        });
        setFriendUpdatedAt(match.updatedAt || null);
      } else {
        // The backend only returns accepted friends who explicitly share.
        // Therefore absence means the selected friend is not currently sharing.
        setFriendPosition(null);
        setFriendUpdatedAt(null);
      }

      const thresholdResponse = await fetch(
        `${API}/friends/${encodeURIComponent(selectedFriendId)}/threshold`,
        { headers: headers() }
      );
      const thresholdData = await thresholdResponse.json();
      if (!thresholdResponse.ok) {
        throw new Error(thresholdData.message || "Could not load the shared threshold.");
      }
      const sharedThreshold = Number(thresholdData.distanceThresholdKm);
      if (Number.isFinite(sharedThreshold)) {
        setThresholdKm(sharedThreshold);
        const unit = sharedThreshold < 1 ? "m" : "km";
        if (!thresholdEdited.current) {
          setThresholdUnit(unit);
          setThresholdDraft(String(unit === "m" ? sharedThreshold * 1000 : sharedThreshold));
        }
      }

      setMessage("");
    } catch (error) {
      setMessage(error.message || "Could not refresh your friend's location.");
    } finally {
      setLoadingFriend(false);
    }
  }, [headers, selectedFriendId]);

  const sendMyLocation = useCallback(
    async (latitude, longitude) => {
      const response = await fetch(`${API}/me`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update your location.");
      }
    },
    [headers]
  );

  useEffect(() => {
    refreshFriendLocation();

    const interval = window.setInterval(refreshFriendLocation, POLL_MS);

    return () => window.clearInterval(interval);
  }, [refreshFriendLocation]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setMyPosition(nextPosition);

        try {
          await sendMyLocation(
            nextPosition.latitude,
            nextPosition.longitude
          );
        } catch (error) {
          setMessage(error.message || "Could not update your location.");
        }
      },
      (error) => {
        setMessage(`Your live location update paused: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [sendMyLocation]);

  const distance = useMemo(() => {
    if (!myPosition || !friendPosition) return null;

    return distanceKm(
      myPosition.latitude,
      myPosition.longitude,
      friendPosition.latitude,
      friendPosition.longitude
    );
  }, [myPosition, friendPosition]);

  const thresholdExceeded = distance !== null && distance > thresholdKm;

  useEffect(() => {
    setThresholdAlert(thresholdExceeded);
    if (thresholdExceeded && !alertWasActive.current && "Notification" in window && Notification.permission === "granted") {
      new Notification("SafeSpace distance alert", {
        body: `You and ${friend?.fullName || "your friend"} are ${formatDistance(distance)} apart, beyond the shared ${formatDistance(thresholdKm)} threshold.`,
      });
    }
    alertWasActive.current = thresholdExceeded;
  }, [thresholdExceeded, distance, thresholdKm, friend?.fullName]);

  const saveThreshold = async (event) => {
    event.preventDefault();
    const enteredThreshold = Number(thresholdDraft);
    const nextThreshold = thresholdUnit === "m" ? enteredThreshold / 1000 : enteredThreshold;
    if (!Number.isFinite(enteredThreshold) || enteredThreshold <= 0 || nextThreshold < 0.001 || nextThreshold > 1000) {
      setMessage("Choose a threshold of at least 1 m and no more than 1000 km.");
      return;
    }
    setSavingThreshold(true);
    try {
      const response = await fetch(
        `${API}/friends/${encodeURIComponent(selectedFriendId)}/threshold`,
        {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify({ thresholdKm: nextThreshold }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save the threshold.");
      const savedThreshold = Number(data.distanceThresholdKm);
      const savedUnit = savedThreshold < 1 ? "m" : "km";
      setThresholdKm(savedThreshold);
      setThresholdUnit(savedUnit);
      setThresholdDraft(String(savedUnit === "m" ? savedThreshold * 1000 : savedThreshold));
      thresholdEdited.current = false;
      setMessage("Shared threshold saved. It is now active for both users.");
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch (error) {
      setMessage(error.message || "Could not save the threshold.");
    } finally {
      setSavingThreshold(false);
    }
  };

  const stopSharingAndBack = async () => {
    setStopping(true);
    setMessage("");

    try {
      if (watchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }

      const response = await fetch(`${API}/share`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ enabled: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not stop location sharing.");
      }

      onBack();
    } catch (error) {
      setMessage(error.message || "Could not stop location sharing.");
      setStopping(false);
    }
  };

  return (
    <div className="radar-page">
      <header className="radar-topbar">
        <button type="button" className="radar-back" onClick={onBack}>
          <span>←</span> Dashboard
        </button>

        <div className="radar-brand">
          <span className="radar-brand-mark">✦</span>
          <span>Safe<span>Space</span></span>
        </div>

        <div className="radar-live">
          <i />
          LIVE PAIR
        </div>
      </header>

      <main className="radar-content">
        <section className="radar-heading">
          <div>
            <div className="radar-eyebrow">TRUSTED CONNECTION</div>
            <h1>Pair radar</h1>
            <p>
              Your location is shared with your accepted friend while this
              session is active.
            </p>
          </div>

          <div className={`radar-status ${friendPosition ? "is-connected" : ""}`}>
            <i />
            {friendPosition ? "Both locations available" : "Waiting for friend"}
          </div>
        </section>

        {message && (
          <div className="radar-message" role="status">
            <span>ⓘ</span>
            <p>{message}</p>
            <button type="button" onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {thresholdAlert && (
          <div className="radar-threshold-alert" role="alert">
            <strong>Distance threshold exceeded</strong>
            <span>You and {friend?.fullName || "your friend"} are {formatDistance(distance)} apart. Shared limit: {formatDistance(thresholdKm)}.</span>
          </div>
        )}

        <section className="radar-layout">
          <div className={`radar-stage ${thresholdAlert ? "is-over-threshold" : ""}`}>
            <div className="radar-grid" />
            <div className="radar-circle radar-circle-1" />
            <div className="radar-circle radar-circle-2" />
            <div className="radar-circle radar-circle-3" />
            <div className="radar-circle radar-circle-4" />
            <div className="radar-cross horizontal" />
            <div className="radar-cross vertical" />
            <div className="radar-sweep" />

            <div className="radar-center-label">SAFE<span>SPACE</span></div>

            {myPosition && (
              <div className="radar-point radar-me-point" style={{ left: "50%", top: "50%" }}>
                <span className="radar-pulse" />
                <span className="radar-dot" />
                <strong>{initials(user?.fullName)}</strong>
                <small>You</small>
              </div>
            )}

            {friendPosition && (
              <>
                <div
                  className="radar-connection-line"
                  aria-hidden="true"
                />
                <div className="radar-point radar-friend-point">
                  <span className="radar-pulse" />
                  <span className="radar-dot" />
                  <strong>{initials(friend?.fullName)}</strong>
                  <small>{friend?.fullName || "Friend"}</small>
                </div>
              </>
            )}

            <div className="radar-coordinates radar-coordinates-top">
              <span>LAT</span> {myPosition?.latitude?.toFixed(4) || "—"}
            </div>
            <div className="radar-coordinates radar-coordinates-bottom">
              <span>LON</span> {myPosition?.longitude?.toFixed(4) || "—"}
            </div>
          </div>

          <aside className="radar-side">
            <div className="radar-people-card">
              <div className="radar-card-label">PAIRING</div>

              <div className="radar-person">
                <span className="radar-person-avatar">{initials(user?.fullName)}</span>
                <div>
                  <strong>{user?.fullName || "You"}</strong>
                  <small>Your device · Location on</small>
                </div>
                <span className="radar-online">ON</span>
              </div>

              <div className="radar-link">
                <span />
                <b>PAIR</b>
                <span />
              </div>

              <div className="radar-person">
                <span className="radar-person-avatar friend">{initials(friend?.fullName)}</span>
                <div>
                  <strong>{friend?.fullName || "Friend"}</strong>
                  <small>
                    {friendPosition
                      ? `Sharing · ${timeAgo(friendUpdatedAt)}`
                      : "Location sharing is off"}
                  </small>
                </div>
                <span className={`radar-online ${friendPosition ? "" : "off"}`}>
                  {friendPosition ? "ON" : "OFF"}
                </span>
              </div>
            </div>

            {friendPosition ? (
              <div className="radar-distance-card">
                <div className="radar-card-label">DISTANCE BETWEEN YOU</div>
                <strong>{formatDistance(distance)}</strong>
                <span>Direct GPS distance</span>
                <form className="radar-threshold-form" onSubmit={saveThreshold}>
                    <label htmlFor="radar-threshold">Alert both users above</label>
                    <div>
                      <input
                        id="radar-threshold"
                        type="number"
                        min={thresholdUnit === "m" ? "1" : "0.001"}
                        max={thresholdUnit === "m" ? "1000000" : "1000"}
                        step={thresholdUnit === "m" ? "1" : "0.001"}
                        value={thresholdDraft}
                        onChange={(event) => { thresholdEdited.current = true; setThresholdDraft(event.target.value); }}
                        required
                      />
                      <select
                        aria-label="Threshold unit"
                        value={thresholdUnit}
                        onChange={(event) => {
                          thresholdEdited.current = true;
                          const nextUnit = event.target.value;
                          const value = Number(thresholdDraft);
                          setThresholdDraft(String(thresholdUnit === "m" ? value / 1000 : value * 1000));
                          setThresholdUnit(nextUnit);
                        }}
                      >
                        <option value="m">m</option>
                        <option value="km">km</option>
                      </select>
                      <button type="submit" disabled={savingThreshold}>
                        {savingThreshold ? "Saving…" : "Save"}
                      </button>
                    </div>
                    <small>Both radar pages use this shared limit.</small>
                </form>
                <div className="radar-distance-line">
                  <i />
                  <span />
                  <i />
                </div>
              </div>
            ) : (
              <div className="radar-wait-card">
                <div className="radar-wait-icon">⌖</div>
                <div>
                  <strong>
                    {loadingFriend
                      ? "Checking friend's location…"
                      : `${friend?.fullName || "Your friend"}'s location is not on`}
                  </strong>
                  <p>
                    {loadingFriend
                      ? "SafeSpace is checking whether your friend has opted in."
                      : "Ask your friend to sign in on their device and enable Location Sharing. Their browser must grant permission separately."}
                  </p>
                </div>
              </div>
            )}

            <div className="radar-note">
              <span>🔒</span>
              <p>
                Only accepted friends who explicitly enable location sharing
                can appear on your radar. SafeSpace cannot turn on location
                permission for another person's device.
              </p>
            </div>

            <button
              type="button"
              className="radar-stop"
              onClick={stopSharingAndBack}
              disabled={stopping}
            >
              {stopping ? "Stopping…" : "Stop sharing & return"}
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}
