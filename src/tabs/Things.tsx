import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { useAddRow, useDeleteRow, useRows, useUpdateRow } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import type { ThingRow } from '@/types';

interface FormValues {
  label: string;
  value: string;
  category: string;
}

export function ThingsTab() {
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<ThingRow | null>(null);
  const { data, isLoading } = useRows('things');
  const add = useAddRow('things');
  const update = useUpdateRow('things');
  const del = useDeleteRow('things');

  const grouped = useMemo(() => {
    const map = new Map<string, ThingRow[]>();
    for (const r of data ?? []) {
      const key = r.category || 'General';
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Things to remember"
        action={
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent title="New note">
              <ThingForm
                onSubmit={async (v) => {
                  await add.mutateAsync(v);
                  setOpenAdd(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-4 space-y-4">
        {isLoading &&
          [0, 1].map((cat) => (
            <div key={cat} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ))}
        {!isLoading && grouped.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here yet. Add gas/bill numbers, Wi-Fi password, etc.</p>
        )}
        {grouped.map(([cat, rows]) => (
          <div key={cat} className="space-y-2">
            <p className="px-1 text-xs uppercase tracking-wide text-muted-foreground">{cat}</p>
            {rows.map((r) => (
              <button
                key={r.id}
                className="flex w-full items-start justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-left"
                onClick={() => setEditing(r)}
              >
                <div className="flex-1 text-sm">
                  <div className="font-medium">{r.label}</div>
                  <div className="break-all text-muted-foreground">{r.value}</div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title="Edit note">
            <ThingForm
              defaultValues={editing}
              onSubmit={async (v) => {
                await update.mutateAsync({ id: editing.id, data: v });
                setEditing(null);
              }}
              onDelete={async () => {
                await del.mutateAsync(editing.id);
                setEditing(null);
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function ThingForm({
  defaultValues,
  onSubmit,
  onDelete,
}: {
  defaultValues?: Partial<ThingRow>;
  onSubmit: (v: FormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      label: defaultValues?.label ?? '',
      value: defaultValues?.value ?? '',
      category: defaultValues?.category ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label>Label</Label>
        <Input placeholder="e.g. Gas connection" {...register('label', { required: true })} autoFocus />
      </div>
      <div>
        <Label>Value</Label>
        <Textarea placeholder="The thing to remember" {...register('value', { required: true })} />
      </div>
      <div>
        <Label>Category</Label>
        <Input placeholder="Bills / Wi-Fi / Insurance…" {...register('category')} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Saving…' : 'Save'}
        </Button>
        {onDelete && (
          <Button type="button" variant="destructive" size="icon" onClick={onDelete} aria-label="Delete">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
