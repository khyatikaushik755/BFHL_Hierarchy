const inputData = document.getElementById('inputData');
const submitBtn = document.getElementById('submitBtn');
const exampleBtn = document.getElementById('exampleBtn');
const clearBtn = document.getElementById('clearBtn');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginEmail = document.getElementById('loginEmail');
const loginRoll = document.getElementById('loginRoll');
const openAuthBtn = document.getElementById('openAuthBtn');
const authModal = document.getElementById('authModal');
const authModalClose = document.getElementById('authModalClose');
const loginTabBtn = document.getElementById('loginTabBtn');
const signupTabBtn = document.getElementById('signupTabBtn');
const modalLoginBtn = document.getElementById('modalLoginBtn');
const modalSignupBtn = document.getElementById('modalSignupBtn');
const authMessage = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');
const loginStatus = document.getElementById('loginStatus');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const statusMessage = document.getElementById('statusMessage');
const apiStatus = document.getElementById('apiStatus');
const spinner = document.getElementById('spinner');
const responseSection = document.getElementById('results');
const summaryCards = document.getElementById('summaryCards');
const hierarchyCards = document.getElementById('hierarchyCards');
const invalidCard = document.getElementById('invalidCard');
const duplicateCard = document.getElementById('duplicateCard');
const responseJson = document.getElementById('responseJson');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');

let authToken = localStorage.getItem('bfhl_token') || null;
let authMode = 'login';

function setAuthenticated(token, profile) {
  authToken = token;
  localStorage.setItem('bfhl_token', token);
  loginUsername.value = '';
  loginPassword.value = '';
  loginEmail.value = '';
  loginRoll.value = '';
  loginStatus.textContent = `Logged in as ${profile.username || profile.user_id}`;
  loginStatus.className = 'status success';
  authModal.classList.add('hidden');
  authModal.setAttribute('aria-hidden', 'true');
  logoutBtn.classList.remove('hidden');
  submitBtn.disabled = false;
}

function clearAuthentication() {
  authToken = null;
  localStorage.removeItem('bfhl_token');
  loginStatus.textContent = 'Please login to enable hierarchy analysis.';
  loginStatus.className = 'status';
  logoutBtn.classList.add('hidden');
  submitBtn.disabled = true;
}

async function restoreAuthentication() {
  if (!authToken) {
    clearAuthentication();
    return;
  }

  loginStatus.textContent = 'Restoring login...';
  loginStatus.className = 'status';

  try {
    const response = await fetch('/bfhl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: ['A->B'] }),
    });

    if (!response.ok) {
      throw new Error('Token expired or invalid');
    }

    const result = await response.json();
    loginStatus.textContent = `Logged in as ${result.user_id}`;
    loginStatus.className = 'status success';
    logoutBtn.classList.remove('hidden');
    submitBtn.disabled = false;
  } catch (err) {
    clearAuthentication();
  }
}

const exampleText = [
  'A->B',
  'A->C',
  'B->D',
  'C->E',
  'E->F',
  'X->Y',
  'Y->Z',
  'Z->X',
  'P->Q',
  'Q->R',
  'G->H',
  'G->H',
  'G->I',
  'hello',
  '1->2',
  'A->'
].join('\n');

exampleBtn.addEventListener('click', () => {
  inputData.value = exampleText;
  statusMessage.textContent = '';
  responseSection.classList.add('hidden');
});

clearBtn.addEventListener('click', () => {
  inputData.value = '';
  responseJson.textContent = 'Waiting for submission...';
  invalidCard.textContent = 'None';
  duplicateCard.textContent = 'None';
  responseSection.classList.add('hidden');
  statusMessage.textContent = 'Ready to analyze your graph.';
  statusMessage.className = 'status';
  updateApiStatus('idle', 'idle');
});

openAuthBtn.addEventListener('click', () => {
  authModal.classList.remove('hidden');
  authModal.setAttribute('aria-hidden', 'false');
  setAuthMode('login');
});

authModalClose.addEventListener('click', () => {
  authModal.classList.add('hidden');
  authModal.setAttribute('aria-hidden', 'true');
});

loginTabBtn.addEventListener('click', () => setAuthMode('login'));
signupTabBtn.addEventListener('click', () => setAuthMode('signup'));

