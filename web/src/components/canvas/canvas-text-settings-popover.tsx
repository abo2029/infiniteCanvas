import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Settings2 } from "lucide-react";
import { Button } from "antd";
import { useTranslation } from "react-i18next";

import { reasoningEffortLabel, TextSettingsPanel } from "@/components/text-settings-panel";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { AiConfig, ReasoningEffort } from "@/stores/use-config-store";

type CanvasTextSettingsPopoverProps = {
    config: AiConfig;
    onConfigChange: (key: "reasoningEffort", value: ReasoningEffort) => void;
    count?: number;
    onCountChange?: (count: number) => void;
    buttonClassName?: string;
    placement?: "topLeft" | "top" | "topRight" | "bottomLeft" | "bottom" | "bottomRight";
};

export function CanvasTextSettingsPopover({ config, onConfigChange, count, onCountChange, buttonClassName, placement = "top" }: CanvasTextSettingsPopoverProps) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const buttonRef = useRef<HTMLSpanElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!open) return;
        let frame = 0;
        const syncPosition = () => setButtonRect(buttonRef.current?.getBoundingClientRect() || null);
        const scheduleSync = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => { frame = 0; syncPosition(); });
        };
        const closeOnOutsidePointer = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node) || buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        syncPosition();
        window.addEventListener("resize", scheduleSync);
        window.addEventListener("scroll", scheduleSync, true);
        window.addEventListener("wheel", scheduleSync, true);
        window.addEventListener("pointerdown", closeOnOutsidePointer, true);
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", scheduleSync);
            window.removeEventListener("scroll", scheduleSync, true);
            window.removeEventListener("wheel", scheduleSync, true);
            window.removeEventListener("pointerdown", closeOnOutsidePointer, true);
        };
    }, [open]);

    const panel = open && buttonRect ? <TextSettingsPortal buttonRect={buttonRect} panelRef={panelRef} placement={placement} theme={theme} config={config} count={count} onConfigChange={onConfigChange} onCountChange={onCountChange} /> : null;

    return (
        <>
            <span ref={buttonRef} className="inline-flex min-w-0">
                <Button size="small" type="text" className={buttonClassName || "!h-8 !max-w-[170px] !justify-start !rounded-full !px-2.5"} style={{ background: theme.node.fill, color: theme.node.text }} icon={<Settings2 className="size-3.5" />} onClick={() => setOpen((current) => !current)}>
                    <span className="truncate">{t("canvas.controls.reasoning")} · {reasoningEffortLabel(config.reasoningEffort)}{onCountChange ? ` · ${t("canvas.controls.generations", { count })}` : ""}</span>
                </Button>
            </span>
            {panel}
        </>
    );
}

function TextSettingsPortal({ buttonRect, panelRef, placement, theme, config, count, onConfigChange, onCountChange }: {
    buttonRect: DOMRect;
    panelRef: RefObject<HTMLDivElement | null>;
    placement: CanvasTextSettingsPopoverProps["placement"];
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    config: AiConfig;
    count?: number;
    onConfigChange: CanvasTextSettingsPopoverProps["onConfigChange"];
    onCountChange?: (count: number) => void;
}) {
    const { t } = useTranslation();
    const width = 356;
    const gap = 8;
    const margin = 12;
    const left = buttonRect.left + buttonRect.width / 2 - width / 2;
    const topPlacement = placement?.startsWith("top") ?? true;
    const style = {
        position: "fixed",
        zIndex: 1200,
        width,
        left: Math.max(margin, Math.min(window.innerWidth - width - margin, left)),
        ...(topPlacement ? { bottom: window.innerHeight - buttonRect.top + gap } : { top: buttonRect.bottom + gap }),
        background: theme.node.panel,
        border: "1px solid " + theme.node.stroke,
        borderRadius: 18,
        boxShadow: "0 20px 64px rgba(0, 0, 0, 0.32)",
        padding: 18,
        overscrollBehavior: "contain",
        color: theme.node.text,
    } as const;

    const safeCount = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(count)) || 1)));

    return createPortal(
        <div ref={panelRef} className="canvas-settings-popover canvas-image-settings-popover" style={style} onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
            <TextSettingsPanel config={config} onConfigChange={onConfigChange} theme={theme} />
            {onCountChange ? (
                <div className="mt-4 space-y-2.5">
                    <div className="text-sm font-medium" style={{ color: theme.node.muted }}>{t("settingsPanels.text.count")}</div>
                    <div className="flex h-9 items-center justify-between rounded-xl border px-3 text-sm" style={{ background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text }}>
                        <span>{safeCount}</span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                className="grid size-7 place-items-center rounded-lg transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                                disabled={safeCount <= 1}
                                aria-label="减少生成数量"
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => onCountChange(Math.max(1, safeCount - 1))}
                            >
                                <Minus className="size-3.5" />
                            </button>
                            <button
                                type="button"
                                className="grid size-7 place-items-center rounded-lg transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                                disabled={safeCount >= 15}
                                aria-label="增加生成数量"
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => onCountChange(Math.min(15, safeCount + 1))}
                            >
                                <Plus className="size-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>,
        document.body,
    );
}
