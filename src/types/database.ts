// Supabase schema types, in the format of `supabase gen types typescript`.
// Written by hand to match migrations 001 + 002 until 002 is applied to production;
// then regenerate with `npm run db:types` and do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          apy_bps: number
          balance_cents: number
          created_at: string
          currency: string
          id: string
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          apy_bps?: number
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          kind: string
          name: string
          user_id: string
        }
        Update: {
          apy_bps?: number
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          id: string
          limit_cents: number
          user_id: string
        }
        Insert: {
          category: string
          id?: string
          limit_cents: number
          user_id: string
        }
        Update: {
          category?: string
          id?: string
          limit_cents?: number
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          account_id: string
          card_holder: string
          created_at: string
          expiry: string
          id: string
          is_frozen: boolean
          last4: string
          limit_cents: number
          spent_cents: number
          tier: string
          user_id: string
        }
        Insert: {
          account_id: string
          card_holder: string
          created_at?: string
          expiry: string
          id?: string
          is_frozen?: boolean
          last4: string
          limit_cents: number
          spent_cents?: number
          tier: string
          user_id: string
        }
        Update: {
          account_id?: string
          card_holder?: string
          created_at?: string
          expiry?: string
          id?: string
          is_frozen?: boolean
          last4?: string
          limit_cents?: number
          spent_cents?: number
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cards_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount_cents: number
          category: string
          created_at: string
          description: string
          id: string
          status: string
          transfer_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount_cents: number
          category: string
          created_at?: string
          description: string
          id?: string
          status?: string
          transfer_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount_cents?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          status?: string
          transfer_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      transfer_funds: {
        Args: {
          p_amount_cents: number
          p_description?: string
          p_from: string
          p_to: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
