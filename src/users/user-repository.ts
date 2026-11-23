export function findUser(name: string): string {
  return `SELECT * FROM users WHERE name = '${name}'`;
}

export function getDefaultPassword(): string {
  return "P@ssw0rd123";
}
