const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key';
const JWT_EXPIRES_IN = '1h';

const USERS = {
  student: {
    password: 'password123',
    user_id: 'student_ddmmyyyy',
    email_id: 'student@college.edu',
    college_roll_number: '123456',
  },
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const EDGE_PATTERN = /^[A-Z]->[A-Z]$/;

function parseRequestEntries(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const acceptedEdges = [];

  if (!Array.isArray(data)) {
    throw new Error('Expected data to be an array of strings');
  }

  for (const rawEntry of data) {
    const entry = typeof rawEntry === 'string' ? rawEntry.trim() : '';

    if (!entry) {
      invalidEntries.push(entry);
      continue;
    }

    if (!EDGE_PATTERN.test(entry)) {
      invalidEntries.push(entry);
      continue;
    }

    const [parent, child] = entry.split('->');
    if (parent === child) {
      invalidEntries.push(entry);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) {
        duplicateEdges.push(entry);
      }
      continue;
    }

    seenEdges.add(entry);
    acceptedEdges.push({ parent, child, entry });
  }

  return { acceptedEdges, invalidEntries, duplicateEdges };
}

function buildHierarchyGroups(edges) {
  const childParent = {};
  const childrenMap = {};
  const nodes = new Set();

  for (const { parent, child } of edges) {
    nodes.add(parent);
    nodes.add(child);

    if (childParent[child]) {
      continue; // multi-parent: keep first parent only
    }

    childParent[child] = parent;
    if (!childrenMap[parent]) {
      childrenMap[parent] = [];
    }
    childrenMap[parent].push(child);
    if (!childrenMap[child]) {
      childrenMap[child] = [];
    }
  }

  const undirected = {};
  for (const node of nodes) {
    undirected[node] = new Set();
  }
  for (const [parent, children] of Object.entries(childrenMap)) {
    for (const child of children) {
      undirected[parent].add(child);
      undirected[child].add(parent);
    }
  }

  const visited = new Set();
  const groups = [];

  for (const node of nodes) {
    if (visited.has(node)) {
      continue;
    }

    const queue = [node];
    const group = new Set();
    visited.add(node);
    group.add(node);

    while (queue.length) {
      const current = queue.shift();
      for (const neighbor of undirected[current] || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          group.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    groups.push(Array.from(group).sort());
  }

  return { childrenMap, childParent, groups };
}

function hasCycleForGroup(groupNodes, childrenMap) {
  const groupSet = new Set(groupNodes);
  const visited = new Set();
  const stack = new Set();

  function dfs(node) {
    if (stack.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    stack.add(node);
    const children = childrenMap[node] || [];
    for (const child of children) {
      if (!groupSet.has(child)) {
        continue;
      }
      if (dfs(child)) {
        return true;
      }
    }
    stack.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of groupNodes) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }

  return false;
}

function buildTreeObject(root, childrenMap) {
  const children = (childrenMap[root] || []).slice().sort();
  const tree = {};
  for (const child of children) {
    tree[child] = buildTreeObject(child, childrenMap);
  }
  return tree;
}

function calculateDepth(root, childrenMap) {
  const children = childrenMap[root] || [];
  if (children.length === 0) {
    return 1;
  }
  let maxChildDepth = 0;
  for (const child of children) {
    maxChildDepth = Math.max(maxChildDepth, calculateDepth(child, childrenMap));
  }
  return 1 + maxChildDepth;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ error: 'Token verification failed' });
    }
    req.user = payload;
    next();
  });
}

app.post('/signup', (req, res) => {
  const { username, password, email_id, college_roll_number } = req.body || {};

  if (!username || !password || !email_id || !college_roll_number) {
    return res.status(400).json({ error: 'Username, password, email, and college roll number are required' });
  }

  if (USERS[username]) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  USERS[username] = {
    password,
    user_id: username,
    email_id,
    college_roll_number,
  };

  const user = USERS[username];
  const token = jwt.sign({ username, user_id: user.user_id, email_id: user.email_id, college_roll_number: user.college_roll_number }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.status(201).json({
    token,
    username,
    user_id: user.user_id,
    email_id: user.email_id,
    college_roll_number: user.college_roll_number,
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = USERS[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ username, user_id: user.user_id, email_id: user.email_id, college_roll_number: user.college_roll_number }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({
    token,
    username,
    user_id: user.user_id,
    email_id: user.email_id,
    college_roll_number: user.college_roll_number,
  });
});

app.post('/bfhl', authenticateToken, (req, res) => {
  try {
    const { data } = req.body;
    const { acceptedEdges, invalidEntries, duplicateEdges } = parseRequestEntries(data);
    const { childrenMap, childParent, groups } = buildHierarchyGroups(acceptedEdges);

    const hierarchies = [];
    let totalTrees = 0;
    let totalCycles = 0;
    let largestTreeRoot = '';
    let largestTreeDepth = 0;

    const { user_id, email_id, college_roll_number } = req.user;

    for (const group of groups) {
      const rootCandidates = group.filter(node => !childParent[node]);
      const hasCycle = hasCycleForGroup(group, childrenMap);
      const root = rootCandidates.length > 0 ? rootCandidates.sort()[0] : group.slice().sort()[0];
      const hierarchy = { root, tree: {} };

      if (hasCycle) {
        hierarchy.tree = {};
        hierarchy.has_cycle = true;
        totalCycles += 1;
      } else {
        hierarchy.tree = { [root]: buildTreeObject(root, childrenMap) };
        hierarchy.depth = calculateDepth(root, childrenMap);
        totalTrees += 1;

        if (hierarchy.depth > largestTreeDepth ||
          (hierarchy.depth === largestTreeDepth && (largestTreeRoot === '' || root < largestTreeRoot))) {
          largestTreeDepth = hierarchy.depth;
          largestTreeRoot = root;
        }
      }

      hierarchies.push(hierarchy);
    }

    if (!largestTreeRoot && totalTrees > 0) {
      largestTreeRoot = hierarchies
        .filter(h => !h.has_cycle)
        .map(h => h.root)
        .sort()[0] || '';
    }

    res.json({
      user_id,
      email_id,
      college_roll_number,
      hierarchies,
      invalid_entries: invalidEntries,
      duplicate_edges: duplicateEdges,
      summary: {
        total_trees: totalTrees,
        total_cycles: totalCycles,
        largest_tree_root: largestTreeRoot || null,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid request payload' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
