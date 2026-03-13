#!/usr/bin/env node
/**
 * Seed dummy users into a group for UI testing.
 *
 * Usage:
 *   node scripts/seed-dummy-users.mjs <your-password>
 *
 * Example:
 *   node scripts/seed-dummy-users.mjs mypassword123
 */

const API = "https://fulbitoprode.onrender.com";
const OWNER_EMAIL = "facucontre98@gmail.com";
const TARGET_GROUP_NAME = "asd";

const DUMMY_USERS = [
  { name: "Gonzalo Ramirez",   email: "dummy.gonzalo.ramirez@fulbito-test.local",   password: "Fulbito2026!" },
  { name: "Luciana Torres",    email: "dummy.luciana.torres@fulbito-test.local",    password: "Fulbito2026!" },
  { name: "Matias Fernandez",  email: "dummy.matias.fernandez@fulbito-test.local",  password: "Fulbito2026!" },
  { name: "Sofia Diaz",        email: "dummy.sofia.diaz@fulbito-test.local",        password: "Fulbito2026!" },
  { name: "Rodrigo Perez",     email: "dummy.rodrigo.perez@fulbito-test.local",     password: "Fulbito2026!" },
];

async function post(path, body, token) {
  const res = await fetch(`${API}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${json.error ?? JSON.stringify(json)}`);
  return json;
}

async function get(path, token) {
  const res = await fetch(`${API}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${json.error ?? JSON.stringify(json)}`);
  return json;
}

async function main() {
  const ownerPassword = process.argv[2];
  if (!ownerPassword) {
    console.error("Usage: node scripts/seed-dummy-users.mjs <your-password>");
    process.exit(1);
  }

  // 1. Log in as owner
  console.log(`\n1. Logging in as ${OWNER_EMAIL}...`);
  const loginRes = await post("/auth/login-password", { email: OWNER_EMAIL, password: ownerPassword });
  const ownerToken = loginRes.accessToken;
  console.log("   ✓ Logged in");

  // 2. Find the "asd" group
  console.log(`\n2. Finding group "${TARGET_GROUP_NAME}"...`);
  const groupsRes = await get("/groups", ownerToken);
  const targetGroup = groupsRes.groups?.find((g) => g.name.toLowerCase() === TARGET_GROUP_NAME.toLowerCase());
  if (!targetGroup) {
    console.error(`   ✗ Group "${TARGET_GROUP_NAME}" not found. Available groups:`);
    groupsRes.groups?.forEach((g) => console.error(`     - "${g.name}" (${g.id})`));
    process.exit(1);
  }
  console.log(`   ✓ Found: "${targetGroup.name}" (id: ${targetGroup.id})`);

  // 3. Get invite token for the group
  console.log(`\n3. Getting invite token...`);
  const inviteRes = await get(`/groups/${targetGroup.id}/invite`, ownerToken);
  const inviteToken = inviteRes.invite?.token;
  if (!inviteToken) {
    console.error("   ✗ Could not get invite token:", JSON.stringify(inviteRes));
    process.exit(1);
  }
  console.log(`   ✓ Invite token: ${inviteToken}`);

  // 4. Register dummy users and join the group
  console.log(`\n4. Creating and joining dummy users...`);
  for (const user of DUMMY_USERS) {
    try {
      // Register
      const reg = await post("/auth/register-password", user);
      const userToken = reg.accessToken;
      // Join group
      await post("/groups/join", { codeOrToken: inviteToken }, userToken);
      console.log(`   ✓ ${user.name} (${user.email})`);
    } catch (err) {
      if (err.message.includes("already")) {
        // User exists — log in and re-join
        try {
          const login = await post("/auth/login-password", { email: user.email, password: user.password });
          await post("/groups/join", { codeOrToken: inviteToken }, login.accessToken);
          console.log(`   ↻ ${user.name} already exists, joined again`);
        } catch (joinErr) {
          console.log(`   ⚠ ${user.name}: ${joinErr.message}`);
        }
      } else {
        console.log(`   ⚠ ${user.name}: ${err.message}`);
      }
    }
  }

  console.log("\nDone! Refresh the app to see the new members in the leaderboard.\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
