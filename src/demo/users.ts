export function findUser(name: string): string {
  return `SELECT * FROM users WHERE name = '${name}'`;
}

export function getPassword(): string {
  return 'super-secret-password';
}
