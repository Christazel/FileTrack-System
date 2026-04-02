export default function OnboardingOverlay({ showOnboarding, token, activeSection, dismissOnboarding }) {
  if (!(showOnboarding && token && activeSection === "documents")) {
    return null;
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h2>👋 Selamat datang di FileTrack!</h2>
          <button type="button" className="ghost-btn close-onboarding" onClick={dismissOnboarding}>✕</button>
        </div>
        <div className="onboarding-steps">
          <div className="onboarding-step">
            <span className="step-number">1</span>
            <div>
              <strong>Upload Dokumen</strong>
              <p>Isi judul, pilih kategori, dan upload file PDF/DOCX/XLSX Anda.</p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="step-number">2</span>
            <div>
              <strong>Cari & Filter</strong>
              <p>Gunakan kolom pencarian untuk menemukan dokumen berdasarkan nama, kategori, atau tanggal.</p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="step-number">3</span>
            <div>
              <strong>Preview & Versi</strong>
              <p>Lihat PDF langsung dan kelola versioning untuk melacak perubahan file.</p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="step-number">4</span>
            <div>
              <strong>Bagikan ke Tim</strong>
              <p>Klik Versi untuk berbagi dokumen dengan rekan kerja dan kirim pesan.</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={dismissOnboarding}>Mengerti!</button>
      </div>
    </div>
  );
}
