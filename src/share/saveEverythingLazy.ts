/**
 * "Save everything" for the error screen. The zip code (fflate) is fetched
 * when the button is pressed; the app fetches it quietly once idle
 * (see main.tsx) so it is already on the device by then.
 */
export const saveEverythingLazy = (): Promise<void> =>
  import('./saveEverything').then((m) => m.saveEverything())
