import { showHelp } from '../settings/builtinSettings'
import { useDeviceSetting } from '../settings/useSetting'

/** True while Settings › Show help is on (the default). */
export function useShowHelp(): boolean {
  return useDeviceSetting(showHelp)[0] === 'on'
}
