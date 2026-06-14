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
          id:           string
          user_id:      string
          text:         string
          type:         'light' | 'shadow'
          color:        string
          position_x:   number | null
          position_y:   number | null
          created_at:   string
          is_active:    boolean
          growth_point: number
          seed_weight:  'light' | 'heavy'
          stage:        number
        }
        Insert: {
          user_id:     string
          text:        string
          type:        'light' | 'shadow'
          color?:      string
          position_x?: number | null
          position_y?: number | null
          seed_weight?: 'light' | 'heavy'
        }
        Update: {
          color?:        string
          position_x?:   number | null
          position_y?:   number | null
          is_active?:    boolean
          growth_point?: number
          seed_weight?:  'light' | 'heavy'
          stage?:        number
        }
      }
      messages: {
        Row: {
          id:         string
          tag_id:     string
          sub_tag_id: string | null
          user_id:    string
          content:    string
          created_at: string
        }
        Insert: {
          tag_id:     string
          sub_tag_id?: string | null
          user_id:    string
          content:    string
        }
        Update: {
          content?: string
        }
      }
      sub_tags: {
        Row: {
          id:            string
          parent_tag_id: string
          name:          string
          user_id:       string
          created_at:    string
        }
        Insert: {
          parent_tag_id: string
          name:          string
          user_id:       string
        }
        Update: {
          name?: string
        }
      }
    }
  }
}
