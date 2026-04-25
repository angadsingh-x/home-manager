export type TabName = 'leaves' | 'shopping' | 'calendar' | 'things';

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export type LeaveType = 'leave' | 'partial' | 'present';
export type LeavePerson = 'maid' | 'cook';
export type LeaveShift = 'morning' | 'evening' | 'both' | '-';

export interface LeaveRow {
  id: string;
  person: LeavePerson;
  shift: LeaveShift;
  date: string;
  type: LeaveType;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface ShoppingRow {
  id: string;
  item: string;
  qty: string;
  status: 'open' | 'done';
  added_by: string;
  added_at: string;
  done_by: string;
  done_at: string;
}

export interface CalendarRow {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean | string;
  location: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface ThingRow {
  id: string;
  label: string;
  value: string;
  category: string;
  updated_by: string;
  updated_at: string;
}

export interface HomeView {
  today: {
    leaves: LeaveRow[];
    events: CalendarRow[];
    shoppingOpenCount: number;
  };
  tomorrow: {
    leaves: LeaveRow[];
    events: CalendarRow[];
  };
  dayAfter: string;
}

export type RowByTab = {
  leaves: LeaveRow;
  shopping: ShoppingRow;
  calendar: CalendarRow;
  things: ThingRow;
};
