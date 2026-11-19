import type { Category } from '../domain/finding';

export interface SeededBug {
  path: string;
  line: number;
  category: Category;
}

export interface Fixture {
  name: string;
  diff: string;
  seededBugs: SeededBug[];
}
