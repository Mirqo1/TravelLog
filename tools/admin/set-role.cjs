// Run only on a trusted computer; never import this tool into the mobile app.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { readFileSync } = require('node:fs');
async function main() {
  const [projectId, uid, role, action] = process.argv.slice(2);
  if (!projectId || !uid || !['admin', 'tester'].includes(role) || !['grant', 'revoke'].includes(action) || process.argv.length !== 6) {
    throw Error('Usage: node tools/admin/set-role.cjs PROJECT_ID FIREBASE_UID admin|tester grant|revoke');
  }
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) throw Error('Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file outside the repository.');
  const credentials = JSON.parse(readFileSync(keyPath, 'utf8'));
  if (credentials.project_id !== projectId) throw Error('The credential belongs to a different Firebase project.');
  initializeApp({ credential: applicationDefault(), projectId });
  const auth = getAuth();
  const user = await auth.getUser(uid);
  if (user.disabled) throw Error('The selected account is disabled.');
  const claims = { ...(user.customClaims || {}) };
  if (action === 'grant') claims[role] = true;
  else delete claims[role];
  // Preserve existing paid entitlement and unrelated roles.
  await auth.setCustomUserClaims(uid, claims);
  console.log(`${role}: ${action} completed for UID ${uid} in ${projectId}. Refresh access in the app.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
