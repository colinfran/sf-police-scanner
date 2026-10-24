import { callType } from "./format";
import type { Call } from "./types";

export interface CallCategory {
  /** Stable id for the scenario group */
  id: string;
  /** Human-readable scenario name, used for tooltips and screen readers */
  label: string;
  /** Emoji shown in the UI */
  icon: string;
  /** Accent color (hex) for the scenario, usable in list, detail and map */
  color: string;
}

const CATEGORIES = {
  gunfire: { id: "gunfire", label: "Gunfire / weapon", icon: "🔫", color: "#ef4444" },
  knife: { id: "knife", label: "Knife / stabbing", icon: "🔪", color: "#ef4444" },
  robbery: { id: "robbery", label: "Robbery / violent crime", icon: "🚨", color: "#ef4444" },
  fight: { id: "fight", label: "Fight / assault", icon: "🥊", color: "#f97316" },
  threats: { id: "threats", label: "Threats / harassment", icon: "⚠️", color: "#f97316" },
  burglary: { id: "burglary", label: "Burglary / break-in", icon: "🏠", color: "#f59e0b" },
  theft: { id: "theft", label: "Theft / stolen property", icon: "💰", color: "#f59e0b" },
  vandalism: { id: "vandalism", label: "Vandalism / graffiti", icon: "🎨", color: "#eab308" },
  accident: { id: "accident", label: "Vehicle accident", icon: "💥", color: "#f59e0b" },
  traffic: { id: "traffic", label: "Traffic", icon: "🚗", color: "#38bdf8" },
  fire: { id: "fire", label: "Fire", icon: "🔥", color: "#f97316" },
  medical: { id: "medical", label: "Medical / injury", icon: "🩺", color: "#f472b6" },
  mentalHealth: { id: "mentalHealth", label: "Mental health / welfare", icon: "🧠", color: "#a78bfa" },
  missing: { id: "missing", label: "Missing person", icon: "🔎", color: "#14b8a6" },
  welfare: { id: "welfare", label: "Well-being check", icon: "🫶", color: "#2dd4bf" },
  alarm: { id: "alarm", label: "Alarm", icon: "🔔", color: "#eab308" },
  disturbance: { id: "disturbance", label: "Disturbance / noise", icon: "🔊", color: "#fb923c" },
  suspicious: { id: "suspicious", label: "Suspicious activity", icon: "🕵️", color: "#818cf8" },
  drugs: { id: "drugs", label: "Drugs / vice", icon: "💊", color: "#c084fc" },
  protest: { id: "protest", label: "Demonstration", icon: "📣", color: "#fb923c" },
  police: { id: "police", label: "Police activity", icon: "👮", color: "#71717a" },
  other: { id: "other", label: "Other", icon: "📟", color: "#71717a" },
} satisfies Record<string, CallCategory>;

// Ordered most-specific/severe first; the first matching pattern wins.
const RULES: [RegExp, CallCategory][] = [
  [/GUN|SHOT|SHOOTING|HOLDUP|HOLD UP|ARMED/, CATEGORIES.gunfire],
  [/KNIFE|STAB|W\/WEAPON|WEAPONS/, CATEGORIES.knife],
  [/ROBBERY|STRONGARM|HOMICIDE|SEXUAL ASSAULT|KIDNAP|CARJACK/, CATEGORIES.robbery],
  [/FIGHT|ASSAULT|BATTERY|ADW|RESISTING/, CATEGORIES.fight],
  [/THREAT|HARASS|STALK/, CATEGORIES.threats],
  [/BURGLAR|BREAKING IN|PROWLER|PERSON BREAKING/, CATEGORIES.burglary],
  [/THEFT|STOLEN|AUTO BOOST|STRIP|SHOPLIFT|PICKPOCKET|PURSE|PROPERTY/, CATEGORIES.theft],
  [/VANDAL|GRAFFITI/, CATEGORIES.vandalism],
  [/ACCIDENT|COLLISION|H&R/, CATEGORIES.accident],
  [/ALARM|DOORBELL|RINGING|PANIC/, CATEGORIES.alarm],
  [/TRAF|TRAFFIC|VIOLATION|HAZARD|TOW|DRUNK DRIVER|DUI|RECKLESS/, CATEGORIES.traffic],
  [/FIRE/, CATEGORIES.fire],
  [/SUICIDE|MENTALLY|PSYCH|SENILE|INTOXICATED|ROLLING DRUNK|416|5150|PERSON DOWN|PERSON SCREAMING/, CATEGORIES.mentalHealth],
  [/INJURY|AIDED|MEDICAL|OVERDOSE/, CATEGORIES.medical],
  [/MISSING/, CATEGORIES.missing],
  [/WELL BEING|WELFARE|STANDBY|CITIZEN STANDBY/, CATEGORIES.welfare],
  [/DEMO|PROTEST|ENGAGEMENT/, CATEGORIES.protest],
  [/NOISE|NUISANCE|DISTURBANCE|PARTY|JUVENILE/, CATEGORIES.disturbance],
  [/SUSPICIOUS|SURVEILLANCE|TRESPASS|SIT\/LIE|HOMELESS|LOITER/, CATEGORIES.suspicious],
  [/NARCOTIC|DRUG|PROSTITUT|SOLICIT|INDECENT|LEWD/, CATEGORIES.drugs],
  [/MEET W|PASSING CALL|PRISONER|ARREST|NOTIFICATION|CITE|WANTED|STANDBY|CITY EMPLOYEE|OFFICER|MONEY|SURVEIL|MUNI/, CATEGORIES.police],
];

/** Classifies a call into a scenario with an icon, label and accent color. */
export function callCategory(call: Call): CallCategory {
  const type = callType(call).toUpperCase();
  for (const [pattern, category] of RULES) {
    if (pattern.test(type)) return category;
  }
  return CATEGORIES.other;
}
