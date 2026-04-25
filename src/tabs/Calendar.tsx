import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAddRow, useDeleteRow, useRows } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import type { CalendarRow } from '@/types';

interface FormValues {
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  location: string;
  notes: string;
}

export function CalendarTab() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useRows('calendar');
  const add = useAddRow('calendar');
  const del = useDeleteRow('calendar');

  const sorted = [...(data ?? [])].sort((a, b) => String(a.start).localeCompare(String(b.start)));
  const upcoming = sorted.filter((r) => safeDate(r.start) >= startOfToday());
  const past = sorted.filter((r) => safeDate(r.start) < startOfToday()).reverse();

  return (
    <div>
      <PageHeader
        title="Calendar"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent title="New event">
              <EventForm
                onSubmit={async (v) => {
                  await add.mutateAsync({
                    ...v,
                    start: toIso(v.start, v.all_day),
                    end: v.end ? toIso(v.end, v.all_day) : '',
                  });
                  setOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <Section title="Upcoming" rows={upcoming} onDelete={(id) => del.mutate(id)} emptyText="No upcoming events." />
        {past.length > 0 && (
          <Section title="Past" rows={past} onDelete={(id) => del.mutate(id)} emptyText="" muted />
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  onDelete,
  emptyText,
  muted,
}: {
  title: string;
  rows: CalendarRow[];
  onDelete: (id: string) => void;
  emptyText: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      {rows.length === 0 && emptyText && <p className="text-sm text-muted-foreground">{emptyText}</p>}
      {rows.map((r) => (
        <div
          key={r.id}
          className={`flex items-start justify-between rounded-lg border border-border bg-card px-4 py-3 ${
            muted ? 'opacity-70' : ''
          }`}
        >
          <div className="flex-1 text-sm">
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-muted-foreground">
              {fmtRange(r)}{r.location ? ` · ${r.location}` : ''}
            </div>
            {r.notes ? <div className="mt-1 text-xs text-muted-foreground">{r.notes}</div> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(r.id)}>
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function fmtRange(r: CalendarRow) {
  const start = safeDate(r.start);
  if (!start) return '';
  const allDay = r.all_day === true || r.all_day === 'true' || r.all_day === 'TRUE';
  if (allDay) return format(start, 'EEE, MMM d');
  return format(start, 'EEE, MMM d · p');
}

function safeDate(iso: string): Date {
  if (!iso) return new Date(0);
  try {
    const d = parseISO(iso);
    return isNaN(d.getTime()) ? new Date(0) : d;
  } catch {
    return new Date(0);
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(local: string, allDay: boolean): string {
  if (!local) return '';
  if (allDay) return local; // 'YYYY-MM-DD'
  const d = new Date(local);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function EventForm({ onSubmit }: { onSubmit: (v: FormValues) => Promise<void> }) {
  const { register, handleSubmit, watch, formState } = useForm<FormValues>({
    defaultValues: {
      title: '',
      start: '',
      end: '',
      all_day: false,
      location: '',
      notes: '',
    },
  });
  const allDay = watch('all_day');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label>Title</Label>
        <Input {...register('title', { required: true })} autoFocus />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('all_day')} className="size-4 accent-primary" />
        All day
      </label>
      <div>
        <Label>Start</Label>
        <Input type={allDay ? 'date' : 'datetime-local'} {...register('start', { required: true })} />
      </div>
      <div>
        <Label>End (optional)</Label>
        <Input type={allDay ? 'date' : 'datetime-local'} {...register('end')} />
      </div>
      <div>
        <Label>Location</Label>
        <Input {...register('location')} />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea {...register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
