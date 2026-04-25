import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAddRow, useDeleteRow, useRows, useUpdateRow } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import type { ShoppingRow } from '@/types';

export function ShoppingTab() {
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const { data, isLoading } = useRows('shopping');
  const add = useAddRow('shopping');
  const update = useUpdateRow('shopping');
  const del = useDeleteRow('shopping');

  const open: ShoppingRow[] = (data ?? []).filter((r) => r.status !== 'done');
  const done: ShoppingRow[] = (data ?? []).filter((r) => r.status === 'done');

  return (
    <div>
      <PageHeader title="Shopping" />
      <form
        className="flex gap-2 p-4 pb-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!item.trim()) return;
          await add.mutateAsync({ item: item.trim(), qty: qty.trim(), status: 'open' });
          setItem('');
          setQty('');
        }}
      >
        <Input
          placeholder="Add item…"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          autoFocus
          className="flex-1"
        />
        <Input
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-20"
        />
        <Button type="submit">Add</Button>
      </form>

      <div className="p-4 pt-2 space-y-1">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && open.length === 0 && done.length === 0 && (
          <p className="text-sm text-muted-foreground">List is empty.</p>
        )}

        {open.map((r) => (
          <Row
            key={r.id}
            row={r}
            onToggle={() => update.mutate({ id: r.id, data: { status: 'done' } })}
            onDelete={() => del.mutate(r.id)}
          />
        ))}

        {done.length > 0 && (
          <div className="pt-3">
            <p className="px-1 pb-1 text-xs uppercase tracking-wide text-muted-foreground">Done</p>
            {done.map((r) => (
              <Row
                key={r.id}
                row={r}
                done
                onToggle={() => update.mutate({ id: r.id, data: { status: 'open' } })}
                onDelete={() => del.mutate(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  row,
  done,
  onToggle,
  onDelete,
}: {
  row: ShoppingRow;
  done?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/40">
      <input
        type="checkbox"
        checked={!!done}
        onChange={onToggle}
        className="size-5 accent-primary"
      />
      <div className="flex-1 text-sm">
        <span className={done ? 'text-muted-foreground line-through' : ''}>{row.item}</span>
        {row.qty ? <span className="ml-2 text-xs text-muted-foreground">{row.qty}</span> : null}
      </div>
      <Button variant="ghost" size="icon" aria-label="Delete" onClick={onDelete}>
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
