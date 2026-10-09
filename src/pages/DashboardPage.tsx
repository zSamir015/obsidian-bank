import { Link } from 'react-router'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TransactionRow } from '../components/TransactionRow'
import { Amount, Card, PageHeader, QueryState } from '../components/ui'
import { useAccounts, useTransactions } from '../hooks/queries'
import { spendingByCategory } from '../lib/analytics'
import { formatCents } from '../lib/money'

export function DashboardPage() {
  const accounts = useAccounts()
  const transactions = useTransactions()
  const total = accounts.data?.reduce((sum, a) => sum + a.balance_cents, 0) ?? 0
  const spending = spendingByCategory(transactions.data ?? [])
  const accountNames = new Map(accounts.data?.map((a) => [a.id, a.name]))

  return (
    <>
      <PageHeader title="Resumen" />
      <QueryState isLoading={accounts.isLoading} error={accounts.error} />

      {accounts.data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-3 bg-[linear-gradient(135deg,#1d1630,#0e0c15_60%)]">
            <p className="text-sm text-zinc-400">Saldo total</p>
            <Amount cents={total} className="mt-1 block text-4xl font-semibold" />
          </Card>
          {accounts.data.map((account) => (
            <Card key={account.id}>
              <p className="text-sm text-zinc-400">{account.name}</p>
              <Amount cents={account.balance_cents} className="mt-1 block text-xl" />
            </Card>
          ))}
          <Link
            to="/transferir"
            className="flex items-center justify-center rounded-2xl border border-dashed border-obsidian-700 p-5 text-sm text-zinc-400 transition hover:border-sheen hover:text-zinc-100"
          >
            Nueva transferencia →
          </Link>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="font-medium">Gastos de este mes</h2>
          {spending.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Sin gastos este mes.</p>
          ) : (
            <div className="mt-4 h-64" role="img" aria-label="Gráfica de gastos por categoría este mes">
              <ResponsiveContainer>
                <BarChart data={spending} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={100} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#17141f' }}
                    contentStyle={{ background: '#0e0c15', border: '1px solid #262132', borderRadius: 8 }}
                    formatter={(value) => [formatCents(Number(value)), 'Gasto']}
                  />
                  <Bar dataKey="cents" fill="#a78bfa" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Últimos movimientos</h2>
            <Link to="/movimientos" className="text-sm text-sheen hover:underline">Ver todos</Link>
          </div>
          <QueryState isLoading={transactions.isLoading} error={transactions.error} />
          <ul className="mt-2 divide-y divide-obsidian-700">
            {transactions.data?.slice(0, 6).map((t) => (
              <TransactionRow key={t.id} transaction={t} accountName={accountNames.get(t.account_id)} />
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
