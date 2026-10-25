/** Runs a background task from a UI event and logs any failure. */
export function runTask(task: Promise<unknown>): void {
  task.catch((error: unknown) => console.error(error))
}
