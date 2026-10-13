
import { useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";

function App() {
const [fullName, setFullName] = useState("");
const [mobileNumber, setMobileNumber] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [isLogin, setIsLogin] = useState(true);
const [showPassword, setShowPassword] = useState(false);

const [currentUser, setCurrentUser] = useState(() => {
  const savedUser = localStorage.getItem("user");

  return savedUser
    ? JSON.parse(savedUser)
    : null;
});

 const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const endpoint = isLogin
      ? "http://localhost:5000/api/auth/login"
      : "http://localhost:5000/api/auth/register";

    const body = isLogin
      ? {
          email,
          password,
        }
      : {
          fullName,
          mobileNumber,
          email,
          password,
        };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    alert(data.message);

  setCurrentUser(data.user);
  } catch (error) {
    console.error("Authentication error:", error);

    alert("Could not connect to SafeSpace server.");
  }
};
 if (currentUser) {
       return <Dashboard user={currentUser} />;}
       
  return (
    <div className="app-shell">
      <header className="navbar">
        <a className="brand" href="/" aria-label="SafeSpace home">
          <svg
            className="brand-shield"
            viewBox="0 0 48 56"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M24 3 43 11V25C43 37 35 46 24 52 13 46 5 37 5 25V11L24 3Z"
              stroke="#1784FF"
              strokeWidth="4"
            />
            <path
              d="M24 10 36 15V25C36 33 31 39 24 44V10Z"
              fill="#1684FF"
            />
            <path
              d="M24 10 12 15V25C12 33 17 39 24 44V10Z"
              fill="#DCEBFF"
            />
            <circle cx="24" cy="25" r="7" fill="#07182D" />
            <circle cx="24" cy="25" r="3" fill="#58A8FF" />
          </svg>
          <span className="brand-name">
            Safe<span>Space</span>
          </span>
        </a>

        <p className="navbar-tagline">Your safety, our priority.</p>
      </header>

      <main className="main-content">
        <section className="auth-card">
          <div className="brand-panel">
            <div className="brand-intro">
              <div className="hero-brand">
                <svg
                  viewBox="0 0 48 56"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M24 3 43 11V25C43 37 35 46 24 52 13 46 5 37 5 25V11L24 3Z"
                    stroke="#1684FF"
                    strokeWidth="4"
                  />
                  <path
                    d="M24 10 36 15V25C36 33 31 39 24 44V10Z"
                    fill="#1684FF"
                  />
                  <path
                    d="M24 10 12 15V25C12 33 17 39 24 44V10Z"
                    fill="#DCEBFF"
                  />
                  <circle cx="24" cy="25" r="7" fill="#07182D" />
                  <circle cx="24" cy="25" r="3" fill="#58A8FF" />
                </svg>
                <h1>
                  Safe<span>Space</span>
                </h1>
              </div>

              <h2>Stay Connected. Stay Safe.</h2>
              <p className="brand-description">
                Real-time location tracking, smart distance
                alerts, and a safer tomorrow — together
                with your trusted friends.
              </p>
            </div>

            <div className="feature-list">
              <div className="feature">
                <div className="feature-icon">⌖</div>
                <div>
                  <h3>Real-Time Location</h3>
                  <p>Know where your loved ones are.</p>
                </div>
              </div>

              <div className="feature">
                <div className="feature-icon">⬡</div>
                <div>
                  <h3>Smart Distance Alerts</h3>
                  <p>Get notified when it's not safe.</p>
                </div>
              </div>

              <div className="feature">
                <div className="feature-icon">♧</div>
                <div>
                  <h3>Trusted Connections</h3>
                  <p>Stay close to the people who matter.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="form-panel">
            <div className="auth-tabs">
              <button
                type="button"
                className={isLogin ? "tab active" : "tab"}
                onClick={() => setIsLogin(true)}
              >
                Log In
              </button>
              <button
                type="button"
                className={!isLogin ? "tab active" : "tab"}
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </div>

            <div className="form-heading">
              <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
              <p>
                {isLogin
                  ? "Log in to connect with your trusted friends."
                  : "Join SafeSpace and stay connected."}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />

                  <label htmlFor="mobile">Mobile Number</label>
                  <input
                    id="mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    autoComplete="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                  />
                </>
              )}

              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <span className="input-icon" aria-hidden="true">✉</span>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <span className="input-icon" aria-hidden="true">♙</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete={
                    isLogin ? "current-password" : "new-password"
                  }
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {isLogin && (
                <div className="form-options">
                  <label className="remember-option">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      alert("Password recovery will be added later.")
                    }
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button className="submit-button" type="submit">
                {isLogin ? "Log In" : "Create Account"}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className="divider">
              <span />
              <p>OR</p>
              <span />
            </div>

            <p className="switch-prompt">
              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"}
              <button
                type="button"
                className="text-link"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Sign Up" : "Log In"}
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;