(() => {
  const form = document.querySelector("#profile-form");
  const page = document.querySelector("#profile-page");
  const status = document.querySelector("#profile-status");
  const error = document.querySelector("#profile-error");
  const saveButton = document.querySelector("#save-profile");
  const editButton = document.querySelector("#edit-profile");
  const cancelButton = document.querySelector("#cancel-profile");
  const retryButton = document.querySelector("#retry-profile");
  const successPopup = document.querySelector("#profile-success-popup");
  const successOkButton = document.querySelector("#profile-success-ok");
  const fields = ["fullName", "phone", "company", "location", "website", "githubUrl", "instagramUrl", "facebookUrl", "linkedinUrl", "bio", "avatarUrl"];
  const urlFields = new Set(["website", "githubUrl", "instagramUrl", "facebookUrl", "linkedinUrl", "avatarUrl"]);
  let profile = {};
  let savedProfile = {};
  let previousFocusedElement = null;
  let editing = false;

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));

  function initials(name) {
    return String(name || "Cloud Deploy").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "CD";
  }

  function value(name) {
    return String(profile[name] || "").trim();
  }

  function profileCompletion() {
    const completed = fields.filter(field => value(field)).length;
    return Math.round((completed / fields.length) * 100);
  }

  function setLoading(loading) {
    page.classList.toggle("is-loading", loading);
    page.setAttribute("aria-busy", String(loading));
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
    status.textContent = message ? "Profile could not be saved or loaded" : "";
    status.className = message ? "profile-status status-error" : "profile-status";
    retryButton.hidden = !message;
  }

  function setMode(nextEditing) {
    editing = Boolean(nextEditing);
    page.classList.toggle("is-editing", editing);
    form.querySelectorAll("input, textarea").forEach(input => { input.disabled = !editing || input.name === "email"; });
    editButton.hidden = editing;
    cancelButton.hidden = !editing;
    saveButton.hidden = !editing;
    document.querySelector("#profile-edit-heading").textContent = editing ? "Edit profile" : "Profile details";
  }

  function closeSuccessPopup() {
    if (successPopup.hidden) return;
    successPopup.hidden = true;
    document.body.classList.remove("profile-popup-open");
    previousFocusedElement?.focus();
    previousFocusedElement = null;
  }

  function showSuccessPopup() {
    previousFocusedElement = document.activeElement;
    successPopup.hidden = false;
    document.body.classList.add("profile-popup-open");
    successOkButton.focus();
  }

  function render() {
    const claims = CloudDeployAuth.getUserClaims();
    const email = value("email") || claims.email || "";
    profile.email = email;
    const name = value("fullName") || claims.name || "Cloud Deploy member";
    const avatar = value("avatarUrl");
    const completion = profileCompletion();
    document.querySelector("#profile-name").textContent = name;
    document.querySelector("#profile-email").textContent = email || "Verified Cognito account";
    document.querySelector("#profile-avatar").innerHTML = avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : `<span>${escapeHtml(initials(name))}</span>`;
    document.querySelector("#profile-completion").textContent = `${completion}% complete`;
    document.querySelector("#profile-progress").style.setProperty("--progress", `${completion}%`);
    document.querySelector("#profile-progress").setAttribute("aria-valuenow", String(completion));
    document.querySelector("#preview-name").textContent = name;
    document.querySelector("#preview-bio").textContent = value("bio") || "Add a short introduction to help your team know you.";
    document.querySelector("#preview-meta").textContent = [value("company"), value("location")].filter(Boolean).join(" · ") || "Complete your profile details";
    document.querySelector("#preview-avatar").innerHTML = avatar ? `<img src="${escapeHtml(avatar)}" alt="">` : `<span>${escapeHtml(initials(name))}</span>`;
    document.querySelector("#completion-copy").textContent = completion === 100 ? "Your profile is ready to represent you." : "Complete your profile to help your team recognize you.";
    fields.concat("email").forEach(field => { if (form.elements[field] && document.activeElement !== form.elements[field]) form.elements[field].value = value(field); });
    document.querySelectorAll("[data-social]").forEach(link => {
      const url = value(link.dataset.social);
      link.href = url || "#";
      link.classList.toggle("is-empty", !url);
      link.setAttribute("aria-disabled", String(!url));
      link.tabIndex = url ? 0 : -1;
    });
  }

  async function loadProfile() {
    setLoading(true);
    showError("");
    try {
      const claims = CloudDeployAuth.getUserClaims();
      const result = await CloudDeployApi.getProfile();
      profile = { ...(result || {}), email: result?.email || claims.email || "" };
      savedProfile = { ...profile };
      render();
      if (!editing) setMode(false);
    } catch (loadError) {
      showError(loadError.message || "The profile service is unavailable. Start the backend and try again.");
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    for (const field of urlFields) {
      const input = form.elements[field];
      input.setCustomValidity("");
      if (input.value && !/^https?:\/\/[^\s]+$/i.test(input.value.trim())) {
        input.setCustomValidity("Use a complete http:// or https:// URL.");
        input.reportValidity();
        return false;
      }
    }
    return form.reportValidity();
  }

  form.addEventListener("input", event => {
    if (event.target.name) {
      profile[event.target.name] = event.target.value;
      render();
    }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!validate()) return;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    status.textContent = "Saving profile...";
    status.className = "profile-status";
    showError("");
    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.email = profile.email;
      profile = await CloudDeployApi.updateProfile(payload);
      savedProfile = { ...profile };
      render();
      setMode(false);
      status.textContent = "Profile saved successfully.";
      status.className = "profile-status status-success";
      showSuccessPopup();
    } catch (saveError) {
      showError(saveError.message || "The profile could not be saved. No changes were confirmed.");
    } finally {
      saveButton.disabled = false;
      cancelButton.disabled = false;
    }
  });
  editButton.addEventListener("click", () => {
    showError("");
    setMode(true);
  });
  cancelButton.addEventListener("click", () => {
    profile = { ...savedProfile };
    render();
    setMode(false);
    showError("");
  });
  retryButton.addEventListener("click", loadProfile);
  successOkButton.addEventListener("click", closeSuccessPopup);
  successPopup.addEventListener("click", event => {
    if (event.target.closest("[data-close-profile-popup]")) closeSuccessPopup();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSuccessPopup();
  });
  document.querySelector("#logout-button").addEventListener("click", CloudDeployAuth.logout);
  setMode(false);
  loadProfile();
})();
