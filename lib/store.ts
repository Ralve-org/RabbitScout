import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RefreshState {
  interval: number
  setInterval: (interval: number) => void
}

interface MaxNrOfMessagesState {
  maxNrOfMessages: number
  setMaxNrOfMessages: (maxNrOfMessages: number) => void
}

export const useRefreshStore = create<RefreshState>()(
  persist(
    (set) => ({
      interval: 5, // Default 5 seconds
      setInterval: (interval) => set({ interval }),
    }),
    {
      name: 'refresh-settings',
    }
  )
)


export const useMaxNrOfMessagesStore = create<MaxNrOfMessagesState>()(
    persist(
        (set) => ({
          maxNrOfMessages: 50, // Default 50 messages
          setMaxNrOfMessages: (maxNrOfMessages) => set({ maxNrOfMessages }),
        }),
        {
          name: 'max-nr-of-messages-settings',
        }
    )
)