modalLoginBtn.addEventListener('click', async () => {
  await handleAuth('login');
});

modalSignupBtn.addEventListener('click', async () => {
  await handleAuth('signup');
});

function setAuthMode(mode) {
  authMode = mode;
  const signupFields = document.querySelectorAll('.signup-only');
  if (mode === 'signup') {
    loginTabBtn.classList.remove('active');
    signupTabBtn.classList.add('active');
    modalLoginBtn.classList.add('hidden');
    modalSignupBtn.classList.remove('hidden');
    signupFields.forEach(el => el.classList.remove('hidden'));
    authMessage.textContent = 'Fill in your details to create an account.';
  } else {
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    modalLoginBtn.classList.remove('hidden');
    modalSignupBtn.classList.add('hidden');
    signupFields.forEach(el => el.classList.add('hidden'));
    authMessage.textContent = 'Enter your username and password to login.';
  }
}

async function handleAuth(mode) {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();
  const email_id = loginEmail.value.trim();
  const college_roll_number = loginRoll.value.trim();

  if (!username || !password || (mode === 'signup' && (!email_id || !college_roll_number))) {
    authMessage.textContent = mode === 'signup'
      ? 'Please enter username, password, email, and college roll.'
      : 'Please enter username and password.';
    authMessage.className = 'status error';
    return;
  }

  authMessage.textContent = mode === 'signup' ? 'Signing up...' : 'Logging in...';
  authMessage.className = 'status';

  try {
    const endpoint = mode === 'signup' ? '/signup' : '/login';
    const body = mode === 'signup'
      ? { username, password, email_id, college_roll_number }
      : { username, password };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || `${mode === 'signup' ? 'Signup' : 'Login'} failed`);
    }

    const data = await response.json();
    setAuthenticated(data.token, data);
    statusMessage.textContent = mode === 'signup'
      ? 'Signup successful. You are now logged in.'
      : 'Login successful. You can now submit hierarchies.';
    statusMessage.className = 'status success';
  } catch (error) {
    authMessage.textContent = `${mode === 'signup' ? 'Signup' : 'Login'} error: ${error.message}`;
    authMessage.className = 'status error';
  }
}

logoutBtn.addEventListener('click', () => {
  clearAuthentication();
  statusMessage.textContent = 'Logged out. Please login again before submitting.';
  statusMessage.className = 'status';
});

window.addEventListener('load', async () => {
  await restoreAuthentication();
  if (!authToken) {
    authModal.classList.remove('hidden');
    authModal.setAttribute('aria-hidden', 'false');
    setAuthMode('login');
  }
});

copyJsonBtn.addEventListener('click', async () => {
  const jsonText = responseJson.textContent || '';
  try {
    await navigator.clipboard.writeText(jsonText);
    statusMessage.textContent = 'Response JSON copied to clipboard.';
    statusMessage.className = 'status success';
  } catch (err) {
    statusMessage.textContent = 'Copy failed. Please copy manually.';
    statusMessage.className = 'status error';
  }
});

submitBtn.addEventListener('click', async () => {
  const rawEntries = inputData.value
    .split(/\r?\n|,+/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);

  if (rawEntries.length === 0) {
    statusMessage.textContent = 'Enter at least one relationship line before submitting.';
    statusMessage.className = 'status error';
    return;
  }

  statusMessage.textContent = 'Calling API...';
  statusMessage.className = 'status';
  responseSection.classList.add('hidden');
  summaryCards.innerHTML = '';
  hierarchyCards.innerHTML = '';
  responseJson.textContent = 'Waiting for submission...';
  invalidCard.textContent = 'None';
  duplicateCard.textContent = 'None';
  updateApiStatus('loading', 'loading...');
  spinner.classList.remove('hidden');

  try {
    const response = await fetch('/bfhl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: rawEntries }),
    });

    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || 'API request failed');
    }

    const result = await response.json();
    renderResult(result);
    statusMessage.textContent = 'Success! API response rendered below.';
    statusMessage.className = 'status success';
    updateApiStatus('success', 'API response received');
  } catch (error) {
    statusMessage.textContent = `Error: ${error.message}`;
    statusMessage.className = 'status error';
    updateApiStatus('error', 'Error communicating with API');
  } finally {
    spinner.classList.add('hidden');
  }
});

