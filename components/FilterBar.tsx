import { PRIORITIES, PRIORITY_COLORS, agencyLabel, titleCase } from "@/lib/format";
import { STATUSES, type Filters } from "@/lib/filters";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type GeoState = "idle" | "locating" | "error";

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
  showClear: boolean;
  districts: string[];
  agencies: string[];
  nearMe: boolean;
  nearMeLabel: string;
  geoState: GeoState;
  onToggleNearMe: () => void;
}

// `dark:` variants are required to beat the outline Button's own dark:bg-input/30
const ACTIVE = "border-zinc-400 bg-zinc-700 text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-700";
const INACTIVE = "border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 dark:bg-transparent dark:hover:bg-zinc-900";

function chip(active: boolean) {
  return `rounded-full text-xs ${active ? ACTIVE : INACTIVE}`;
}

function withCurrent(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

// Radix Select rejects empty-string item values, so "All" gets an explicit sentinel
const ALL = "__all__";

interface FilterSelectProps {
  label: string;
  allLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, allLabel, value, options, onChange }: FilterSelectProps) {
  const items = [{ value: ALL, label: allLabel }, ...options];
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        data-active={value ? "true" : undefined}
        className={`rounded-full data-[size=sm]:rounded-full px-3 text-xs ${
          value
            ? ACTIVE
            : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        }`}
      >
        <SelectValue>{items.find((i) => i.value === (value || ALL))?.label ?? allLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="min-w-44 text-xs">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="text-xs">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function FilterBar(props: Props) {
  const { filters, onChange, districts, agencies, nearMe, geoState } = props;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Priority" className="flex gap-1">
        {PRIORITIES.map((p) => {
          const on = filters.priorities.includes(p);
          return (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={on}
              onClick={() =>
                onChange({ priorities: on ? filters.priorities.filter((x) => x !== p) : [...filters.priorities, p].sort() })
              }
              className={chip(on)}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
              Priority {p}
            </Button>
          );
        })}
      </div>

      <ButtonGroup
        aria-label="Status"
        className="[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-full!"
      >
        {STATUSES.map((s, i) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={filters.status === s}
            onClick={() => onChange({ status: s })}
            className={`text-xs capitalize ${i === 0 ? "rounded-l-full!" : ""} ${
              i === STATUSES.length - 1 ? "rounded-r-full!" : ""
            } ${filters.status === s ? ACTIVE : INACTIVE}`}
          >
            {s}
          </Button>
        ))}
      </ButtonGroup>

      <FilterSelect
        label="Police district"
        allLabel="All districts"
        value={filters.district}
        options={withCurrent(districts, filters.district).map((d) => ({ value: d, label: titleCase(d) }))}
        onChange={(district) => onChange({ district })}
      />

      <FilterSelect
        label="Agency"
        allLabel="All agencies"
        value={filters.agency}
        options={withCurrent(agencies, filters.agency).map((a) => ({ value: a, label: agencyLabel(a) }))}
        onChange={(agency) => onChange({ agency })}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={nearMe}
        onClick={props.onToggleNearMe}
        className={chip(nearMe)}
      >
        📍 {geoState === "locating" ? "Locating…" : nearMe ? `${props.nearMeLabel} ×` : "Near me"}
      </Button>
      {geoState === "error" && <span className="text-xs text-red-400">Couldn&apos;t get your location</span>}

      {props.showClear && (
        <Button type="button" variant="link" size="sm" onClick={props.onClear} className="text-xs text-zinc-400 hover:text-white">
          Clear filters
        </Button>
      )}
    </div>
  );
}
