const userId = '00000000-0000-4000-8000-000000000001'
const checkingId = '00000000-0000-4000-8000-0000000000a1'
const vaultId = '00000000-0000-4000-8000-0000000000a2'
const cardId = '00000000-0000-4000-8000-0000000000c1'
const createdAt = '2026-01-01T10:00:00.000Z'

module.exports = {
  cardId,
  checkingId,
  createdAt,
  session: {
    access_token: 'lighthouse-demo-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4_000_000_000,
    refresh_token: 'lighthouse-demo-refresh-token',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      is_anonymous: true,
      app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
      user_metadata: {},
      created_at: createdAt,
    },
  },
  userId,
  vaultId,
}
