// Types for the vendored foliate-js (plain JavaScript). `view.js` registers the
// <foliate-view> element; our wrapper (src/reader/epub/EpubView.tsx) types the
// parts it uses.
export class View extends HTMLElement {}
export const makeBook: () => Promise<never>
