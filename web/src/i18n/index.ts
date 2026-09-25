import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enUS from "@/i18n/locales/en-US";
import zhCN from "@/i18n/locales/zh-CN";

export type AppLocale = "zh-CN" | "en-US";

const LOCALE_STORAGE_KEY = "infinite-canvas:locale";

const zhCNReviewed = {
    ...zhCN,
    canvas: {
        ...zhCN.canvas,
        nodeTypes: { ...zhCN.canvas.nodeTypes, config: "生成", group: "群组" },
        toolbar: { ...zhCN.canvas.toolbar, config: "生成", group: "群组" },
        createMenu: { ...zhCN.canvas.createMenu, config: "生成节点" },
        node: { ...zhCN.canvas.node, group: "群组" },
        sidePanel: {
            ...zhCN.canvas.sidePanel,
            filter: { ...zhCN.canvas.sidePanel.filter, config: "生成", group: "群组" },
        },
        imageTools: {
            ...zhCN.canvas.imageTools,
            reversePromptTitle: "创建反推提示词的文本和生成节点",
        },
        configNode: { ...zhCN.canvas.configNode, title: "生成" },
        projectPage: {
            ...zhCN.canvas.projectPage,
            configConnection: "生成节点之间不能连接",
        },
        composer: {
            ...zhCN.canvas.composer,
            placeholder: "输入提示词，按 @ 引用连接的图片、文本或群组",
            resources: { ...zhCN.canvas.composer.resources, group: "群组{{index}}" },
        },
    },
};

i18n.use(initReactI18next).init({
    resources: {
        "zh-CN": { translation: zhCNReviewed },
        "en-US": { translation: enUS },
    },
    lng: (localStorage.getItem(LOCALE_STORAGE_KEY) as AppLocale) || "zh-CN",
    fallbackLng: "zh-CN",
    supportedLngs: ["zh-CN", "en-US"],
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
});

export function changeAppLocale(locale: AppLocale) {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    return i18n.changeLanguage(locale);
}

export default i18n;
