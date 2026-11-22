"use client";

import { OptionGroup, SegmentedControl } from "@/components/pos/option-controls";
import { formatCafeDayShort, isCafeDay } from "@/lib/cafe-time";
import { DATE_RANGES, dayLabel, filterDays, type DateChoice } from "@/lib/date-range";

type DatesFieldProps = {
  /** The group's title, "Dates" unless the popup is already called that. */
  title?: string;
  /** The radio group's name, unique on the page. */
  name: string;
  /** The dates picked so far (only range, from and to are read). */
  value: DateChoice;
  onChange: (dates: DateChoice) => void;
  /** The day the page shows: the first choice ("Today", or "Nov 15"). */
  day: string;
  today: string;
};

// The Dates part of a popup, shared by the Orders Filters popup and the
// Summary Dates popup: the day shown, 7 days, 30 days, This month or Custom.
// Custom adds From and To. The current dates show at the right of the title.
export function DatesField({ title = "Dates", name, value, onChange, day, today }: DatesFieldProps) {
  const days = filterDays(value, today, day);
  // The first choice is the day shown: "Today", or its date ("Nov 15").
  const options = DATE_RANGES.map((option) =>
    option.value === "day" ? { ...option, label: dayLabel(day, today) } : option,
  );

  return (
    <div>
      <OptionGroup
        title={title}
        value={
          days.from === days.to
            ? formatCafeDayShort(days.from)
            : `${formatCafeDayShort(days.from)} – ${formatCafeDayShort(days.to)}`
        }
      >
        <SegmentedControl
          name={name}
          value={value.range}
          options={options}
          onChange={(range) =>
            // Custom starts from the dates already showing, so nothing jumps.
            onChange(range === "custom" ? { range, ...days } : { range, from: null, to: null })
          }
        />
      </OptionGroup>
      {value.range === "custom" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <DateField
            label="From"
            value={days.from}
            max={today}
            // Moving From past To moves To along, so the range stays in order.
            onChange={(from) =>
              onChange({ range: "custom", from, to: from > days.to ? from : days.to })
            }
          />
          <DateField
            label="To"
            value={days.to}
            max={today}
            onChange={(to) =>
              onChange({ range: "custom", to, from: to < days.from ? to : days.from })
            }
          />
        </div>
      )}
    </div>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  max: string;
  onChange: (day: string) => void;
};

// A day for a custom range. As in the day picker, an invisible date field
// covers the label, so a tap opens the iPad's calendar; showPicker() does the
// same on desktop browsers.
function DateField({ label, value, max, onChange }: DateFieldProps) {
  return (
    <label className="relative flex h-13 cursor-pointer flex-col justify-center rounded-2xl bg-white px-4 ring-1 ring-latte-300 transition-colors duration-200 select-none hover:bg-latte-100 has-focus-visible:ring-2 has-focus-visible:ring-espresso-700">
      <span className="text-xs font-medium text-roast-500">{label}</span>
      <span className="font-semibold text-espresso-950 tabular-nums">
        {formatCafeDayShort(value)}, {value.slice(0, 4)}
      </span>
      <input
        type="date"
        aria-label={`${label} date`}
        value={value}
        max={max}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker();
          } catch {
            // Not supported here; the browser's own tap handling still works.
          }
        }}
        // Clearing the field gives "", which is ignored.
        onChange={(event) => {
          if (isCafeDay(event.target.value) && event.target.value <= max) onChange(event.target.value);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
