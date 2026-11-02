/** Saves text or a Blob as a file through the browser's download. */
export function downloadFile(
  fileName: string,
  content: Blob | string,
  type = 'text/plain',
): void {
  const blob =
    typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Generous: a big file on an iPad can take a while to start saving.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
