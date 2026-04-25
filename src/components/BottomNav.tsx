import { NavLink } from 'react-router-dom';
import { Home, CalendarCheck, ShoppingBasket, Calendar, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/leaves', label: 'Leaves', icon: CalendarCheck },
  { to: '/shopping', label: 'Shop', icon: ShoppingBasket },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/things', label: 'Notes', icon: NotebookPen },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
