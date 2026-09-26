const CHILD_POPOVER_SELECTOR = [
    ".canvas-settings-popover",
    ".canvas-camera-control-popover",
    ".canvas-model-picker-content",
].join(",");

let installed = false;

export function installCanvasPopoverWheelLock() {
    if (installed || typeof window === "undefined") return;
    installed = true;

    window.addEventListener(
        "wheel",
        (event) => {
            const popovers = Array.from(document.querySelectorAll<HTMLElement>(CHILD_POPOVER_SELECTOR));
            if (!popovers.length) return;

            const target = event.target;
            if (target instanceof Node && popovers.some((popover) => popover.contains(target))) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
        },
        { capture: true, passive: false },
    );
}
