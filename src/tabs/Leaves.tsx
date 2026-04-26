import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAddRow, useDeleteRow, useRows } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import type { LeavePerson, LeaveRow, LeaveShift, LeaveType } from '@/types';

interface FormValues {
  person: LeavePerson;
  shift: LeaveShift;
  date: string;
  type: LeaveType;
  notes: string;
}

type Filter = 'all' | LeavePerson;
const FILTERS: Filter[] = ['all', 'maid', 'cook'];

export function LeavesTab() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useRows('leaves');
  const add = useAddRow('leaves');
  const del = useDeleteRow('leaves');

  const counts = useMemo(() => {
    const all = data?.length ?? 0;
    const maid = data?.filter((r) => r.person === 'maid').length ?? 0;
    const cook = data?.filter((r) => r.person === 'cook').length ?? 0;
    return { all, maid, cook };
  }, [data]);

  const groups = useMemo<Array<[string, LeaveRow[]]>>(() => {
    if (!data) return [];
    const filtered = filter === 'all' ? data : data.filter((r) => r.person === filter);
    const sorted = [...filtered].sort(byDateDesc);
    const byMonth = new Map<string, LeaveRow[]>();
    for (const r of sorted) {
      const key = String(r.date).slice(0, 7);
      const arr = byMonth.get(key) ?? [];
      arr.push(r);
      byMonth.set(key, arr);
    }
    return [...byMonth.entries()];
  }, [data, filter]);

  return (
    <div>
      <PageHeader
        title="Leaves"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent title="Log a leave">
              <LeaveForm
                onSubmit={async (v) => {
                  await add.mutateAsync(v);
                  setOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-4 space-y-3">
        <div className="flex gap-2 px-1">
          {FILTERS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm capitalize transition-colors',
                filter === v
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent',
              )}
            >
              {v} <span className="opacity-70">{counts[v]}</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="size-8 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">No leaves logged yet.</p>
        )}

        {data && data.length > 0 && groups.length === 0 && (
          <p className="text-sm text-muted-foreground">No {filter} leaves yet.</p>
        )}

        {groups.map(([key, rows]) => (
          <div key={key} className="space-y-2">
            <p className="px-1 text-xs uppercase tracking-wide text-muted-foreground">
              {fmtMonth(key)}
            </p>
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="text-sm">
                  <div className="font-medium capitalize">
                    {r.person}
                    {r.shift && r.shift !== '-' && <span className="text-muted-foreground"> · {r.shift}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(r.date)} · {r.type}
                    {r.notes ? ` · ${r.notes}` : ''}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  onClick={() => del.mutate(r.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtMonth(key: string) {
  try {
    return format(parseISO(key + '-01'), 'MMMM yyyy');
  } catch {
    return key;
  }
}

function byDateDesc(a: LeaveRow, b: LeaveRow) {
  return String(b.date).localeCompare(String(a.date));
}

function fmtDate(s: string) {
  if (!s) return '';
  try {
    return format(parseISO(s), 'EEE, MMM d');
  } catch {
    return String(s).slice(0, 10);
  }
}

function LeaveForm({ onSubmit }: { onSubmit: (v: FormValues) => Promise<void> }) {
  const { register, handleSubmit, watch, formState } = useForm<FormValues>({
    defaultValues: {
      person: 'maid',
      shift: '-',
      date: new Date().toISOString().slice(0, 10),
      type: 'leave',
      notes: '',
    },
  });
  const person = watch('person');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3"
    >
      <div>
        <Label>Person</Label>
        <NativeSelect {...register('person')}>
          <option value="maid">Maid</option>
          <option value="cook">Cook</option>
        </NativeSelect>
      </div>

      {person === 'cook' && (
        <div>
          <Label>Shift</Label>
          <NativeSelect {...register('shift')}>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="both">Both</option>
          </NativeSelect>
        </div>
      )}

      <div>
        <Label>Date</Label>
        <Input type="date" {...register('date', { required: true })} />
      </div>

      <div>
        <Label>Type</Label>
        <NativeSelect {...register('type')}>
          <option value="leave">Leave (full)</option>
          <option value="partial">Partial</option>
          <option value="present">Present (correction)</option>
        </NativeSelect>
      </div>

      <div>
        <Label>Notes</Label>
        <Input placeholder="Optional" {...register('notes')} />
      </div>

      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
