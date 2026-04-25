import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAddRow, useDeleteRow, useRows } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import type { LeavePerson, LeaveRow, LeaveShift, LeaveType } from '@/types';

interface FormValues {
  person: LeavePerson;
  shift: LeaveShift;
  date: string;
  type: LeaveType;
  notes: string;
}

export function LeavesTab() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useRows('leaves');
  const add = useAddRow('leaves');
  const del = useDeleteRow('leaves');

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
      <div className="p-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">No leaves logged yet.</p>
        )}
        {data && [...data].sort(byDateDesc).map((r) => (
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
    </div>
  );
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
