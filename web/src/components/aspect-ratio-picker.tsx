import { useEffect, useMemo, useRef, useState } from "react";

import type { CanvasTheme } from "@/lib/canvas-theme";

type RatioOption = {
    value: string;
    width: number;
    height: number;
};

type AspectRatioPickerProps = {
    options: readonly RatioOption[];
    value: string;
    onChange: (value: string) => void;
    theme: CanvasTheme;
    storageKey: string;
    fallbackValues: readonly string[];
    autoLabel: string;
};

type UsageMap = Record<string, number>;

const ROLL_MS = 420;

export function AspectRatioPicker({ options, value, onChange, theme, storageKey, fallbackValues, autoLabel }: AspectRatioPickerProps) {
    const normalizedValue = options.some((item) => item.value === value) ? value : "auto";
    const [expanded, setExpanded] = useState(false);
    const [usage, setUsage] = useState<UsageMap>(() => readUsage(storageKey, options));
    const [displaySlots, setDisplaySlots] = useState<string[]>(() => buildSlots(normalizedValue, readUsage(storageKey, options), options, fallbackValues));
    const [previousSlots, setPreviousSlots] = useState<string[] | null>(null);
    const [rolling, setRolling] = useState(false);
    const timerRef = useRef<number | null>(null);

    const selected = normalizedValue;
    const targetSlots = useMemo(() => buildSlots(selected, usage, options, fallbackValues), [fallbackValues, options, selected, usage]);

    useEffect(() => {
        if (rolling) return;
        setDisplaySlots(targetSlots);
    }, [rolling, targetSlots]);

    useEffect(() => () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
    }, []);

    const recordUsage = (nextValue: string) => {
        if (nextValue === "auto") return usage;
        const nextUsage = { ...usage, [nextValue]: (usage[nextValue] || 0) + 1 };
        setUsage(nextUsage);
        writeUsage(storageKey, nextUsage);
        return nextUsage;
    };

    const rollTo = (nextValue: string) => {
        const nextUsage = recordUsage(nextValue);
        const nextSlots = buildSlots(nextValue, nextUsage, options, fallbackValues);
        setPreviousSlots(displaySlots);
        setDisplaySlots(nextSlots);
        setRolling(true);
        onChange(nextValue);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            setPreviousSlots(null);
            setRolling(false);
        }, ROLL_MS);
    };

    const selectExpanded = (nextValue: string) => {
        setExpanded(false);
        window.setTimeout(() => rollTo(nextValue), 220);
    };

    return (
        <div className="overflow-visible">
            <div className={`grid grid-cols-4 gap-2.5 transition-all duration-200 ${expanded ? "pointer-events-none max-h-0 -translate-y-1 overflow-hidden opacity-0" : "max-h-20 translate-y-0 overflow-visible opacity-100"}`}>
                {displaySlots.map((slotValue, index) => {
                    const current = options.find((item) => item.value === slotValue) || options[0];
                    const previousValue = previousSlots?.[index];
                    const previous = previousValue ? options.find((item) => item.value === previousValue) : undefined;
                    const changing = Boolean(rolling && previous && previous.value !== current.value);
                    return (
                        <button
                            key={`slot-${index}`}
                            type="button"
                            className="relative h-[72px] overflow-hidden rounded-xl border bg-transparent transition hover:opacity-80"
                            style={{ borderColor: index === 0 ? theme.node.text : theme.node.stroke, color: theme.node.text }}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={() => index > 0 && rollTo(current.value)}
                        >
                            {changing && previous ? <RatioContent option={previous} label={previous.value === "auto" ? autoLabel : previous.value} className="animate-[ratio-slot-out_340ms_cubic-bezier(.22,.9,.26,1)_forwards]" /> : null}
                            <RatioContent option={current} label={current.value === "auto" ? autoLabel : current.value} className={changing ? "animate-[ratio-slot-in_420ms_cubic-bezier(.16,1,.3,1)_forwards]" : ""} />
                        </button>
                    );
                })}
                <button
                    type="button"
                    className="grid h-[72px] place-items-center rounded-xl border bg-transparent text-2xl leading-none transition hover:opacity-80"
                    style={{ borderColor: theme.node.stroke, color: theme.node.text }}
                    aria-label="More aspect ratios"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => setExpanded(true)}
                >
                    ⋯
                </button>
            </div>

            <div className={`grid grid-cols-4 gap-2.5 overflow-hidden transition-all duration-300 ${expanded ? "max-h-[320px] translate-y-0 opacity-100" : "pointer-events-none max-h-0 -translate-y-1 opacity-0"}`}>
                {options.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        className="flex h-[72px] flex-col items-center justify-end gap-1.5 rounded-xl border bg-transparent px-2 pb-2 pt-1 text-sm transition hover:opacity-80"
                        style={{ borderColor: selected === item.value ? theme.node.text : theme.node.stroke, color: theme.node.text }}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => selectExpanded(item.value)}
                    >
                        <span className="grid min-h-7 flex-1 place-items-center">
                            <AspectIcon width={item.width} height={item.height} color={theme.node.text} />
                        </span>
                        <span className="shrink-0 leading-4">{item.value === "auto" ? autoLabel : item.value}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function RatioContent({ option, label, className = "" }: { option: RatioOption; label: string; className?: string }) {
    return (
        <span className={`absolute inset-0 flex flex-col items-center justify-end gap-1.5 px-2 pb-2 pt-1 text-sm ${className}`}>
            <span className="grid min-h-7 flex-1 place-items-center">
                <AspectIcon width={option.width} height={option.height} color="currentColor" />
            </span>
            <span className="shrink-0 leading-4">{label}</span>
        </span>
    );
}

function AspectIcon({ width, height, color }: { width: number; height: number; color: string }) {
    if (!width || !height) return <span className="text-[11px] opacity-70">AUTO</span>;
    const ratio = width / height;
    const boxWidth = ratio >= 1 ? 24 : Math.max(10, 24 * ratio);
    const boxHeight = ratio >= 1 ? Math.max(10, 24 / ratio) : 24;
    return <span className="border-2" style={{ width: boxWidth, height: boxHeight, borderColor: color }} />;
}

function buildSlots(selected: string, usage: UsageMap, options: readonly RatioOption[], fallbackValues: readonly string[]) {
    const optionIndex = new Map(options.map((item, index) => [item.value, index]));
    const fallbackIndex = new Map(fallbackValues.map((item, index) => [item, index]));
    const ranked = options
        .map((item) => item.value)
        .filter((item) => item !== "auto" && item !== selected)
        .sort((a, b) => {
            const usageDiff = (usage[b] || 0) - (usage[a] || 0);
            if (usageDiff) return usageDiff;
            const fallbackDiff = (fallbackIndex.get(a) ?? 999) - (fallbackIndex.get(b) ?? 999);
            if (fallbackDiff) return fallbackDiff;
            return (optionIndex.get(a) ?? 999) - (optionIndex.get(b) ?? 999);
        });
    return [selected, ...ranked.slice(0, 2)];
}

function readUsage(storageKey: string, options: readonly RatioOption[]) {
    const empty = Object.fromEntries(options.filter((item) => item.value !== "auto").map((item) => [item.value, 0]));
    if (typeof window === "undefined") return empty;
    try {
        const stored = JSON.parse(window.localStorage.getItem(storageKey) || "{}") as UsageMap;
        return { ...empty, ...stored };
    } catch {
        return empty;
    }
}

function writeUsage(storageKey: string, usage: UsageMap) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(usage));
    } catch {
        // Local storage may be unavailable in privacy modes; usage ranking can remain session-only.
    }
}
