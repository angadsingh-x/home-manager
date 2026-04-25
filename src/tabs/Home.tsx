import { useMemo } from 'react';
import { addDays, endOfWeek, format, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { useHome, useRows } from '@/api/hooks';
import { useAuth } from '@/auth/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { CalendarRow, LeaveRow } from '@/types';

export function HomeTab() {
  const { name, signOut } = useAuth();
  const { data, isLoading } = useHome();

  return (
    <div>
      <PageHeader
        title={name ? `Hi, ${name.split(' ')[0]}` : 'Home'}
        action={
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        {isLoading || !data ? (
          <>
            <DayCardSkeleton />
            <DayCardSkeleton />
            <ThisWeekCardSkeleton />
            <Card>
              <CardHeader><Skeleton className="h-4 w-20" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-40" /></CardContent>
            </Card>
          </>
        ) : (
          <>
            <DayCard label="Today" leaves={data.today.leaves} events={data.today.events} />
            <DayCard label="Tomorrow" leaves={data.tomorrow.leaves} events={data.tomorrow.events} />
            <ThisWeekCard />
            <Card>
              <CardHeader>
                <CardTitle>Shopping</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {data.today.shoppingOpenCount === 0
                    ? 'Nothing on the list.'
                    : `${data.today.shoppingOpenCount} open item${data.today.shoppingOpenCount === 1 ? '' : 's'}.`}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function DayCard({
  label,
  leaves,
  events,
}: {
  label: string;
  leaves: LeaveRow[];
  events: CalendarRow[];
}) {
  const empty = leaves.length === 0 && events.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {empty && <p className="text-sm text-muted-foreground">Nothing planned.</p>}
        {leaves.map((l) => (
          <div key={l.id} className="text-sm">
            <span className="font-medium capitalize">{l.person}</span>
            {l.shift && l.shift !== '-' ? <span className="text-muted-foreground"> · {l.shift}</span> : null}
            <span className="text-muted-foreground"> · {l.type}</span>
            {l.notes ? <span className="text-muted-foreground"> · {l.notes}</span> : null}
          </div>
        ))}
        {events.map((e) => (
          <div key={e.id} className="text-sm">
            <span className="font-medium">{e.title}</span>
            {!isAllDay(e) && e.start ? (
              <span className="text-muted-foreground"> · {safeTime(e.start)}</span>
            ) : null}
            {e.location ? <span className="text-muted-foreground"> · {e.location}</span> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ThisWeekCard() {
  const leavesQ = useRows('leaves');
  const eventsQ = useRows('calendar');
  const loading = leavesQ.isLoading || eventsQ.isLoading;

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    const start = addDays(today, 2);
    const end = endOfWeek(today, { weekStartsOn: 1 });
    if (start > end) return [];

    const within = (iso: string): boolean => {
      if (!iso) return false;
      const d = parseISO(iso);
      if (isNaN(d.getTime())) return false;
      return isWithinInterval(d, { start, end });
    };

    const byDate = new Map<string, { leaves: LeaveRow[]; events: CalendarRow[] }>();
    for (const l of leavesQ.data ?? []) {
      if (!within(l.date)) continue;
      const key = String(l.date).slice(0, 10);
      const e = byDate.get(key) ?? { leaves: [], events: [] };
      e.leaves.push(l);
      byDate.set(key, e);
    }
    for (const ev of eventsQ.data ?? []) {
      if (!within(ev.start)) continue;
      const key = String(ev.start).slice(0, 10);
      const e = byDate.get(key) ?? { leaves: [], events: [] };
      e.events.push(ev);
      byDate.set(key, e);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [leavesQ.data, eventsQ.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>This week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </>
        ) : days.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing else this week.</p>
        ) : (
          days.map(([key, { leaves, events }]) => (
            <div key={key} className="text-sm">
              <div className="font-medium">{format(parseISO(key), 'EEE, MMM d')}</div>
              {leaves.map((l) => (
                <div key={l.id} className="text-muted-foreground">
                  <span className="capitalize">{l.person}</span>
                  {l.shift && l.shift !== '-' ? ` · ${l.shift}` : ''} · {l.type}
                  {l.notes ? ` · ${l.notes}` : ''}
                </div>
              ))}
              {events.map((ev) => (
                <div key={ev.id} className="text-muted-foreground">
                  {ev.title}
                  {!isAllDay(ev) && ev.start ? ` · ${safeTime(ev.start)}` : ''}
                  {ev.location ? ` · ${ev.location}` : ''}
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DayCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function ThisWeekCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/5" />
      </CardContent>
    </Card>
  );
}

function isAllDay(e: CalendarRow): boolean {
  return e.all_day === true || e.all_day === 'true' || e.all_day === 'TRUE';
}

function safeTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : format(d, 'p');
}
