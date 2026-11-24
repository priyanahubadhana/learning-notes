import { useEffect, useState, useSyncExternalStore } from 'react'
import type { AiJob } from '../aitools/jobs/jobTypes'
import type { ObservableJobStore } from './engine'
import type { PasteFiller, PasteRequest } from './pasteFiller'

/** Every job, newest first; updates whenever a job is saved. */
export function useJobs(store: ObservableJobStore): AiJob[] {
  const [jobs, setJobs] = useState<AiJob[]>([])
  useEffect(() => {
    let live = true
    const load = () =>
      void store.list().then((all) => {
        if (live) setJobs(all.reverse())
      })
    load()
    const off = store.subscribe(load)
    return () => {
      live = false
      off()
    }
  }, [store])
  return jobs
}

/** One job by id; updates whenever it is saved. */
export function useJob(
  store: ObservableJobStore,
  id: string | null,
): AiJob | undefined {
  const [job, setJob] = useState<AiJob | undefined>()
  useEffect(() => {
    let live = true
    if (!id) return
    const load = () =>
      void store.get(id).then((j) => {
        if (live) setJob(j)
      })
    load()
    const off = store.subscribe(load)
    return () => {
      live = false
      off()
    }
  }, [store, id])
  return id ? job : undefined
}

/** What the paste filler is waiting for right now. */
export function usePasteRequest(filler: PasteFiller): PasteRequest | null {
  return useSyncExternalStore(
    (cb) => filler.subscribe(cb),
    () => filler.current(),
  )
}
