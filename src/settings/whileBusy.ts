/** Shows busy while `job` runs; always clears it, even if the job throws. */
export async function whileBusy(
  setBusy: (busy: boolean) => void,
  job: () => Promise<void>,
): Promise<void> {
  setBusy(true)
  try {
    await job()
  } finally {
    setBusy(false)
  }
}
