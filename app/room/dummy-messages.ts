export type DummyMessage = {
  id: string
  content: string
  created_at: string
  user_id: string
  users: {
    id: string
    username: string
    avatar_url: string | null
  }
}

export const DUMMY_MESSAGES_COMMON: DummyMessage[] = []
