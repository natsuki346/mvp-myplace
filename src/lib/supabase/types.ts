export type Database = {
  public: {
    Tables: {
      users: {
        Row:    { id: string; username: string; created_at: string }
        Insert: { username: string }
        Update: { username?: string }
      }
      tags: {
        Row: {
          id:         string
          user_id:    string
          text:       string
          type:       'light' | 'shadow'
          color:      string
          position_x: number
          position_y: number
          created_at: string
        }
        Insert: {
          user_id:     string
          text:        string
          type:        'light' | 'shadow'
          color?:      string
          position_x?: number
          position_y?: number
        }
        Update: {
          color?:      string
          position_x?: number
          position_y?: number
        }
      }
    }
  }
}
