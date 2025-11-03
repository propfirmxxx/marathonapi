export interface Seeder {
  /**
   * Run the seeder to insert data
   */
  run(): Promise<void>;

  /**
   * Clean the seeded data
   */
  clean(): Promise<void>;

  /**
   * Get the name of the seeder
   */
  getName(): string;
}
