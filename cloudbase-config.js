// CloudBase v2
const tcbApp = cloudbase.init({ env: 'mood-diary-7g70cbf7ab52c4ce' });
const tcbAuth = tcbApp.auth({ persistence: 'local' });
const tcbDb = tcbApp.database();
