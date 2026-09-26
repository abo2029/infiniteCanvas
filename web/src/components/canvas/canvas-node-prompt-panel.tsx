import { useEffect, useState } from "react";
import { LoaderCircle, Maximize2, Square } from "lucide-react";
import { Button, Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { ModelPicker } from "@/components/model-picker";
import { defaultConfig, resolveModelForCapability, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasPromptLibrary } from "./canvas-prompt-library";
import { CanvasAudioSettingsPopover, type CanvasAudioSettingKey } from "./canvas-audio-settings-popover";
import { CanvasPromptChipInput } from "./canvas-prompt-chip-input";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";
import { CanvasTextSettingsPopover } from "./canvas-text-settings-popover";
import { CanvasCameraControl } from "./tiger-camera/canvas-camera-control";
import { applyCameraPrompt, parseCameraControlFromPrompt, stripCameraPrompt } from "./tiger-camera/canvas-camera";
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData, type CameraControlOptions } from "@/types/canvas";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { CanvasNodeReferenceBar } from "./canvas-node-reference-bar";

export type CanvasNodeGenerationMode = CanvasGenerationMode;

type CanvasNodePromptPanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    onPromptChange: (nodeId: string, prompt: string) => void;
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => void;
    onGenerate: (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string) => void;
    onStop: (nodeId: string) => void;
    mentionReferences?: CanvasResourceReference[];
    nodes: CanvasNodeData[];
    connectedNodes?: CanvasNodeData[];
    onDisconnectReference?: (fromNodeId: string, toNodeId: string) => void;
    onStartReferenceSelection?: (nodeId: string) => void;
    onImageSettingsOpenChange?: (open: boolean) => void;
    modeOverride?: CanvasNodeGenerationMode;
};

