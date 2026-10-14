import { useCallback, useEffect, useState } from "react";
import LocationSharing from "./LocationSharing";
import RadarPage from "./RadarPage";
import "./Dashboard.css";

function Dashboard({ user }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friendEmail, setFriendEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [pairedFriend, setPairedFriend] = useState(null);
  const [pairingFriendId, setPairingFriendId] = useState(null);

  const token = localStorage.getItem("token");

  const loadFriends = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setFriends(Array.isArray(data.friends) ? data.friends : []);
      else setNotice(data.message || "Could not load friends.");
    } catch {
      setNotice("Could not connect to the SafeSpace server.");
    }
  }, [token]);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/api/friends/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setRequests(Array.isArray(data.requests) ? data.requests : []);
      else setNotice(data.message || "Could not load friend requests.");
    } catch {
      setNotice("Could not connect to the SafeSpace server.");
    }
  }, [token]);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [loadFriends, loadRequests]);

  const sendFriendRequest = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("http://localhost:5000/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: friendEmail.trim() }),
      });
      const data = await response.json();
      setNotice(data.message || (response.ok ? "Friend request sent." : "Could not send request."));
      if (response.ok) {
        setFriendEmail("");
        await loadRequests();
      }
    } catch {
      setNotice("Could not connect to the SafeSpace server.");
    } finally {
      setBusy(false);
    }
  };

  const respondToRequest = async (friendshipId, action) => {
    setNotice("");
    try {
      const response = await fetch(`http://localhost:5000/api/friends/requests/${friendshipId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      setNotice(data.message || (response.ok ? "Request updated." : "Could not update request."));
      if (response.ok) {
        await Promise.all([loadFriends(), loadRequests()]);
      }
    } catch {
      setNotice("Could not connect to the SafeSpace server.");
    }
  };

  const pairWithFriend = (friend) => {
    setNotice("");
    if (!navigator.geolocation) {
      setNotice("This browser does not support location services.");
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setNotice("Location permission requires HTTPS or localhost.");
      return;
    }

    const selectedFriendId = String(friend?._id || friend?.id || "");
    setPairingFriendId(selectedFriendId);

    // This permission request belongs to the current user only.
    // A browser cannot request location permission on another person's device.
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          const response = await fetch("http://localhost:5000/api/location/share", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              enabled: true,
              friendId: selectedFriendId,
              latitude,
              longitude,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Could not start location sharing.");
          }

          setPairedFriend({
            ...friend,
            initialPosition: { latitude, longitude },
          });
        } catch (error) {
          setNotice(error.message || "Could not start the pairing session.");
        } finally {
          setPairingFriendId(null);
        }
      },
      (error) => {
        setPairingFriendId(null);

        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. SafeSpace cannot start Pair without your location."
            : `Your location could not be obtained: ${error.message}`;

        setNotice(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    );
  };

  const closeRadar = () => {
    setPairedFriend(null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
  };

  const initials = (name = "SafeSpace") =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  if (pairedFriend) {
    return (
      <RadarPage
        user={user}
        friend={pairedFriend}
        initialPosition={pairedFriend.initialPosition}
        onBack={closeRadar}
      />
    );
  }

  return (
    <div className="ss-dashboard">
      <aside className="ss-sidebar">
        <a className="ss-logo" href="#home" aria-label="SafeSpace home">
          <span className="ss-logo-mark">✦</span>
          <span>Safe<span className="ss-blue">Space</span></span>
        </a>

        <div className="ss-nav-label">WORKSPACE</div>
        <nav className="ss-nav" aria-label="Main navigation">
          <a className="ss-nav-link active" href="#home"><span>⌂</span> Overview</a>
          <a className="ss-nav-link" href="#friends"><span>♧</span> Trusted friends <b>{friends.length}</b></a>
          <a className="ss-nav-link" href="#requests"><span>↗</span> Requests {requests.length > 0 && <b className="ss-count">{requests.length}</b>}</a>
          <a className="ss-nav-link" href="#location"><span>⌖</span> Location sharing</a>
          <a className="ss-nav-link" href="#safety"><span>⬡</span> Safety settings</a>
        </nav>

        <div className="ss-sidebar-bottom">
          <div className="ss-mini-shield">⬡</div>
          <strong>Your circle. Your choice.</strong>
          <p>Only connect with people you trust.</p>
        </div>
        <div className="ss-sidebar-foot">SAFESPACE · PERSONAL SAFETY</div>
      </aside>

      <div className="ss-main">
        <header className="ss-topbar">
          <div className="ss-breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="ss-top-actions">
            <span className="ss-secure-pill"><i /> Account connected</span>
            <div className="ss-user-chip">
              <span className="ss-avatar ss-avatar-small">{initials(user?.fullName)}</span>
              <span className="ss-user-meta"><strong>{user?.fullName || "Your account"}</strong><small>{user?.email || "SafeSpace member"}</small></span>
            </div>
            <button className="ss-logout" onClick={logout}>Log out <span>↗</span></button>
          </div>
        </header>

        <main className="ss-content" id="home">
          <section className="ss-welcome">
            <div className="ss-welcome-copy">
              <div className="ss-eyebrow"><span className="ss-eyebrow-dot" /> YOUR PERSONAL SAFETY SPACE</div>
              <h1>Welcome back, <span>{user?.fullName?.split(" ")[0] || "there"}.</span></h1>
              <p>Your trusted circle starts here. Keep your connections organized and your choices in control.</p>
              <a className="ss-primary-link" href="#friends">Manage your circle <span>→</span></a>
            </div>
            <div className="ss-welcome-art" aria-hidden="true">
              <div className="ss-orbit ss-orbit-one" />
              <div className="ss-orbit ss-orbit-two" />
              <div className="ss-shield-large">✦</div>
              <div className="ss-art-dot ss-art-dot-one" />
              <div className="ss-art-dot ss-art-dot-two" />
            </div>
          </section>

          {notice && <div className="ss-notice" role="status"><span>ⓘ</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}

          <section className="ss-stats" aria-label="Account summary">
            <article className="ss-stat-card">
              <div className="ss-stat-icon blue-icon">♧</div>
              <div className="ss-stat-copy"><span>Trusted friends</span><strong>{friends.length}</strong><small>Accepted connections</small></div>
              <span className="ss-stat-arrow">↗</span>
            </article>
            <article className="ss-stat-card">
              <div className="ss-stat-icon violet-icon">↗</div>
              <div className="ss-stat-copy"><span>Pending requests</span><strong>{requests.length}</strong><small>Awaiting your response</small></div>
              <span className="ss-stat-arrow">↗</span>
            </article>
            <article className="ss-stat-card">
              <div className="ss-stat-icon teal-icon">⌖</div>
              <div className="ss-stat-copy"><span>Location sharing</span><strong className="ss-stat-text">Not enabled</strong><small>Choose when to share</small></div>
              <span className="ss-stat-arrow">↗</span>
            </article>
          </section>

          <div className="ss-section-heading">
            <div><div className="ss-eyebrow">YOUR NETWORK</div><h2>Connections overview</h2></div>
            <span className="ss-updated"><span /> Live account data</span>
          </div>

          <div className="ss-dashboard-grid">
            <section className="ss-panel ss-friends-panel" id="friends">
              <div className="ss-panel-heading">
                <div><span className="ss-panel-icon">♧</span><div><h3>Trusted friends</h3><p>People in your safety circle</p></div></div>
                <span className="ss-counter">{friends.length}</span>
              </div>
              {friends.length === 0 ? (
                <div className="ss-empty">
                  <div className="ss-empty-icon">♧</div>
                  <strong>Your circle starts with a connection</strong>
                  <p>Add someone you trust. They’ll appear here after they accept your request.</p>
                  <a href="#add-friend">Add your first friend <span>→</span></a>
                </div>
              ) : (
                <div className="ss-contact-list">
                  {friends.map((friend) => (
                    <div className="ss-contact" key={friend._id}>
                      <span className="ss-avatar">{initials(friend.fullName)}</span>
                      <div className="ss-contact-info"><strong>{friend.fullName}</strong><span>{friend.email}</span><small><i /> Connected</small></div>
                      <button
                        type="button"
                        className="ss-pair-button"
                        onClick={() => pairWithFriend(friend)}
                        disabled={pairingFriendId !== null}
                      >
                        {pairingFriendId === String(friend._id || friend.id) ? "Pairing…" : "Pair"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="ss-panel-footer"><span>Connections you’ve accepted</span><span>🔒 Private</span></div>
            </section>

            <div className="ss-right-column">
              <section className="ss-panel ss-add-panel" id="add-friend">
                <div className="ss-panel-heading">
                  <div><span className="ss-panel-icon">＋</span><div><h3>Add a trusted friend</h3><p>Send an invitation by email</p></div></div>
                </div>
                <form className="ss-add-form" onSubmit={sendFriendRequest}>
                  <label htmlFor="ss-friend-email">FRIEND'S EMAIL ADDRESS</label>
                  <div className="ss-input-wrap"><span>✉</span><input id="ss-friend-email" type="email" placeholder="name@example.com" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} required /></div>
                  <button type="submit" className="ss-send-button" disabled={busy}>{busy ? "Sending…" : "Send friend request"} <span>→</span></button>
                </form>
                <p className="ss-privacy-note"><span>♢</span> Your friend must accept before they’re added to your circle.</p>
              </section>

              <section className="ss-panel ss-requests-panel" id="requests">
                <div className="ss-panel-heading">
                  <div><span className="ss-panel-icon violet-panel-icon">↗</span><div><h3>Friend requests</h3><p>Review incoming connections</p></div></div>
                  {requests.length > 0 && <span className="ss-counter ss-counter-violet">{requests.length}</span>}
                </div>
                {requests.length === 0 ? (
                  <div className="ss-request-empty"><span>✓</span><div><strong>You're all caught up</strong><p>No pending friend requests right now.</p></div></div>
                ) : (
                  <div className="ss-request-list">
                    {requests.map((request) => (
                      <div className="ss-request" key={request._id}>
                        <span className="ss-avatar ss-avatar-violet">{initials(request.requester?.fullName)}</span>
                        <div className="ss-request-info"><strong>{request.requester?.fullName || "SafeSpace member"}</strong><span>{request.requester?.email}</span></div>
                        <div className="ss-request-actions">
                          <button className="ss-accept" onClick={() => respondToRequest(request._id, "accepted")}>Accept</button>
                          <button className="ss-reject" onClick={() => respondToRequest(request._id, "rejected")}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

         <section className="ss-panel" id="location" style={{ padding: "20px" }}>
            <LocationSharing />
         </section>

          <footer className="ss-footer"><span>© {new Date().getFullYear()} SafeSpace</span><span><i /> Built around trust, consent, and connection.</span><span>Personal safety workspace</span></footer>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
