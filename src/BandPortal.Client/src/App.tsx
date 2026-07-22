import { FormEvent, useEffect, useState } from "react";
import { getAdminMerch } from "./api/client";
import AdminPage from "./pages/AdminPage";
import MerchPage from "./pages/MerchPage";
import MusicPage from "./pages/MusicPage";
import NewsPage from "./pages/NewsPage";
import ShowsPage from "./pages/ShowsPage";

type Tab = "shows" | "news" | "music" | "merch";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "shows", label: "Shows" },
  { id: "news", label: "News" },
  { id: "music", label: "Music" },
  { id: "merch", label: "Merch" }
];

function getSavedAdminToken() {
  return localStorage.getItem("bandAdminToken")?.trim() ?? "";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("shows");
  const [isAdminOpen, setIsAdminOpen] = useState(window.location.hash === "#admin");
  const [adminToken, setAdminToken] = useState(getSavedAdminToken);
  const [unlockToken, setUnlockToken] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const hasAdminAccess = Boolean(adminToken);

  useEffect(() => {
    function syncAdminRoute() {
      setIsAdminOpen(window.location.hash === "#admin");
    }

    window.addEventListener("hashchange", syncAdminRoute);
    return () => window.removeEventListener("hashchange", syncAdminRoute);
  }, []);

  function selectTab(tab: Tab) {
    setActiveTab(tab);
    setIsAdminOpen(false);

    if (window.location.hash === "#admin") {
      window.history.pushState(
        "",
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
    }
  }

  function closeAdminUnlock() {
    setIsAdminOpen(false);
    setUnlockToken("");
    setUnlockError("");

    if (window.location.hash === "#admin") {
      window.history.pushState(
        "",
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
    }
  }

  function closeAdminPage() {
    setIsAdminOpen(false);

    if (window.location.hash === "#admin") {
      window.history.pushState(
        "",
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
    }
  }

  function lockAdmin(message = "") {
    setAdminToken("");
    setUnlockToken("");
    setUnlockError(message);
    localStorage.removeItem("bandAdminToken");
  }

  async function submitAdminUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextToken = unlockToken.trim();

    if (!nextToken) {
      setUnlockError("Enter an admin access token.");
      return;
    }

    setIsUnlocking(true);
    setUnlockError("");

    try {
      await getAdminMerch(nextToken);
      setAdminToken(nextToken);
      setUnlockToken("");
      localStorage.setItem("bandAdminToken", nextToken);
    } catch {
      setAdminToken("");
      localStorage.removeItem("bandAdminToken");
      setUnlockError("Authorization failed. Check the token and try again.");
    } finally {
      setIsUnlocking(false);
    }
  }

  if (isAdminOpen && hasAdminAccess) {
    return (
      <div className="admin-shell">
        <main className="admin-panel">
          <AdminPage
            adminToken={adminToken}
            onAuthorizationLost={lockAdmin}
            onBack={closeAdminPage}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <header className="hero">
        <div className="hero__brand">
          <h1 className="hero__title">
            <img
              className="hero__logo"
              src="/lost_in_logo.png"
              alt="Lost in Reverie"
            />
          </h1>
        </div>
      </header>

      <nav className="tab-strip" aria-label="Main tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={!isAdminOpen && activeTab === tab.id ? "tab tab--active" : "tab"}
            onClick={() => selectTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content-frame">
        {activeTab === "shows" && <ShowsPage />}
        {activeTab === "news" && <NewsPage />}
        {activeTab === "music" && <MusicPage />}
        {activeTab === "merch" && <MerchPage />}
      </main>

      {isAdminOpen && !hasAdminAccess && (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="admin-unlock-title"
            aria-modal="true"
            className="modal unlock-modal"
            onSubmit={submitAdminUnlock}
            role="dialog"
          >
            <div className="section-heading section-heading--compact">
              <p className="eyebrow">Admin</p>
              <h2 id="admin-unlock-title">Authorize Admin</h2>
            </div>
            <label>
              Access token
              <input
                autoFocus
                value={unlockToken}
                onChange={(event) => {
                  setUnlockToken(event.target.value);
                  setUnlockError("");
                }}
                type="password"
              />
            </label>
            {unlockError && <p className="alert">{unlockError}</p>}
            <div className="form-actions">
              <button className="primary-button" disabled={isUnlocking}>
                {isUnlocking ? "Authorizing..." : "Authorize"}
              </button>
              <button
                className="secondary-button"
                onClick={closeAdminUnlock}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