export function CanvasNodePromptPanel({ node, nodes, isRunning, onPromptChange, onConfigChange, onGenerate, onStop, mentionReferences = [], connectedNodes = [], onDisconnectReference, onStartReferenceSelection, onImageSettingsOpenChange, modeOverride }: CanvasNodePromptPanelProps) {
    const { t } = useTranslation();
    const globalConfig = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = modeOverride ?? defaultMode(node.type);
    const config = buildNodeConfig(globalConfig, node, mode);
    const hasTextContent = node.type === CanvasNodeType.Text && Boolean(node.metadata?.content?.trim());
    const hasImageContent = node.type === CanvasNodeType.Image && Boolean(node.metadata?.content);
    const isEditingExistingContent = hasTextContent || hasImageContent;
    const storedPrompt = node.metadata?.composerContent ?? node.metadata?.prompt ?? "";
    const recoveredCameraControl = node.metadata?.cameraControl ?? parseCameraControlFromPrompt(node.metadata?.prompt ?? storedPrompt);
    const [prompt, setPrompt] = useState(stripCameraPrompt(storedPrompt));
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        setPrompt(stripCameraPrompt(node.metadata?.composerContent ?? node.metadata?.prompt ?? ""));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node.id]);

    useEffect(() => {
        if ((mode !== "image" && mode !== "video") || node.metadata?.cameraControl) return;
        const inferred = parseCameraControlFromPrompt(node.metadata?.prompt ?? "");
        if (inferred) onConfigChange(node.id, { cameraControl: inferred });
    }, [mode, node.id, node.metadata?.cameraControl, node.metadata?.prompt, onConfigChange]);

    const updatePrompt = (value: string) => {
        setPrompt(value);
        if (isEditingExistingContent) onConfigChange(node.id, { composerContent: value });
        else onPromptChange(node.id, value);
    };

    const updateCameraControl = (cameraControl: CameraControlOptions) => {
        const rawPrompt = stripCameraPrompt(node.metadata?.composerContent ?? node.metadata?.prompt ?? prompt);
        onConfigChange(node.id, { cameraControl, prompt: applyCameraPrompt(rawPrompt, cameraControl) });
    };

    const submit = () => {
        const text = prompt.trim();
        if (!text || isRunning) return;
        onGenerate(node.id, mode, text);
    };

    const openExpandedEditor = () => {
        setExpanded(true);
    };

    const compactButtonHeight = "!h-[35px]";
    const cameraActive = Boolean(recoveredCameraControl?.enabled);

    return (
        <div
            data-canvas-no-zoom
            className="rounded-2xl border p-3 shadow-2xl backdrop-blur"
            style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
        >
            <CanvasNodeReferenceBar nodeId={node.id} nodes={nodes} connectedNodes={connectedNodes} onDisconnect={onDisconnectReference} onStartSelection={onStartReferenceSelection} />
            <CanvasPromptChipInput
                value={prompt}
                references={mentionReferences}
                onChange={updatePrompt}
                onSubmit={submit}
                className="thin-scrollbar h-40 w-full cursor-text resize-none rounded-xl px-3 py-2 text-sm leading-5 outline-none"
                style={{ background: "transparent", color: theme.node.text }}
                placeholder={t(`canvas.promptPanel.${mode === "image" && hasImageContent ? "editImage" : mode === "text" && hasTextContent ? "editText" : mode}`)}
            />

            <div className="mt-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <div className="flex shrink-0 items-center gap-2">
                    <Tooltip title={t("canvas.promptPanel.expandEditor")}>
                        <Button type="text" className="!h-8 !w-8 !min-w-8 shrink-0 !rounded-full !bg-transparent !p-0" style={{ color: theme.node.text }} icon={<Maximize2 className="size-3.5" />} onClick={openExpandedEditor} aria-label={t("canvas.promptPanel.expandEditor")} />
                    </Tooltip>
                    <CanvasPromptLibrary onSelect={updatePrompt} />
                </div>

                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 overflow-hidden">
                    {mode === "image" ? (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="image" onMissingConfig={() => openConfigDialog(true)} className={`${compactButtonHeight} !min-w-[96px] flex-[1_1_140px] max-w-[190px]`} />
                            <div className="min-w-[112px] flex-[1_1_140px] max-w-[170px] [&>span]:w-full">
                                <CanvasImageSettingsPopover
                                    config={config}
                                    placement="topLeft"
                                    buttonClassName={`${compactButtonHeight} canvas-reference-settings-trigger !w-full !min-w-0 !max-w-none !justify-start !rounded-full !px-3`}
                                    onConfigChange={(key, value) => onConfigChange(node.id, key === "count" ? { count: Number(value) || 1 } : { [key]: value })}
                                    onMissingConfig={() => openConfigDialog(true)}
                                    onOpenChange={onImageSettingsOpenChange}
                                />
                            </div>
                            <div className="shrink-0">
                                <CanvasCameraControl value={recoveredCameraControl} onChange={updateCameraControl} buttonClassName={`${compactButtonHeight} canvas-reference-camera-trigger ${cameraActive ? "canvas-reference-camera-trigger-active" : ""} !min-w-[92px] !justify-start !rounded-full !px-3`} />
                            </div>
                        </>
                    ) : mode === "video" ? (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="video" onMissingConfig={() => openConfigDialog(true)} className={`${compactButtonHeight} !min-w-[96px] flex-[1_1_140px] max-w-[190px]`} />
                            <div className="min-w-[120px] flex-[1_1_160px] max-w-[220px] [&>span]:w-full">
                                <CanvasVideoSettingsPopover config={config} buttonClassName={`${compactButtonHeight} canvas-reference-settings-trigger !w-full !min-w-0 !max-w-none !justify-start !rounded-full !px-3`} onConfigChange={(key, value) => onConfigChange(node.id, videoConfigPatch(key, value))} />
                            </div>
                            <div className="shrink-0">
                                <CanvasCameraControl value={recoveredCameraControl} onChange={updateCameraControl} buttonClassName={`${compactButtonHeight} canvas-reference-camera-trigger ${cameraActive ? "canvas-reference-camera-trigger-active" : ""} !min-w-[92px] !justify-start !rounded-full !px-3`} />
                            </div>
                        </>
                    ) : mode === "audio" ? (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="audio" onMissingConfig={() => openConfigDialog(true)} className={`${compactButtonHeight} !min-w-[96px] flex-[1_1_140px] max-w-[190px]`} />
                            <div className="min-w-[112px] flex-[1_1_140px] max-w-[170px] [&>span]:w-full">
                                <CanvasAudioSettingsPopover config={config} buttonClassName={`${compactButtonHeight} canvas-reference-settings-trigger !w-full !min-w-0 !max-w-none !justify-start !rounded-full !px-3`} onConfigChange={(key, value) => onConfigChange(node.id, audioConfigPatch(key, value))} />
                            </div>
                        </>
                    ) : (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability="text" onMissingConfig={() => openConfigDialog(true)} className={`${compactButtonHeight} !min-w-[96px] flex-[1_1_140px] max-w-[190px]`} />
                            <CanvasTextSettingsPopover config={config} count={node.metadata?.textCount || 1} buttonClassName={`${compactButtonHeight} canvas-reference-settings-trigger !max-w-[170px] !justify-start !rounded-full !px-2.5`} onConfigChange={(_, value) => onConfigChange(node.id, { reasoningEffort: value })} onCountChange={(textCount) => onConfigChange(node.id, { textCount })} />
                        </>
                    )}

                    <Button
                        type="primary"
                        className={`${compactButtonHeight} !min-w-16 shrink-0 !rounded-full !px-3`}
                        danger={isRunning}
                        disabled={!isRunning && !prompt.trim()}
                        onClick={() => (isRunning ? onStop(node.id) : submit())}
                        aria-label={t(isRunning ? "canvas.promptPanel.stopGeneration" : "canvas.promptPanel.generate")}
                    >
                        <span className="flex items-center justify-center gap-1.5">
                            {isRunning ? (
                                <>
                                    <LoaderCircle className="size-4 animate-spin" />
                                    <Square className="size-3.5 fill-current" />
                                    <span className="text-xs font-medium">{t("canvas.promptPanel.stop")}</span>
                                </>
                            ) : (
                                <span className="text-[20px] font-black leading-none">○</span>
                            )}
                        </span>
                    </Button>
                </div>
            </div>
            <Modal title={t("canvas.promptPanel.editorTitle")} open={expanded} centered width={760} footer={null} onCancel={() => setExpanded(false)} destroyOnHidden>
                <div data-canvas-no-zoom className="pt-2" onWheelCapture={(event) => event.stopPropagation()}>
                    <CanvasNodeReferenceBar nodeId={node.id} nodes={nodes} connectedNodes={connectedNodes} onDisconnect={onDisconnectReference} onStartSelection={(nodeId) => { setExpanded(false); onStartReferenceSelection?.(nodeId); }} />
                    <CanvasPromptChipInput
                        value={prompt}
                        references={mentionReferences}
                        onChange={updatePrompt}
                        className="thin-scrollbar h-[52dvh] min-h-80 w-full cursor-text overflow-y-auto rounded-xl border p-4 text-[15px] leading-6 outline-none"
                        style={{ background: "transparent", borderColor: theme.toolbar.border, color: theme.node.text }}
                        placeholder={t(`canvas.promptPanel.${mode === "image" && hasImageContent ? "editImage" : mode === "text" && hasTextContent ? "editText" : mode}`)}
                    />
                </div>
            </Modal>
        </div>
    );
}

