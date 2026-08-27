import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminMerch } from "./api/client";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import MerchPage from "./pages/MerchPage";
import MusicPage from "./pages/MusicPage";
import NewsPage from "./pages/NewsPage";
import ShowsPage from "./pages/ShowsPage";

type Tab = "shows" | "news" | "music" | "merch" | "about";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "shows", label: "Shows" },
  { id: "news", label: "News" },
  { id: "music", label: "Music" },
  { id: "merch", label: "Merch" },
  { id: "about", label: "About" }
];

function cleanHash(hash: string) {
  return hash.replace(/^#/, "");
}

function tabFromHash(hash: string): Tab | null {
  const tab = cleanHash(hash).split("/")[0];
  return tabs.some((item) => item.id === tab) ? (tab as Tab) : null;
}

function merchItemIdFromHash(hash: string) {
  const [tab, itemId] = cleanHash(hash).split("/");
  return tab === "merch" && itemId ? decodeURIComponent(itemId) : null;
}

function getSavedAdminToken() {
  return localStorage.getItem("bandAdminToken")?.trim() ?? "";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => tabFromHash(window.location.hash) ?? "shows");
  const [selectedMerchItemId, setSelectedMerchItemId] = useState<string | null>(() =>
    merchItemIdFromHash(window.location.hash)
  );
  const [isAdminOpen, setIsAdminOpen] = useState(window.location.hash === "#admin");
  const [adminToken, setAdminToken] = useState(getSavedAdminToken);
  const [unlockToken, setUnlockToken] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const hasAdminAccess = Boolean(adminToken);

  useEffect(() => {
    function syncRoute() {
      const nextTab = tabFromHash(window.location.hash);

      if (nextTab) {
        setActiveTab(nextTab);
        setSelectedMerchItemId(merchItemIdFromHash(window.location.hash));
        setIsAdminOpen(false);
        return;
      }

      setSelectedMerchItemId(null);
      setIsAdminOpen(window.location.hash === "#admin");
    }

    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);

    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  function selectTab(tab: Tab) {
    setActiveTab(tab);
    setSelectedMerchItemId(null);
    setIsAdminOpen(false);
    window.history.pushState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}#${tab}`
    );
  }

  const openMerchItem = useCallback((itemId: string) => {
    setSelectedMerchItemId(itemId);
    window.history.pushState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}#merch/${encodeURIComponent(itemId)}`
    );
  }, []);

  const closeMerchItem = useCallback(() => {
    setSelectedMerchItemId(null);
    window.history.pushState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}#merch`
    );
  }, []);

  function closeAdminUnlock() {
    setIsAdminOpen(false);
    setUnlockToken("");
    setUnlockError("");

    window.history.pushState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}#${activeTab}`
    );
  }

  function closeAdminPage() {
    setIsAdminOpen(false);
    window.history.pushState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}#${activeTab}`
    );
  }

  function lockAdmin(message = "") {
    setAdminToken("");
    setUnlockToken("");
    setUnlockError(message);
    localStorage.removeItem("bandAdminToken");
  }

  function logoutAdmin() {
    lockAdmin();
    closeAdminPage();
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
            onLogout={logoutAdmin}
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
        {activeTab === "merch" && (
          <MerchPage
            selectedItemId={selectedMerchItemId}
            onCloseItem={closeMerchItem}
            onOpenItem={openMerchItem}
          />
        )}
        {activeTab === "about" && <AboutPage />}
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
