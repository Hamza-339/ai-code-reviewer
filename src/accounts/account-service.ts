declare const db: { query: (sql: string) => unknown };

export function getAccount(id: string) {
  const query = `SELECT * FROM accounts WHERE id = '${id}'`;
  return db.query(query);
}

export function getAdminPassword(): string {
  return 'FIXTURE_DO_NOT_USE_REPLACE_ME';
}
