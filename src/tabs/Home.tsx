import { useHome } from '@/api/hooks';
import { useAuth } from '@/auth/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
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
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <DayCard label="Today" leaves={data.today.leaves} events={data.today.events} />
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
            <DayCard label="Tomorrow" leaves={data.tomorrow.leaves} events={data.tomorrow.events} />
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
            {!e.all_day && e.start ? (
              <span className="text-muted-foreground"> · {safeTime(e.start)}</span>
            ) : null}
            {e.location ? <span className="text-muted-foreground"> · {e.location}</span> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function safeTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : format(d, 'p');
}
