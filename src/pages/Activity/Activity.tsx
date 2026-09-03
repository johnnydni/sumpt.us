import { useMemo } from 'react'
import { useActivity } from '@/hooks/useLedger'
import { groupByDay } from '@/lib/dates'
import { PageHeader } from '@/components/navigation/PageHeader'
import { ActivityRow } from '@/components/activity/ActivityRow'
import { EmptyState } from '@/components/ui/Primitives'

export default function Activity() {
  const items = useActivity()
  const days = useMemo(() => groupByDay(items, (item) => item.at), [items])

  return (
    <div>
      <PageHeader title="Activity" backTo="/overview" />

      {days.length === 0 ? (
        <EmptyState
          title="Nothing has happened yet."
          body="Expenses and settlements appear here in the order they occur."
        />
      ) : (
        <div className="space-y-9">
          {days.map((day) => (
            <section key={day.key}>
              <h2 className="eyebrow mb-1">{day.label}</h2>
              {/* The navy hairline is the timeline — no dots, no rail graphics. */}
              <div className="border-l border-navy/15 pl-4">
                <div className="divide-y divide-line">
                  {day.items.map((item) => (
                    <ActivityRow key={item.id} item={item} showTime={false} />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