expandAllBtn.addEventListener('click', () => setAllHierarchyDetails(true));
collapseAllBtn.addEventListener('click', () => setAllHierarchyDetails(false));

function setAllHierarchyDetails(open) {
  document.querySelectorAll('.hierarchy-card').forEach(details => {
    details.open = open;
  });
}

function updateApiStatus(state, message) {
  apiStatus.textContent = `API status: ${message}`;
  apiStatus.className = `api-status ${state}`;
}

function renderTree(nodeName, treeObject) {
  function renderNode(name, children) {
    if (!children || Object.keys(children).length === 0) {
      const leaf = document.createElement('li');
      leaf.className = 'tree-node leaf';
      leaf.textContent = name;
      return leaf;
    }

    const details = document.createElement('details');
    details.className = 'tree-node';

    const summary = document.createElement('summary');
    summary.textContent = name;
    details.appendChild(summary);

    const branch = document.createElement('ul');
    branch.className = 'tree-list';

    for (const child of Object.keys(children)) {
      branch.appendChild(renderNode(child, children[child]));
    }

    details.appendChild(branch);
    return details;
  }

  return renderNode(nodeName, treeObject[nodeName]);
}

function renderResult(result) {
  responseSection.classList.remove('hidden');
  summaryCards.innerHTML = '';
  hierarchyCards.innerHTML = '';

  const userCard = document.createElement('div');
  userCard.className = 'stats-card';
  userCard.innerHTML = `<h3>User ID</h3><p>${result.user_id}</p>`;
  summaryCards.appendChild(userCard);

  const emailCard = document.createElement('div');
  emailCard.className = 'stats-card';
  emailCard.innerHTML = `<h3>Email</h3><p>${result.email_id}</p>`;
  summaryCards.appendChild(emailCard);

  const rollCard = document.createElement('div');
  rollCard.className = 'stats-card';
  rollCard.innerHTML = `<h3>College Roll</h3><p>${result.college_roll_number}</p>`;
  summaryCards.appendChild(rollCard);

  const totalTreesCard = document.createElement('div');
  totalTreesCard.className = 'stats-card';
  totalTreesCard.innerHTML = `<h3>Total Trees</h3><p>${result.summary.total_trees}</p>`;
  summaryCards.appendChild(totalTreesCard);

  const totalCyclesCard = document.createElement('div');
  totalCyclesCard.className = 'stats-card';
  totalCyclesCard.innerHTML = `<h3>Total Cycles</h3><p>${result.summary.total_cycles}</p>`;
  summaryCards.appendChild(totalCyclesCard);

  const largestRootCard = document.createElement('div');
  largestRootCard.className = 'stats-card';
  largestRootCard.innerHTML = `<h3>Largest Tree Root</h3><p>${result.summary.largest_tree_root || 'N/A'}</p>`;
  summaryCards.appendChild(largestRootCard);

  invalidCard.textContent = result.invalid_entries.length > 0 ? result.invalid_entries.join('\n') : 'None';
  duplicateCard.textContent = result.duplicate_edges.length > 0 ? result.duplicate_edges.join('\n') : 'None';
  responseJson.textContent = JSON.stringify(result, null, 2);

  for (const hierarchy of result.hierarchies) {
    const card = document.createElement('div');
    card.className = 'card';

    const details = document.createElement('details');
    details.className = 'hierarchy-card';
    details.open = false;

    const summary = document.createElement('summary');
    summary.textContent = `Root: ${hierarchy.root}`;
    details.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'hierarchy-content';

    if (hierarchy.has_cycle) {
      const cycleInfo = document.createElement('p');
      cycleInfo.textContent = 'Cycle detected. Tree output is empty.';
      content.appendChild(cycleInfo);
    } else {
      const treeView = renderTree(hierarchy.root, hierarchy.tree);
      content.appendChild(treeView);
      const depthInfo = document.createElement('p');
      depthInfo.innerHTML = `<strong>Depth:</strong> ${hierarchy.depth}`;
      content.appendChild(depthInfo);
    }

    details.appendChild(content);
    card.appendChild(details);
    hierarchyCards.appendChild(card);
  }
}
