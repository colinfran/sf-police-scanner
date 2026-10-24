"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay } from "@/lib/time";

// Dates are "YYYY-MM-DD" strings in SF time; build local Dates so the calendar never shifts a day
function toDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface Props {
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
}

export default function DatePicker({ value, min, max, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Date"
          className="justify-start gap-2 border-zinc-800 bg-zinc-900 font-normal dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <CalendarIcon className="size-4 text-zinc-400" />
          {formatDay(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          startMonth={toDate(min)}
          endMonth={toDate(max)}
          disabled={{ before: toDate(min), after: toDate(max) }}
          onSelect={(day) => {
            if (!day) return;
            onChange(toValue(day));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
