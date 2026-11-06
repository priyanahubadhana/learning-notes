/**
 * The bookmarklet for computer browsers: a bookmark whose address is a tiny
 * script. On any page it sends the page title, address and the selected
 * text to the app's Capture screen (in the address bar, so nothing goes
 * through a server). The text is cut to 8,000 characters (an address has a
 * limit); longer text is pasted by hand.
 */
export const BOOKMARKLET_TEXT_LIMIT = 8000

/** The capture address of the app at `appUrl` (its origin and path). */
export const captureAddress = (appUrl: string): string =>
  `${appUrl.replace(/#.*$/, '')}#/capture`

export function bookmarkletHref(appUrl: string): string {
  const base = JSON.stringify(captureAddress(appUrl))
  return (
    'javascript:(()=>{try{const s=String(getSelection()).slice(0,' +
    BOOKMARKLET_TEXT_LIMIT +
    ');location.href=' +
    base +
    "+'?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)+'&text='+encodeURIComponent(s)}catch(e){}})()"
  )
}