function defaultMode(type: CanvasNodeData["type"]): CanvasNodeGenerationMode {
    return type === CanvasNodeType.Text ? "text" : type === CanvasNodeType.Video ? "video" : type === CanvasNodeType.Audio ? "audio" : "image";
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasNodeGenerationMode): AiConfig {
    return {
        ...globalConfig,
        model: resolveModelForCapability(globalConfig, node.metadata?.model, mode),
        reasoningEffort: node.metadata?.reasoningEffort || globalConfig.reasoningEffort || defaultConfig.reasoningEffort,
        quality: node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        size: node.metadata?.size || globalConfig.size || defaultConfig.size,
        background: node.metadata?.background ?? globalConfig.background ?? defaultConfig.background,
        videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        vquality: node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality,
        videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark || defaultConfig.videoWatermark,
        videoMode: node.metadata?.videoMode || globalConfig.videoMode || defaultConfig.videoMode,
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        count: String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    if (key === "videoMode") return { videoMode: value };
    return { [key]: value };
}

function audioConfigPatch(key: CanvasAudioSettingKey, value: string) {
    if (key === "audioVoice") return { audioVoice: value };
    if (key === "audioFormat") return { audioFormat: value };
    if (key === "audioSpeed") return { audioSpeed: value };
    return { audioInstructions: value };
}
