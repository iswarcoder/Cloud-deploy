(() => {
  "use strict";

  // Local mode is intentionally empty. Backend mode is selected through api.js.
  const KEY = "cloud-deploy-demo";
  const DEFAULT_STATE = {
    theme: "light",
    projects: [],
    deployments: [],
    notifications: false
  };
  let state = loadState();
  let profile = null;
  let liveLogs = [];
  let logsLoadPromise = null;
  let route = document.body.dataset.page || "landing";
  const charts = {};
  const $ = (s, root = document) => root.querySelector(s);
  const icon = (name, size = 18) => `<i data-lucide="${name}" width="${size}" height="${size}"></i>`;
  function createDefaultState() {
    return {
      ...DEFAULT_STATE,
      projects: [],
      deployments: []
    };
  }

  function removeSeededRecords(value) {
    const seededProjectIds = new Set(["p1", "p2", "p3"]);
    const seededDeploymentIds = new Set(["dep-1048", "dep-1047", "dep-1046"]);
    const seededProjectNames = new Set(["Aurora Commerce", "Atlas API", "Pulse Dashboard"]);
    return {
      ...value,
      projects: value.projects.filter(project => !seededProjectIds.has(project.id)),
      deployments: value.deployments.filter(deployment => (
        !seededDeploymentIds.has(deployment.id)
        && !String(deployment.commit || "").startsWith("demo-")
        && !seededProjectNames.has(deployment.project)
      ))
    };
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
      return removeSeededRecords({
        ...createDefaultState(),
        ...stored,
        projects: Array.isArray(stored.projects) ? stored.projects : createDefaultState().projects,
        deployments: Array.isArray(stored.deployments)
          ? stored.deployments
          : createDefaultState().deployments
      });
    } catch {
      return createDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      toast("Demo data could not be saved in this browser.", "error");
    }
  }

  function toast(message, type = "success") {
    const region = $("#toast-region");
    if (!region) return;

    const element = document.createElement("div");
    element.className = `toast ${type}`;
    element.textContent = message;
    region.append(element);
    window.setTimeout(() => element.remove(), 3300);
  }

  function refreshIcons() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
  }
  const navItems = [["dashboard", "layout-dashboard", "Dashboard"], ["projects", "folder-kanban", "Projects"], ["deploy", "rocket", "Create deployment"], ["deployments", "git-branch", "Deployments"], ["logs", "scroll-text", "Logs & monitoring"], ["infrastructure", "network", "Infrastructure"], ["security", "shield-check", "Security"], ["costs", "wallet-cards", "Cost management"], ["settings", "settings", "Settings"]];
  const ROUTE_FILES = {
    landing: "index.html",
    deploy: "deployments.html",
    costs: "cost-management.html"
  };

  function routeFile(routeName) {
    return ROUTE_FILES[routeName] || `${routeName}.html`;
  }
  function landing() {
    return `<div class="landing"><header class="topbar"><a class="brand" href="index.html">${icon("cloud", 21)} Cloud Deploy</a><nav class="top-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a></nav><div class="hero-actions"><button class="icon-btn" data-action="theme" aria-label="Toggle theme">${icon(state.theme === "dark" ? "sun" : "moon")}</button><a class="btn btn-secondary" href="dashboard.html">Log in</a><a class="btn btn-primary" href="dashboard.html">Get started ${icon("arrow-right", 16)}</a></div></header><main>
      <section class="hero"><div><div class="eyebrow">The calm control plane for delivery teams</div><h1>Deploy smarter.<br><span class="gradient-text">Ship faster.</span></h1><p>Cloud Deploy brings repositories, infrastructure, security, and observability into one focused workspace for confident releases.</p><div class="hero-actions"><a class="btn btn-primary" href="dashboard.html">Open demo workspace ${icon("arrow-up-right", 16)}</a><a class="btn btn-secondary" href="#features">Explore features</a></div><div class="trust"><span>GitHub</span><span>Docker</span><span>AWS</span><span>Terraform</span><span>CI/CD</span></div></div><div class="hero-art pipeline-art"><div class="pipeline-head"><strong>Release pipeline</strong><span class="live-pill">Demo live</span></div><div class="pipe">${[["git-branch","Source"],["hammer","Build & test"],["shield-check","Security"],["cloud-upload","Deploy"]].map(x => `<div class="pipe-step"><div class="pipe-icon">${icon(x[0], 22)}</div><small>${x[1]}</small></div>`).join("")}</div><div class="card pipeline-preview"><div class="pipeline-head"><span class="muted">aurora-commerce / main</span><span class="badge badge-success">Healthy</span></div><div class="progress"><i style="width:82%"></i></div><small class="muted">Security checks passed - 82% complete</small></div></div></section>
      <section class="section" id="features"><div class="eyebrow">One workspace, less context switching</div><h2>Everything your release needs.</h2><p class="section-intro">A frontend-only product demo today, with clean seams ready for your Node.js API, GitHub webhooks, and cloud providers tomorrow.</p><div class="feature-grid">${[["zap","Automated delivery","Move from commit to production with repeatable build and release workflows."],["layers-3","Infrastructure as code","Preview Terraform changes and keep environments consistent."],["activity","Observability built in","See release health, logs, and useful demo signals in one place."],["shield-check","Security by default","Surface dependency, container, and configuration findings before release."],["history","Release history","Understand what changed, when it shipped, and how to roll back safely."],["plug","Integration ready","Mock data is isolated behind an API adapter for a straightforward backend handoff."]].map(x => `<article class="feature-card">${icon(x[0], 24)}<h3>${x[1]}</h3><p>${x[2]}</p></article>`).join("")}</div></section>
      <section class="section" id="how-it-works"><div class="eyebrow">A better path to production</div><h2>From idea to impact in four steps.</h2><div class="steps">${["Connect repository","Build & test","Deploy safely","Monitor continuously"].map((x,i) => `<div class="step"><b>0${i+1}</b><h3>${x}</h3><p class="muted">${["Choose a repo and branch.","Validate every change.","Promote to the right environment.","Keep teams ahead of incidents."][i]}</p></div>`).join("")}</div></section>
      <section class="section architecture"><div class="eyebrow accent-eyebrow">Designed for extensibility</div><h2>One clear architecture.</h2><p class="section-intro">Cloud Deploy is intentionally honest about what is demo data and where future services connect.</p><div class="arch-grid">${[["monitor","Frontend","HTML, CSS, vanilla JS"],["server","Backend API","Node.js + Express"],["workflow","CI/CD","GitHub Actions"],["cloud","Cloud","AWS services"]].map(x => `<div class="arch-box">${icon(x[0],24)}<h3>${x[1]}</h3><p>${x[2]}</p></div>`).join("")}</div></section>
      <section class="section faq" id="faq"><div class="eyebrow">Questions, answered</div><h2>Built to be useful before it is connected.</h2><details open><summary>Is this connected to AWS?</summary><p class="muted">No. This workspace uses clearly labeled demo values. Credentials and privileged cloud calls belong in a future backend.</p></details><details><summary>Can I try a deployment?</summary><p class="muted">Yes. Open the workspace, choose Create deployment, and run a Demo Deployment to see each stage progress.</p></details><details><summary>Where is demo data stored?</summary><p class="muted">Harmless preferences and sample projects use browser localStorage. Passwords, tokens, and cloud keys are never stored.</p></details></section>
    </main><footer class="footer"><span>- 2026 Cloud Deploy - Premium DevOps demo</span><span>Documentation - GitHub - Support</span></footer></div>`;
  }
  function shell(page) {
    const title = navItems.find(x => x[0] === page)?.[2] || "Dashboard";
    return `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><a href="index.html">${icon("cloud",21)} Cloud Deploy</a></div><nav class="side-nav">${navItems.map(x => `<a class="${page === x[0] ? "active" : ""}" href="${routeFile(x[0])}" data-page-link>${icon(x[1],17)}<span>${x[2]}</span></a>`).join("")}</nav><div class="side-bottom"><a class="side-nav button" href="index.html">${icon("external-link",17)} View landing page</a><small>${CloudDeployApi.mode === "backend" ? "Connected backend" : "Local workspace - no live AWS data"}</small></div></aside><div class="main"><header class="appbar"><button class="icon-btn mobile-menu" data-action="sidebar" aria-label="Open navigation">${icon("menu")}</button><div class="search">${icon("search",17)}<input id="global-search" placeholder="Search workspace" aria-label="Search workspace"></div><div class="appbar-actions"><button class="icon-btn" data-action="notifications" aria-label="Notifications">${icon("bell")}</button><button class="icon-btn" data-action="theme" aria-label="Toggle theme">${icon(state.theme === "dark" ? "sun" : "moon")}</button><button class="icon-btn" data-action="profile" aria-label="Profile">${icon("user-circle")}</button></div></header><main class="content" id="view">${pages[page] ? pages[page]() : pages.dashboard()}</main></div></div>`;
  }
  function status(s) { const cls = s === "Success" || s === "Healthy" ? "success" : s === "Failed" ? "error" : "warning"; return `<span class="badge badge-${cls}">${s}</span>`; }
  function deploymentStats() {
    const total = state.deployments.length;
    const succeeded = state.deployments.filter(deployment => ["Success", "Succeeded"].includes(deployment.status)).length;
    const failed = state.deployments.filter(deployment => deployment.status === "Failed").length;
    const successRate = total ? `${((succeeded / total) * 100).toFixed(1)}%` : "0%";
    const durations = state.deployments
      .map(deployment => Number(deployment.durationSeconds))
      .filter(Number.isFinite);
    const average = durations.length
      ? `${Math.floor(durations.reduce((sum, value) => sum + value, 0) / durations.length / 60)}m`
      : "0m";
    return { totalProjects: state.projects.length, succeeded, failed, successRate, average };
  }

  function dashboardPage() {
    const stats = deploymentStats();
    const hasDeployments = state.deployments.length > 0;
    const greeting = profile?.fullName ? `${timeGreeting()}, ${escapeHtml(profile.fullName)}` : "Welcome to Cloud Deploy";
    return `<div class="page-head"><div><div class="eyebrow">Workspace overview</div><h1>${greeting}</h1><p class="muted"><span id="india-date">${indiaDate()}</span> <span aria-hidden="true">-</span> <span id="india-clock">${indiaClock()}</span></p><p class="muted">${CloudDeployApi.mode === "backend" ? "Live workspace data from the configured backend." : "Your workspace is ready. Add a project to get started."}</p></div><div class="action-row"><button class="btn btn-secondary" data-route="projects">${icon("folder-plus",16)} Create project</button><button class="btn btn-primary" data-route="deploy">${icon("rocket",16)} New deployment</button></div></div><div class="metric-grid">${[["Total projects",stats.totalProjects,""],["Successful deployments",stats.succeeded,""],["Failed deployments",stats.failed,""],["Success rate",stats.successRate,""],["Avg. build time",stats.average,""]].map(x => `<div class="metric"><span class="metric-label">${x[0]}</span><div class="metric-value">${x[1]}</div><span class="trend">${x[2] || "No recorded data yet"}</span></div>`).join("")}</div><div class="layout-two"><div class="card"><div class="pipeline-head"><h2>Deployment activity</h2><span class="badge badge-info">${hasDeployments ? "Persisted records" : "No data"}</span></div>${hasDeployments ? '<div class="chart-wrap"><canvas id="activity-chart"></canvas></div>' : `<div class="empty-state">${icon("chart-no-axes-column",30)}<h3>No deployment activity yet</h3><p class="muted">Deployment activity will appear after a persisted deployment is created.</p></div>`}</div><div class="card"><h2>Environment health</h2><div class="empty-state">${icon("activity",30)}<h3>No environments connected</h3><p class="muted">Create a project and configure a deployment target to see environment health.</p></div><hr class="card-divider"><h3>Quick actions</h3><div class="action-row"><button class="btn btn-secondary" data-route="projects">Projects</button><button class="btn btn-secondary" data-route="infrastructure">Resources</button></div></div></div><div class="card"><div class="pipeline-head"><h2>Recent deployments</h2><button class="btn btn-ghost" data-route="deployments">View all ${icon("arrow-right",15)}</button></div>${deploymentTable()}</div>`;
  }
  function timeGreeting() { const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format()); return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"; }
  function indiaDate() { return new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(); }
  function indiaClock() { return new Intl.DateTimeFormat("en-IN", { timeStyle: "medium", timeZone: "Asia/Kolkata" }).format(); }
  function deploymentPage() {
    const projects = state.projects.filter(project => project.status !== "Archived");
    const projectOptions = projects.length
      ? projects.map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join("")
      : "<option value=\"\">Create a project first</option>";
    return `<div class="page-head"><div><div class="eyebrow">Release workflow</div><h1>Create deployment</h1><p class="muted">Queue a deployment record in the connected backend. AWS resources are not provisioned by this page.</p></div><span class="badge badge-info">Backend connected</span></div><div class="layout-two"><form class="card" id="deploy-form"><h2>Deployment configuration</h2><div class="form-grid"><div class="field"><label for="deploy-project">Project</label><select id="deploy-project" required ${projects.length ? "" : "disabled"}>${projectOptions}</select></div><div class="field"><label for="deploy-branch">Git branch</label><input id="deploy-branch" value="${escapeHtml(projects[0]?.branch || "main")}" required pattern="[A-Za-z0-9._/-]+"></div><div class="field"><label for="deploy-type">Application type</label><select id="deploy-type"><option>Static HTML</option><option>Node.js</option><option>Docker</option></select></div><div class="field"><label for="deploy-region">AWS region</label><select id="deploy-region"><option>ap-south-1</option><option>us-east-1</option><option>eu-west-1</option></select></div><div class="field"><label for="deploy-env">Environment</label><select id="deploy-env"><option>Development</option><option>Staging</option><option>Production</option></select></div><div class="field"><label for="deploy-command">Build command</label><input id="deploy-command" value="npm run build" required></div><div class="field full"><label for="deploy-vars">Environment variable names <span class="muted">(values are never stored)</span></label><input id="deploy-vars" placeholder="API_URL, FEATURE_FLAG"></div></div><hr class="card-divider"><p class="muted">The backend validates the project, branch, application type, environment, region, and build configuration before queueing the record.</p><button class="btn btn-primary deploy-submit" type="submit" ${projects.length ? "" : "disabled"}>${icon("rocket",16)} Queue deployment</button></form><div class="card"><h2>Deployment status</h2><p class="muted">The connected backend records the request as <strong>queued</strong>. A worker must be configured separately to perform builds or AWS deployments.</p><div id="deployment-progress" class="hidden" aria-live="polite"></div><div class="card integration-note"><div class="eyebrow">Honest integration boundary</div><p class="muted">No AWS resource is created and no hardcoded success check is displayed.</p></div></div></div>`;
  }

  const pages = {
    dashboard: () => dashboardPage(),
    projects: () => `<div class="page-head"><div><div class="eyebrow">Workspace</div><h1>Projects</h1><p class="muted">Manage your applications and their delivery targets.</p></div><button class="btn btn-primary" data-action="new-project">${icon("plus",16)} New project</button></div><div class="toolbar"><input id="project-search" placeholder="Search projects..." aria-label="Search projects"><select id="project-status" aria-label="Filter status"><option value="">All statuses</option><option>Healthy</option><option>Deploying</option><option>Archived</option></select><select id="project-type" aria-label="Filter application type"><option value="">All application types</option><option>Static HTML</option><option>Node.js</option><option>Docker</option></select></div><div id="project-list" class="project-grid">${projectCards(state.projects)}</div>`,
    deploy: () => deploymentPage(),
    deployments: () => `<div class="page-head"><div><div class="eyebrow">Release management</div><h1>Deployments</h1><p class="muted">A transparent history of local demo releases.</p></div><button class="btn btn-primary" data-route="deploy">${icon("plus",16)} New deployment</button></div><div class="card"><div class="toolbar"><input id="deployment-search" placeholder="Search deployment ID or project..." aria-label="Search deployments"><select id="deployment-filter" aria-label="Filter deployment status"><option value="">All statuses</option><option>Success</option><option>Running</option><option>Failed</option></select></div><div class="table-wrap" id="deployment-table">${deploymentTable(true)}</div></div>`,
    logs: () => `<div class="page-head"><div><div class="eyebrow">Observability</div><h1>Logs & monitoring</h1><p class="muted">Live deployment and CloudWatch data from your authorized workspace.</p><p id="logs-source" class="muted">Source: Not available</p></div><div class="action-row"><select id="log-range" aria-label="Monitoring time range"><option value="1h">Last 1 hour</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select><span id="logs-connection" class="badge badge-warning">Loading</span><button id="refresh-logs" class="btn btn-secondary" type="button">${icon("refresh-cw",16)} Refresh</button></div></div><div class="metric-grid">${[["Total deployments","Not available","Authorized records"],["Successful deployments","Not available","Authorized records"],["Failed deployments","Not available","Authorized records"],["Backend API health","Not available","Live check"],["Recent errors","Not available","CloudWatch events"],["Response time","Not available","No measurement collected"]].map((x,i)=>`<div class="metric"><span class="metric-label">${x[0]}</span><div class="metric-value" id="log-metric-${i}">${x[1]}</div><span class="muted">${x[2]}</span></div>`).join("")}</div><div class="card"><div class="toolbar"><input id="log-search" placeholder="Search messages..." aria-label="Search logs"><select id="log-level" aria-label="Filter log severity"><option value="">All severity</option><option>INFO</option><option>WARN</option><option>ERROR</option></select><input id="log-service" placeholder="Service" aria-label="Filter service"><input id="log-deployment" placeholder="Deployment ID" aria-label="Filter deployment ID"><button class="btn btn-secondary" data-action="copy-logs">${icon("copy",16)} Copy logs</button><button class="btn btn-ghost" data-action="clear-logs">Clear filters</button></div><p id="logs-state" class="muted" role="status" aria-live="polite">Loading CloudWatch events...</p><div id="logs-list">${logsHtml([])}</div></div><div class="card"><div class="pipeline-head"><h2>Recent deployment activity</h2><span class="muted">Authorized records only</span></div><div id="deployment-activity" class="table-wrap"><p class="muted">Loading deployment activity...</p></div></div>`,
    infrastructure: () => simpleResourcePage("Infrastructure", "Illustrative cloud resources and Terraform preview.", [["Amazon S3","Storage","Artifact and static site storage","us-east-1"],["Amazon CloudFront","Delivery","Global HTTPS edge delivery","Global"],["Amazon DynamoDB","Database","Project metadata and release records","us-east-1"],["Amazon ECS Fargate","Compute","Serverless container runtime","us-east-1"],["Amazon ECR","Registry","Private container image registry","us-east-1"],["Amazon VPC","Network","Isolated application networking","us-east-1"],["IAM","Security","Least-privilege access control","Global"],["CloudWatch","Observability","Logs, metrics, and alarms","us-east-1"],["Terraform","IaC","Versioned infrastructure changes","Repository"]]),
    security: () => simpleResourcePage("Security", "Demo findings are illustrative and not the result of a real scan.", [["IAM permissions","Access","Least privilege review","2 recommendations"],["GitHub integration","Source","Webhook placeholder","Not connected"],["Dependencies","Supply chain","No critical demo findings","Demo scan"],["Container images","Supply chain","1 medium recommendation","Demo scan"],["Terraform findings","Configuration","Review public ingress","Demo scan"],["Secrets","Configuration","Values masked by design","Protected"]]),
    costs: () => `<div class="page-head"><div><div class="eyebrow">FinOps</div><h1>Cost management</h1><p class="muted">Estimated demo costs, not connected to AWS billing.</p></div><button class="btn btn-secondary" data-action="budget">${icon("sliders-horizontal",16)} Set budget</button></div><div class="layout-two"><div class="card"><h2>Monthly estimated cost</h2><div class="chart-wrap"><canvas id="cost-chart"></canvas></div></div><div class="card"><h2>Budget overview</h2><div class="metric-value">$420 / $600</div><div class="progress"><i style="width:70%"></i></div><p class="muted">70% of the demo monthly threshold</p><hr><div class="check-list"><div>Amazon ECS <strong class="badge badge-success health-badge">$168</strong></div><div>CloudFront <strong class="badge badge-success health-badge">$94</strong></div><div>S3 <strong class="badge badge-success health-badge">$62</strong></div></div></div></div><div class="card"><h2>Idle resource review</h2><p class="muted">No live resources are inspected. In a connected environment this section would surface unused capacity for review.</p></div>`,
    settings: () => `<div class="page-head"><div><div class="eyebrow">Workspace preferences</div><h1>Settings</h1><p class="muted">Demo preferences only. No credentials are stored here.</p></div></div><div class="settings-grid"><div class="card"><h2>Appearance</h2><div class="toggle-row"><span>Dark theme</span><button class="switch ${state.theme==="dark"?"on":""}" data-action="theme" aria-label="Toggle dark theme"><i></i></button></div><div class="toggle-row"><span>Compact density</span><button class="switch" data-action="setting-toggle"><i></i></button></div></div><div class="card"><h2>Notifications</h2><div class="toggle-row"><span>Deployment updates</span><button class="switch ${state.notifications?"on":""}" data-action="notifications-toggle"><i></i></button></div><div class="toggle-row"><span>Security reminders</span><button class="switch on" data-action="setting-toggle"><i></i></button></div></div><div class="card"><h2>Integrations</h2><p class="muted">GitHub and AWS connections are placeholders until a backend and OAuth flow are configured.</p><button class="btn btn-secondary" data-action="integration">${icon("plug",16)} Configure placeholder</button></div><div class="card"><h2>Demo data</h2><p class="muted">Reset projects, deployments, and preferences to the original sample state.</p><button class="btn btn-danger" data-action="reset">${icon("rotate-ccw",16)} Reset demo data</button></div></div>`
  };
  function projectCards(items) { if (!items.length) return `<div class="card empty-state">${icon("folder-open",30)}<h2>No projects found</h2><p class="muted">Create your first project to begin managing deployments.</p><button class="btn btn-primary" data-action="new-project">${icon("plus",16)} Create your first project</button></div>`; return items.map(p => `<article class="card project-card" data-project="${p.id}"><div class="pipeline-head"><h2>${escapeHtml(p.name)}</h2>${status(p.status || "Ready")}</div><p class="muted">${escapeHtml(p.description)}</p><div class="project-meta"><span>${icon("code-2",14)} ${escapeHtml(p.type || p.applicationType)}</span><span>${icon("git-branch",14)} ${escapeHtml(p.branch || "Not connected")}</span></div><div class="project-meta"><span>${escapeHtml(p.target || p.deploymentTarget)}</span><span>- ${escapeHtml(p.environment)}</span></div><div class="action-row"><button class="btn btn-secondary" data-action="edit-project" data-id="${p.id}">Edit</button><button class="btn btn-ghost" data-action="project-details" data-id="${p.id}">Details ${icon("arrow-right",14)}</button><button class="icon-btn" data-action="delete-project" data-id="${p.id}" aria-label="Delete project">${icon("trash-2",16)}</button></div></article>`).join(""); }
  function deploymentTable(full = false) { if (!state.deployments.length) return `<div class="empty-state">${icon("rocket",30)}<h3>No deployments yet</h3><p class="muted">Create a project first, then queue a deployment.</p><button class="btn btn-primary" data-route="projects">${icon("folder-plus",16)} Create a project</button></div>`; const rows = state.deployments.map(d => { const project = state.projects.find(item => item.id === d.projectId); const projectName = d.project || project?.name || d.projectId || "-"; const environment = d.environment || d.env || "-"; const started = d.createdAt ? new Date(d.createdAt).toLocaleString("en-IN") : (d.time || "-"); return `<tr><td><strong>${escapeHtml(d.id)}</strong></td><td>${escapeHtml(projectName)}</td><td>${escapeHtml(d.branch || "-")}</td><td>${escapeHtml(environment)}</td><td>${status(d.status)}</td><td>${escapeHtml(started)}</td><td>${escapeHtml(d.duration || "-")}</td><td>${full ? `<button class="btn btn-ghost" data-action="deployment-detail" data-id="${d.id}">Details</button>` : ""}</td></tr>`; }).join(""); return `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Project</th><th>Branch</th><th>Environment</th><th>Status</th><th>Started</th><th>Duration</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`; }
  function logSeverity(message) { return /\b(error|fatal|critical)\b/i.test(message) ? "ERROR" : /\b(warn|warning)\b/i.test(message) ? "WARN" : "INFO"; }
  function logsHtml(logs = []) {
    if (!logs.length) return `<div class="empty-state">${icon("scroll-text",30)}<h3>No CloudWatch events returned</h3><p class="muted">Adjust the configured log group or time range, then refresh.</p></div>`;
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Severity</th><th>Message</th></tr></thead><tbody>${logs.map(log => {
      const severity = logSeverity(log.message);
      const time = log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "Not available";
      const searchable = `${severity} ${log.message} ${log.logStreamName || ""} ${log.logGroupName || ""} ${log.timestamp || ""}`;
      return `<tr data-log="${escapeHtml(searchable)}"><td>${escapeHtml(time)}</td><td>${severity === "INFO" ? `<span class="badge badge-info">INFO</span>` : severity === "WARN" ? `<span class="badge badge-warning">WARN</span>` : `<span class="badge badge-error">ERROR</span>`}</td><td>${escapeHtml(log.message)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }
  function loadCloudWatchLogs() {
    if (logsLoadPromise) return logsLoadPromise;
    logsLoadPromise = loadMonitoringData().finally(() => {
      logsLoadPromise = null;
    });
    return logsLoadPromise;
  }
  async function loadMonitoringData() {
    const button = $("#refresh-logs");
    const stateLabel = $("#logs-state");
    const connection = $("#logs-connection");
    if (!stateLabel || !connection) return;
    button && (button.disabled = true);
    const rangeSelect = $("#log-range");
    if (rangeSelect) rangeSelect.disabled = true;
    stateLabel.textContent = "Loading CloudWatch events...";
    connection.textContent = "Loading";
    connection.className = "badge badge-warning";
    try {
      const range = rangeSelect?.value || "1h";
      const [logsResult, healthResult, deploymentsResult] = await Promise.allSettled([
        CloudDeployApi.getMonitoringLogs({ range, limit: 200 }),
        CloudDeployApi.getMonitoringHealth({ range }),
        CloudDeployApi.getMonitoringDeployments({ range })
      ]);
      const result = logsResult.status === "fulfilled" ? logsResult.value : null;
      const health = healthResult.status === "fulfilled" ? healthResult.value : null;
      const deployments = deploymentsResult.status === "fulfilled" ? deploymentsResult.value : null;
      const logError = logsResult.status === "rejected" ? logsResult.reason : null;
      liveLogs = Array.isArray(result?.events) ? result.events : [];
      const deploymentRecords = Array.isArray(deployments?.deployments) ? deployments.deployments : null;
      const deploymentDataComplete = deployments && deployments.complete !== false;
      $("#log-metric-0").textContent = deploymentDataComplete && deploymentRecords ? String(deploymentRecords.length) : "Not available";
      $("#log-metric-1").textContent = deploymentDataComplete && deploymentRecords ? String(deploymentRecords.filter(item => ["success", "succeeded"].includes(String(item.status).toLowerCase())).length) : "Not available";
      $("#log-metric-2").textContent = deploymentDataComplete && deploymentRecords ? String(deploymentRecords.filter(item => ["failed", "error"].includes(String(item.status).toLowerCase())).length) : "Not available";
      $("#log-metric-3").textContent = !logError && health?.status === "ok" && health?.cloudwatch?.status === "available" ? "Healthy" : "Not available";
      $("#log-metric-4").textContent = logError ? "Not available" : String(liveLogs.filter(item => logSeverity(item.message) === "ERROR").length);
      $("#logs-source").textContent = result?.logGroups?.length
        ? `Source: Amazon CloudWatch Logs · ${result.region} · ${result.logGroups.join(", ")} · ${new Date(result.startTime).toLocaleString("en-IN")} – ${new Date(result.endTime).toLocaleString("en-IN")}`
        : logError ? `Source: CloudWatch unavailable · ${escapeHtml(logError.message || "Request failed")}` : "Source: Amazon CloudWatch Logs · no configured groups returned";
      connection.textContent = logError ? (logError.status === 401 ? "Session expired" : "Unavailable") : "Connected";
      connection.className = logError ? "badge badge-error" : "badge badge-success";
      stateLabel.textContent = logError ? `${logError.message || "CloudWatch logs could not be loaded."} Use Refresh to retry.` : liveLogs.length ? `Showing ${liveLogs.length} real CloudWatch events for the selected range. Filters apply to returned events.` : "CloudWatch responded successfully, but returned no events for this range.";
      $("#logs-list").innerHTML = logError ? `<div class="empty-state"><h3>CloudWatch logs unavailable</h3><p class="muted">${escapeHtml(logError.message || "The backend could not retrieve CloudWatch logs.")}</p></div>` : logsHtml(liveLogs);
      $("#deployment-activity").innerHTML = deploymentRecords
        ? deploymentRecords.length
          ? `${deployments.complete === false ? `<p class="muted">Some records were excluded from this time range because ${deployments.recordsWithoutTimestamp} authorized record(s) have no timestamp.</p>` : ""}<table class="data-table"><thead><tr><th>ID</th><th>Status</th><th>Environment</th><th>Created</th></tr></thead><tbody>${deploymentRecords.slice(0, 20).map(item => `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.status || "Not available")}</td><td>${escapeHtml(item.environment || "Not available")}</td><td>${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "Not available")}</td></tr>`).join("")}</tbody></table>`
          : deployments.complete === false
            ? `<p class="muted">${deployments.recordsWithoutTimestamp} authorized deployment record(s) have no timestamp, so history for this range is incomplete.</p>`
            : `<p class="muted">No authorized deployment records are available for this range.</p>`
        : `<p class="muted">Deployment history is unavailable because the backend request failed. Refresh to retry.</p>`;
      if (!logError) filterLogs();
    } catch (error) {
      liveLogs = [];
      $("#log-metric-0").textContent = "Not available";
      $("#log-metric-1").textContent = "Not available";
      $("#log-metric-2").textContent = "Not available";
      $("#log-metric-3").textContent = "Not available";
      $("#log-metric-4").textContent = "Not available";
      $("#logs-list").innerHTML = `<div class="empty-state"><h3>CloudWatch logs unavailable</h3><p class="muted">${escapeHtml(error.message || "The backend could not retrieve CloudWatch logs.")}</p></div>`;
      stateLabel.textContent = `${error.message || "CloudWatch logs could not be loaded."} Use Refresh to retry.`;
      connection.textContent = error.status === 401 ? "Session expired" : "Unavailable";
      connection.className = "badge badge-error";
    } finally {
      if (button) button.disabled = false;
      if (rangeSelect) rangeSelect.disabled = false;
    }
  }
  function simpleResourcePage(title, intro, resources) { const cards = resources.map(r => `<article class="card project-card"><div class="pipeline-head"><h2>${r[0]}</h2><span class="badge badge-success">Ready</span></div><span class="eyebrow">${r[1]}</span><p class="muted">${r[2]}</p><div class="project-meta"><span>${icon("map-pin",14)} ${r[3]}</span><span>Terraform-managed</span></div></article>`).join(""); const files = title === "Infrastructure" ? `<div class="card"><div class="pipeline-head"><h2>Private file storage</h2><span class="badge badge-info">Protected S3</span></div><p class="muted">Upload files to your authenticated private S3 prefix. Files are limited to 10 MB and are never made public.</p><form id="file-upload-form" class="action-row"><label class="btn btn-secondary" for="file-input">${icon("paperclip",16)} Choose file</label><input id="file-input" class="sr-only" type="file" accept=".pdf,.gif,.jpg,.jpeg,.png,.svg,.txt,.json,.zip" required><button class="btn btn-primary" type="submit">${icon("upload",16)} Upload</button></form><p id="file-status" class="muted" role="status" aria-live="polite"></p><div id="file-list" class="table-wrap"><p class="muted">Loading your files...</p></div></div><div class="card"><div class="pipeline-head"><h2>Terraform plan preview</h2><span class="badge badge-warning">Example only</span></div><pre class="code-preview">+ aws_s3_bucket.artifacts\n+ aws_cloudfront_distribution.app\n+ aws_ecs_service.api\n+ aws_dynamodb_table.projects</pre></div>` : ""; return `<div class="page-head"><div><div class="eyebrow">Cloud foundation</div><h1>${title}</h1><p class="muted">${intro}</p></div><span class="badge badge-info">Demo resources</span></div><div class="project-grid">${cards}</div>${files}`; }
  function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }  function render() {
    const hashParts = location.hash.slice(1).split("#");
    route = hashParts[0] || document.body.dataset.page || "landing";
    const anchor = hashParts[1];

    applyTheme();
    document.title = route === "landing"
      ? "Cloud Deploy - Ship with confidence"
      : `Cloud Deploy - ${route}`;
    $("#app").innerHTML = route === "landing" ? landing() : shell(route);
    refreshIcons();

    if (route === "dashboard") {
      drawChart(
        "activity-chart",
        ["Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12"],
        [18, 31, 24, 42, 36],
        "rgba(66,99,235,.75)"
      );
    }

    if (route === "costs") {
      drawChart(
        "cost-chart",
        ["Jun", "Jul", "Aug", "Sep", "Oct"],
        [290, 340, 315, 390, 420],
        "rgba(20,184,166,.75)"
      );
    }

    bind();
    if (route === "infrastructure") setupFileManager();
    if (route === "logs" && window.CloudDeployAuth?.isAuthenticated?.()) loadCloudWatchLogs();
    if (anchor) {
      window.setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 0);
    }
  }
  function drawChart(id, labels, data, color) { const canvas = document.getElementById(id); if (!canvas || !window.Chart) return; charts[id]?.destroy(); charts[id] = new Chart(canvas, { type:"line", data:{labels,datasets:[{data,borderColor:color,backgroundColor:color.replace(".75",".12"),fill:true,tension:.35,pointRadius:3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:"#94a3b8"}},y:{grid:{color:"#e2e8f033"},ticks:{color:"#94a3b8"}}}} }); }
  function bind() {
    document.querySelectorAll("[data-route]").forEach(el => el.addEventListener("click", () => { location.href = routeFile(el.dataset.route); $("#sidebar")?.classList.remove("open"); }));
    document.querySelectorAll("[data-action]").forEach(el => el.addEventListener("click", () => actions(el.dataset.action, el)));
    $("#project-search")?.addEventListener("input", filterProjects); $("#project-status")?.addEventListener("change", filterProjects); $("#project-type")?.addEventListener("change", filterProjects);
    $("#deployment-search")?.addEventListener("input", filterDeployments); $("#deployment-filter")?.addEventListener("change", filterDeployments);
    $("#log-search")?.addEventListener("input", filterLogs); $("#log-level")?.addEventListener("change", filterLogs); $("#log-service")?.addEventListener("input", filterLogs); $("#log-deployment")?.addEventListener("input", filterLogs); $("#log-range")?.addEventListener("change", loadCloudWatchLogs); $("#refresh-logs")?.addEventListener("click", loadCloudWatchLogs); $("#deploy-form")?.addEventListener("submit", startDeploy);
    $("#global-search")?.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.value.trim()) { location.href = `projects.html?search=${encodeURIComponent(e.target.value.trim())}`; } });
  }
  async function setupFileManager() {
    const form = $("#file-upload-form");
    const list = $("#file-list");
    if (!form || !list) return;
    const renderFiles = files => {
      list.innerHTML = files.length
        ? files.map(file => `<div class="project-meta"><span>${icon("file",14)} ${escapeHtml(file.name)}</span><span>${Math.ceil(file.size / 1024)} KB <button class="btn btn-ghost" data-file-download="${escapeHtml(file.key)}">Download</button><button class="btn btn-danger" data-file-delete="${escapeHtml(file.key)}">Delete</button></span></div>`).join("")
        : `<p class="muted">No files uploaded yet.</p>`;
      list.querySelectorAll("[data-file-download]").forEach(button => button.addEventListener("click", async () => {
        try {
          const blob = await CloudDeployApi.downloadFile(button.dataset.fileDownload);
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "cloud-deploy-file";
          anchor.click();
          URL.revokeObjectURL(url);
        } catch (error) {
          toast(error.message, "error");
        }
      }));
      list.querySelectorAll("[data-file-delete]").forEach(button => button.addEventListener("click", async () => {
        if (!confirm("Delete this private file?")) return;
        try {
          await CloudDeployApi.deleteFile(button.dataset.fileDelete);
          await loadFiles();
          toast("File deleted.");
        } catch (error) {
          toast(error.message, "error");
        }
      }));
      refreshIcons();
    };
    const loadFiles = async () => {
      try {
        renderFiles(await CloudDeployApi.listFiles());
      } catch (error) {
        list.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
      }
    };
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const input = $("#file-input");
      const file = input.files[0];
      if (!file) return;
      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true;
      $("#file-status").textContent = "Uploading securely...";
      try {
        await CloudDeployApi.uploadFile(file);
        input.value = "";
        $("#file-status").textContent = "Upload confirmed by the backend.";
        await loadFiles();
      } catch (error) {
        $("#file-status").textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    });
    await loadFiles();
  }
  function filterProjects(e) { const q = ($("#project-search")?.value || "").toLowerCase(); const s = $("#project-status")?.value || ""; const t = $("#project-type")?.value || ""; $("#project-list").innerHTML = projectCards(state.projects.filter(p => (!q || `${p.name} ${p.description} ${p.repo}`.toLowerCase().includes(q)) && (!s || p.status === s) && (!t || p.type === t))); refreshIcons(); }
  function filterDeployments() { const q = ($("#deployment-search")?.value || "").toLowerCase(), s = $("#deployment-filter")?.value || ""; $("#deployment-table").innerHTML = deploymentTable(true); document.querySelectorAll("#deployment-table tbody tr").forEach(row => { const show = (!q || row.textContent.toLowerCase().includes(q)) && (!s || row.textContent.includes(s)); row.classList.toggle("hidden", !show); }); refreshIcons(); }
  function filterLogs() {
    const q = ($("#log-search")?.value || "").trim().toLowerCase();
    const level = ($("#log-level")?.value || "").toLowerCase();
    const service = ($("#log-service")?.value || "").trim().toLowerCase();
    const deployment = ($("#log-deployment")?.value || "").trim().toLowerCase();
    const rows = [...document.querySelectorAll("#logs-list tbody tr")];
    rows.forEach(row => {
      const raw = (row.dataset.log || "").toLowerCase();
      row.classList.toggle("hidden", !raw.includes(q) || (level && !raw.startsWith(level)) || (service && !raw.includes(service)) || (deployment && !raw.includes(deployment)));
    });
    if (rows.length) $("#logs-state").textContent = `Showing ${rows.filter(row => !row.classList.contains("hidden")).length} of ${rows.length} returned CloudWatch events.`;
  }
  function modal(content) { const wrap = document.createElement("div"); wrap.className = "modal-backdrop"; wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${content}</div>`; document.body.append(wrap); wrap.addEventListener("click", e => { if (e.target === wrap || e.target.closest("[data-close]")) wrap.remove(); }); wrap.querySelectorAll("[data-route]").forEach(el => el.addEventListener("click", () => { location.href = routeFile(el.dataset.route); wrap.remove(); })); const first = wrap.querySelector("input,button,select"); first?.focus(); refreshIcons(); return wrap; }
  function actions(action, el) {
    if (action === "theme") { state.theme = state.theme === "dark" ? "light" : "dark"; saveState(); render(); }
    if (action === "sidebar") $("#sidebar")?.classList.toggle("open");
    if (action === "notifications") modal(`<div class="modal-head"><h2>Notifications</h2><button class="icon-btn" data-close>${icon("x")}</button></div><p class="muted">No notifications are available because no persisted deployments exist.</p><button class="btn btn-secondary" data-close>Close</button>`);
    if (action === "profile") location.href = "user.html";
    if (action === "new-project") projectModal();
    if (action === "edit-project") { const project = state.projects.find(p => p.id === el.dataset.id); if (project) projectModal(project); else toast("Project not found.", "error"); }
    if (action === "project-details") { const p = state.projects.find(x => x.id === el.dataset.id); if (!p) return toast("Project not found.", "error"); modal(`<div class="modal-head"><h2>${escapeHtml(p.name)}</h2><button class="icon-btn" data-close>${icon("x")}</button></div><p>${escapeHtml(p.description)}</p><p class="muted">${p.repo} - ${p.branch}</p><hr><p><strong>Target:</strong> ${p.target}<br><strong>Environment:</strong> ${p.environment}<br><strong>Created:</strong> ${p.created}</p><button class="btn btn-primary" data-route="deploy" data-close>Deploy demo</button>`); }
    if (action === "delete-project") { if (confirm("Delete this demo project?")) { state.projects = state.projects.filter(p => p.id !== el.dataset.id); saveState(); render(); toast("Demo project deleted."); } }
    if (action === "reset") { if (confirm("Reset Cloud Deploy local demo data? This only removes this app's browser key and does not affect backend or AWS data.")) { localStorage.removeItem(KEY); state = createDefaultState(); render(); toast("Local Cloud Deploy data reset."); } }
    if (action === "notifications-toggle") { state.notifications = !state.notifications; saveState(); render(); toast(`Deployment notifications ${state.notifications ? "enabled" : "disabled"}.`); }
    if (action === "setting-toggle") { el.classList.toggle("on"); toast("Preference updated."); }
    if (action === "integration") toast("Integration placeholder: connect a backend OAuth flow here.", "success");
    if (action === "copy-logs") {
      const visible = [...document.querySelectorAll("#logs-list tbody tr:not(.hidden)")].map(row => row.innerText).join("\n");
      if (!visible) return toast("There are no filtered CloudWatch events to copy.", "error");
      if (!navigator.clipboard?.writeText) return toast("Clipboard access is unavailable in this browser context.", "error");
      navigator.clipboard.writeText(visible).then(() => toast("Filtered CloudWatch logs copied."), () => toast("Clipboard access is unavailable.", "error"));
    }
    if (action === "clear-logs") {
      $("#log-search").value = "";
      $("#log-level").value = "";
      $("#log-service").value = "";
      $("#log-deployment").value = "";
      const range = $("#log-range");
      const rangeChanged = range?.value !== "1h";
      if (range) range.value = "1h";
      if (rangeChanged) loadCloudWatchLogs();
      else filterLogs();
    }
    if (action === "budget") { const value = prompt("Set demo monthly budget (USD):", "600"); if (value && !Number.isNaN(Number(value)) && Number(value) > 0) toast(`Demo budget set to $${Number(value).toFixed(0)}.`); else if (value) toast("Enter a positive number.", "error"); }
    if (action === "deployment-detail") toast("Details panel is demo-only; no live release metadata is available.");
  }
  function projectModal(project = {}) { const editing = Boolean(project.id); const wrap = modal(`<div class="modal-head"><h2>${editing ? "Edit project" : "Create project"}</h2><button class="icon-btn" data-close>${icon("x")}</button></div><form id="project-form" class="form-grid"><div class="field full"><label for="p-name">Project name</label><input id="p-name" required value="${escapeHtml(project.name || "")}" maxlength="60"></div><div class="field full"><label for="p-description">Description</label><textarea id="p-description" required>${escapeHtml(project.description || "")}</textarea></div><div class="field"><label for="p-repo">GitHub repository URL <span class="muted">(optional)</span></label><input id="p-repo" type="url" placeholder="https://github.com/org/repo" value="${escapeHtml(project.repo || "")}"></div><div class="field"><label for="p-branch">Branch name <span class="muted">(optional)</span></label><input id="p-branch" value="${escapeHtml(project.branch || "")}"></div><div class="field"><label for="p-type">Application type</label><select id="p-type">${["Static HTML","React","Node.js","Docker"].map(x=>`<option ${x===project.type?"selected":""}>${x}</option>`).join("")}</select></div><div class="field"><label for="p-target">Deployment target</label><select id="p-target"><option>Amazon S3 + CloudFront</option><option>ECS Fargate</option><option>Amazon EKS</option></select></div><div class="field"><label for="p-env">Environment</label><select id="p-env"><option>Development</option><option>Staging</option><option>Production</option></select></div><div class="field"><label for="p-command">Build command</label><input id="p-command" value="${project.command || "npm run build"}"></div><div class="field full"><label for="p-output">Output directory</label><input id="p-output" value="${project.output || "dist"}"></div><div class="action-row field full"><button class="btn btn-secondary" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">${editing ? "Save changes" : "Create project"}</button></div></form>`); $("#project-form", wrap).addEventListener("submit", e => { e.preventDefault(); const data = { name:$("#p-name",wrap).value.trim(),description:$("#p-description",wrap).value.trim(),repo:$("#p-repo",wrap).value.trim(),branch:$("#p-branch",wrap).value.trim(),type:$("#p-type",wrap).value,target:$("#p-target",wrap).value,environment:$("#p-env",wrap).value,command:$("#p-command",wrap).value,output:$("#p-output",wrap).value,status:project.status || "Healthy",created:project.created || new Date().toISOString().slice(0,10),id:project.id || `p${Date.now()}` }; if (!data.name || !data.description) return toast("Complete the required project fields.", "error"); state.projects = editing ? state.projects.map(p => p.id === project.id ? data : p) : [data, ...state.projects]; saveState(); wrap.remove(); render(); toast(editing ? "Project updated." : "Project created."); }); }
  async function startDeploy(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = form.querySelector(".deploy-submit");
    const projectId = $("#deploy-project").value;
    const environmentVariableNames = $("#deploy-vars").value.split(",").map(value => value.trim()).filter(Boolean);
    const payload = {
      projectId,
      branch: $("#deploy-branch").value.trim(),
      applicationType: $("#deploy-type").value,
      region: $("#deploy-region").value,
      environment: $("#deploy-env").value,
      buildCommand: $("#deploy-command").value.trim(),
      environmentVariableNames
    };
    submit.disabled = true;
    submit.textContent = "Queueing deployment...";
    try {
      const deployment = await CloudDeployApi.createDeployment(payload);
      state.deployments = [deployment, ...state.deployments.filter(item => item.id !== deployment.id)];
      const box = $("#deployment-progress");
      box.classList.remove("hidden");
      box.innerHTML = `<h3>Deployment queued</h3><p class="muted">Deployment ID: <strong>${escapeHtml(deployment.id)}</strong></p><p class="muted">Status: <strong>${escapeHtml(deployment.status)}</strong>. No AWS resource was created.</p><button class="btn btn-secondary" type="button" data-route="deployments">View deployments</button>`;
      toast(`Deployment ${deployment.id} queued.`);
      refreshIcons();
    } catch (error) {
      toast(error.message || "Deployment could not be queued.", "error");
      submit.disabled = false;
      submit.innerHTML = `${icon("rocket",16)} Queue deployment`;
      refreshIcons();
    }
  }
  async function hydrateFromBackend() {
    if (!CloudDeployApi.isConfigured || route === "logs") return;
    try {
      const [projects, deployments] = await Promise.all([
        CloudDeployApi.getProjects(),
        CloudDeployApi.getDeployments()
      ]);
      state.projects = Array.isArray(projects) ? projects : [];
      state.deployments = Array.isArray(deployments) ? deployments : [];
      render();
    } catch (error) {
      toast(error.message || "Backend data could not be loaded.", "error");
    }
  }

  async function handleBackendProjectSubmit(event) {
    if (!CloudDeployApi.isConfigured || event.target.id !== "project-form") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.target;
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    const payload = {
      name: $("#p-name", form.closest(".modal-backdrop")).value.trim(),
      description: $("#p-description", form.closest(".modal-backdrop")).value.trim(),
      repositoryUrl: $("#p-repo", form.closest(".modal-backdrop")).value.trim() || undefined,
      branch: $("#p-branch", form.closest(".modal-backdrop")).value.trim() || undefined,
      applicationType: $("#p-type", form.closest(".modal-backdrop")).value,
      environment: $("#p-env", form.closest(".modal-backdrop")).value,
      deploymentTarget: $("#p-target", form.closest(".modal-backdrop")).value,
      buildCommand: $("#p-command", form.closest(".modal-backdrop")).value.trim() || undefined,
      outputDirectory: $("#p-output", form.closest(".modal-backdrop")).value.trim() || undefined
    };
    try {
      const project = await CloudDeployApi.createProject(payload);
      state.projects = [project, ...state.projects];
      form.closest(".modal-backdrop").remove();
      render();
      toast("Project created in the backend.");
    } catch (error) {
      submit.disabled = false;
      toast(error.message || "Project could not be created.", "error");
    }
  }

  async function handleBackendDelete(event) {
    const button = event.target.closest("[data-action=delete-project]");
    if (!CloudDeployApi.isConfigured || !button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!confirm("Delete this project from the configured backend?")) return;
    try {
      await CloudDeployApi.deleteProject(button.dataset.id);
      state.projects = state.projects.filter(project => project.id !== button.dataset.id);
      render();
      toast("Project deleted.");
    } catch (error) {
      toast(error.message || "Project could not be deleted.", "error");
    }
  }

  document.addEventListener("submit", handleBackendProjectSubmit, true);
  document.addEventListener("click", handleBackendDelete, true);
  window.addEventListener("hashchange", render);
  window.setInterval(() => { if (route === "dashboard") { const date = $("#india-date"); const clock = $("#india-clock"); if (date) date.textContent = indiaDate(); if (clock) clock.textContent = indiaClock(); } }, 1000);
  render();
  const isAuthenticated = window.CloudDeployAuth?.isAuthenticated?.() === true;
  const isPublicLanding = location.pathname.endsWith("/index.html") || location.pathname.endsWith("/");
  if (!isPublicLanding && isAuthenticated) {
    hydrateFromBackend();
    CloudDeployApi.getProfile?.().then(value => { profile = value; if (route === "dashboard") render(); }).catch(() => {});
  }
})();
