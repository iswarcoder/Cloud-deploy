(() => {
  const config = Object.freeze({
    region: "ap-south-1",
    userPoolId: "ap-south-1_LEbI4NhbH",
    clientId: "1a469spuoui6i1j1iusd9jrmk4",
    domain: "https://ap-south-1lebi4nhbh.auth.ap-south-1.amazoncognito.com",
    callbackUrl: "http://127.0.0.1:5500/frontend/login.html",
    logoutUrl: "http://127.0.0.1:5500/frontend/index.html",
    frontendOrigin: "http://127.0.0.1:5500"
  });
  const tokenKey = "cloud-deploy-session";
  const verifierKey = "cloud-deploy-pkce-verifier";
  const stateKey = "cloud-deploy-oauth-state";
  let refreshPromise = null;

  function session() {
    try {
      const value = JSON.parse(sessionStorage.getItem(tokenKey) || "null");
      return value?.accessToken && value.expiresAt > Date.now() ? value : null;
    } catch {
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(verifierKey);
    sessionStorage.removeItem(stateKey);
  }

  function storeSession(payload, previous = {}) {
    sessionStorage.setItem(tokenKey, JSON.stringify({
      accessToken: payload.access_token,
      idToken: payload.id_token || previous.idToken,
      refreshToken: payload.refresh_token || previous.refreshToken,
      expiresAt: Date.now() + (Number(payload.expires_in || 3600) * 1000) - 30000
    }));
  }

  function base64Url(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function randomToken() {
    return base64Url(crypto.getRandomValues(new Uint8Array(32)));
  }

  function userClaims() {
    const token = session()?.idToken;
    if (!token) return {};
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(atob(payload).split("").map(character => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`).join("")));
    } catch {
      return {};
    }
  }

  async function sha256(value) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  }

  async function beginLogin() {
    if (location.origin !== config.frontendOrigin) {
      throw new Error(`Start sign-in from ${config.callbackUrl}. This page is currently running from ${location.origin || "an unavailable origin"}, so the PKCE session cannot survive the Cognito redirect.`);
    }
    const verifier = randomToken();
    const state = randomToken();
    sessionStorage.setItem(verifierKey, verifier);
    sessionStorage.setItem(stateKey, state);
    const challenge = base64Url(await sha256(verifier));
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: "openid email",
      code_challenge_method: "S256",
      code_challenge: challenge,
      state
    });
    location.href = `${config.domain}/oauth2/authorize?${params}`;
  }

  async function exchangeCode(code, returnedState) {
    if (location.href !== config.callbackUrl && !location.href.startsWith(`${config.callbackUrl}?`)) {
      throw new Error(`The callback URL does not match the configured URL: ${config.callbackUrl}`);
    }
    const verifier = sessionStorage.getItem(verifierKey);
    const expectedState = sessionStorage.getItem(stateKey);
    if (!code) throw new Error("Cognito returned no authorization code.");
    if (!verifier && !expectedState) {
      throw new Error("No PKCE verifier or OAuth state was found. Open the HTTP login URL directly and start sign-in again; do not open login.html as a file.");
    }
    if (!verifier) throw new Error("The PKCE verifier is missing. Start sign-in again from the same browser tab and HTTP origin.");
    if (!expectedState) throw new Error("The OAuth state is missing. Start sign-in again from the same browser tab and HTTP origin.");
    if (!returnedState || returnedState !== expectedState) {
      sessionStorage.removeItem(verifierKey);
      sessionStorage.removeItem(stateKey);
      throw new Error("The sign-in response could not be verified. Start again.");
    }
    const response = await fetch(`${config.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code,
        redirect_uri: config.callbackUrl,
        code_verifier: verifier
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Cognito sign-in failed.");
    sessionStorage.removeItem(verifierKey);
    sessionStorage.removeItem(stateKey);
    storeSession(payload);
  }

  async function refreshAccessToken() {
    const current = (() => {
      try { return JSON.parse(sessionStorage.getItem(tokenKey) || "null"); } catch { return null; }
    })();
    if (!current?.refreshToken) {
      clearSession();
      return false;
    }
    if (refreshPromise) return refreshPromise;
    refreshPromise = fetch(`${config.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.clientId,
        refresh_token: current.refreshToken
      })
    }).then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.access_token) {
        clearSession();
        return false;
      }
      storeSession(payload, current);
      return true;
    }).catch(() => {
      clearSession();
      return false;
    }).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  function logout() {
    clearSession();
    location.href = `${config.domain}/logout?client_id=${encodeURIComponent(config.clientId)}&logout_uri=${encodeURIComponent(config.logoutUrl)}`;
  }

  async function requireAuth() {
    if (location.pathname.endsWith("/login.html")) return session();
    if (!session()) {
      location.replace(`login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      return null;
    }
    return session();
  }

  window.CloudDeployAuth = Object.freeze({
    config,
    getAccessToken: async () => {
      const current = session();
      if (current) return current.accessToken;
      if (await refreshAccessToken()) return session()?.accessToken || "";
      return "";
    },
    refreshAccessToken,
    clearSession,
    getUserClaims: userClaims,
    beginLogin,
    exchangeCode,
    logout,
    requireAuth,
    isAuthenticated: () => Boolean(session())
  });

  const privatePages = ["dashboard.html", "projects.html", "deployments.html", "logs.html", "infrastructure.html", "security.html", "cost-management.html", "settings.html", "user.html"];
  if (privatePages.some(page => location.pathname.endsWith(`/${page}`)) && !session()) {
    location.replace(`login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
  }
})();
