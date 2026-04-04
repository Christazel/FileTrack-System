export default function LoginPage({
  publicProofPoints,
  publicFeatures,
  publicWorkflow,
  email,
  password,
  setEmail,
  setPassword,
  handleLogin,
  error,
  success,
}) {
  function setDemoAccount(nextEmail) {
    setEmail(nextEmail);
    setPassword("Password123!");
  }

  return (
    <main className="login-layout">
      <section className="landing-shell">
        <div className="landing-grid">
          <article className="landing-hero panel hero-card">
            <div className="hero-copy">
              <p className="eyebrow">FileTrack System</p>
              <h1>Document management yang terlihat siap dipakai perusahaan.</h1>
              <p className="subtext">
                FileTrack System menyatukan upload, search cepat, preview PDF, versioning, sharing, notifikasi, dan role management dalam satu pengalaman yang rapi.
              </p>
              <div className="proof-strip">
                {publicProofPoints.map((item) => (
                  <div key={item.label} className="proof-item">
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="feature-grid">
              {publicFeatures.map((feature) => (
                <article key={feature.title} className="feature-card">
                  <span className="feature-dot" />
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </article>

          <aside className="login-card auth-card">
            <div className="auth-badge">Secure access</div>
            <h2>Masuk ke dashboard</h2>
            <p className="subtext">Gunakan akun demo untuk melihat role, log aktivitas, dan panel notifikasi.</p>
            <form onSubmit={handleLogin} className="form-grid auth-form">
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </label>
              <label>
                Password
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
              </label>
              <button type="submit">Masuk ke Dashboard</button>
            </form>
            <div className="demo-box">
              <strong>Demo accounts</strong>
              <ul>
                <li>admin@filetrack.local</li>
                <li>manager@filetrack.local</li>
                <li>staff@filetrack.local</li>
              </ul>
              <div className="demo-actions" role="group" aria-label="Pilih role demo">
                <button type="button" className="ghost-btn" onClick={() => setDemoAccount("admin@filetrack.local")}>
                  Admin
                </button>
                <button type="button" className="ghost-btn" onClick={() => setDemoAccount("manager@filetrack.local")}>
                  Manager
                </button>
                <button type="button" className="ghost-btn" onClick={() => setDemoAccount("staff@filetrack.local")}>
                  Staff
                </button>
              </div>
              <p>Password: Password123!</p>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}
          </aside>
        </div>

        <section className="landing-band panel">
          <div>
            <p className="eyebrow">How it works</p>
            <h3>Alur yang mudah dipresentasikan.</h3>
          </div>
          <div className="workflow-grid">
            {publicWorkflow.map((step, index) => (
              <div key={step} className="workflow-step">
                <span>0{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
