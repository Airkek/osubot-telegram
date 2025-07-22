import { Command } from "../../Command";
import { Module } from "../Module";
import { IKBButton, IKeyboard } from "../../../Util";
import { ILocalisator } from "../../../ILocalisator";
import UnifiedMessageContext from "../../../TelegramSupport";

type LanguageStep = "language";
type OutputStyleStep = "output-style";
type OnboardingStepsWithCustomParams = LanguageStep | OutputStyleStep;
type OnboardingStepsYesNo = "automatic-render" | "experimental-renderer";
type OnboardingStepsWithSetters = OnboardingStepsWithCustomParams | OnboardingStepsYesNo;
type OnboardingSteps = OnboardingStepsWithSetters | "final";

type Actions = "show" | "set";

interface StepInfo {
    next?: OnboardingSteps;
    previous?: OnboardingSteps;
    build(l: ILocalisator): StepData;
}

const stepFlow: Record<OnboardingSteps, StepInfo> = {
    language: {
        next: "output-style",
        build: stepLang,
    },
    "output-style": {
        previous: "language",
        next: "automatic-render",
        build: stepOutputStyle,
    },
    "automatic-render": {
        previous: "output-style",
        next: "experimental-renderer",
        build: stepAutoRender,
    },
    "experimental-renderer": {
        previous: "automatic-render",
        next: "final",
        build: stepExperimentalRender,
    },
    final: {
        previous: "experimental-renderer",
        build: stepFinal,
    },
};

interface StepData {
    step: OnboardingSteps;
    text: string;
    buttons: IKeyboard;
}

function buildEvent(event: string): string {
    return `osu ob ${event}`;
}

function openStepEvent(step: OnboardingSteps): string {
    const action: Actions = "show";
    return buildEvent(`${step}:${action}`);
}

function previousStepButton(step: OnboardingSteps, l: ILocalisator): IKBButton {
    return {
        text: "⬅️ " + l.tr("previous-step-button-text"),
        command: openStepEvent(step),
    };
}

function buildFlowButtons(currentStep: OnboardingSteps, l: ILocalisator): IKeyboard {
    const info = stepFlow[currentStep];
    if (!info) {
        return [];
    }
    return [...(info.previous ? [[previousStepButton(info.previous, l)]] : [])];
}

type LangParams = "ru" | "en" | "zh" | "auto";
function buildLangParamButton(step: LanguageStep, text: string, param: LangParams) {
    const action: Actions = "set";
    const event = buildEvent(`${step}:${action}:${param}`);

    return {
        text: text,
        command: event,
    };
}

function stepLang(l: ILocalisator): StepData {
    const currentStep: LanguageStep = "language";
    return {
        step: currentStep,
        text: l.tr("onboarding-text-greeting") + "\n\n" + l.tr("onboarding-text-step-language"),
        buttons: [
            [buildLangParamButton(currentStep, "🇷🇺 Русский", "ru")],
            [buildLangParamButton(currentStep, "🇺🇸 English", "en")],
            [buildLangParamButton(currentStep, "🇨🇳 简体中文", "zh")],
            [buildLangParamButton(currentStep, "🌐 Auto", "auto")],
        ],
    };
}

type StyleParams = "oki-cards" | "legacy-text";
function buildOutputStyleButton(step: OutputStyleStep, text: string, param: StyleParams) {
    const action: Actions = "set";
    const event = buildEvent(`${step}:${action}:${param}`);

    return {
        text: text,
        command: event,
    };
}

function stepOutputStyle(l: ILocalisator): StepData {
    const currentStep: OutputStyleStep = "output-style";
    return {
        step: currentStep,
        text: l.tr("onboarding-text-step-output-style"),
        buttons: [
            [buildOutputStyleButton(currentStep, l.tr("output-style-oki-cards"), "oki-cards")],
            [buildOutputStyleButton(currentStep, l.tr("output-style-text"), "legacy-text")],
        ],
    };
}

type BoolParams = "yes" | "no";
function buildBoolButton(step: OnboardingStepsYesNo, value: boolean, l: ILocalisator) {
    const param: BoolParams = value ? "yes" : "no";
    const action: Actions = "set";
    const event = buildEvent(`${step}:${action}:${param}`);

    return {
        text: value ? "✅ " + l.tr("boolean-true-button-text") : "❌ " + l.tr("boolean-false-button-text"),
        command: event,
    };
}

function stepBoolean(currentStep: OnboardingStepsYesNo, text: string, l: ILocalisator): StepData {
    return {
        step: currentStep,
        text: text,
        buttons: [[buildBoolButton(currentStep, true, l)], [buildBoolButton(currentStep, false, l)]],
    };
}

function extractBoolFromParam(value: BoolParams): boolean {
    return value == "yes";
}

function stepAutoRender(l: ILocalisator): StepData {
    const step: OnboardingStepsYesNo = "automatic-render";
    return stepBoolean(step, l.tr("onboarding-text-step-automatic-render"), l);
}

function stepExperimentalRender(l: ILocalisator): StepData {
    const step: OnboardingStepsYesNo = "experimental-renderer";
    return stepBoolean(step, l.tr("onboarding-text-step-experimental-renderer"), l);
}

function stepFinal(l: ILocalisator): StepData {
    return {
        step: "final",
        text: l.tr("onboarding-text-step-final"),
        buttons: [
            [
                {
                    text: l.tr("open-help-button-text"),
                    command: "osu help",
                },
            ],
        ],
    };
}

export default class OnboardingCommand extends Command {
    constructor(module: Module) {
        super(["onboarding", "start", "старт", "начать", "ыефке", "ob"], module, async (ctx, self, args) => {
            if (ctx.isInGroupChat) {
                return;
            }

            const startStep: OnboardingSteps = "language";

            const payload = args.fullString?.split(":");
            if (!ctx.messagePayload || !payload || payload.length < 2) {
                await this.replyWithStep(startStep, ctx, ctx);
                return;
            }

            const currentStep: OnboardingSteps = payload[0] as OnboardingSteps;
            const action = payload[1];

            switch (action) {
                case "show":
                    await this.replyWithStep(currentStep, ctx, ctx);
                    break;

                case "set":
                    if (payload.length >= 3) {
                        const value = payload[2];
                        await this.applyStepSet(currentStep as OnboardingStepsWithSetters, value, ctx);
                        await this.replyWithNextStep(currentStep, ctx, ctx);
                    }
                    break;
            }
        });
    }

    async applyStepSet(step: OnboardingStepsWithSetters, value: string, ctx: UnifiedMessageContext) {
        switch (step) {
            case "language":
                await this.applyLanguageSet(step, value as LangParams, ctx);
                break;
            case "output-style":
                await this.applyOutputStyleSet(step, value as StyleParams, ctx);
                break;
            case "automatic-render":
                await this.applyAutoRenderSet(step, value as BoolParams, ctx);
                break;
            case "experimental-renderer":
                await this.applyExperimentalRenderSet(step, value as BoolParams, ctx);
                break;
        }

        await ctx.reactivateLocalisator();
    }

    async applyAutoRenderSet(step: OnboardingStepsYesNo, value: BoolParams, ctx: UnifiedMessageContext) {
        const settings = await ctx.userSettings();
        settings.render_enabled = extractBoolFromParam(value);
        await ctx.updateUserSettings(settings);
    }

    async applyExperimentalRenderSet(step: OnboardingStepsYesNo, value: BoolParams, ctx: UnifiedMessageContext) {
        const settings = await ctx.userSettings();
        settings.experimental_renderer = extractBoolFromParam(value);
        await ctx.updateUserSettings(settings);
    }

    async applyLanguageSet(step: LanguageStep, value: LangParams, ctx: UnifiedMessageContext) {
        const settings = await ctx.userSettings();
        switch (value) {
            case "ru":
                settings.language_override = "ru";
                break;
            case "en":
                settings.language_override = "en";
                break;
            case "zh":
                settings.language_override = "zh";
                break;
            case "auto":
                settings.language_override = "do_not_override";
                break;
        }
        await ctx.updateUserSettings(settings);
    }

    async applyOutputStyleSet(step: OutputStyleStep, value: StyleParams, ctx: UnifiedMessageContext) {
        const settings = await ctx.userSettings();
        switch (value) {
            case "oki-cards":
                settings.content_output = "oki-cards";
                break;
            case "legacy-text":
                settings.content_output = "legacy-text";
                break;
        }
        await ctx.updateUserSettings(settings);
    }

    async replyWithNextStep(step: OnboardingSteps, ctx: UnifiedMessageContext, l: ILocalisator) {
        const info = stepFlow[step];
        if (!info) {
            await ctx.reply("unknown-step-error");
        }

        return await this.replyWithStep(info.next, ctx, l);
    }

    async replyWithStep(step: OnboardingSteps, ctx: UnifiedMessageContext, l: ILocalisator) {
        const info = stepFlow[step];
        if (!info) {
            await ctx.reply("unknown-step-error");
        }

        const stepData = info.build(l);
        const realKeyboard = [...stepData.buttons, ...buildFlowButtons(stepData.step, l)];
        if (ctx.messagePayload) {
            await ctx.edit(stepData.text, {
                keyboard: realKeyboard,
            });
        } else {
            await ctx.reply(stepData.text, {
                keyboard: realKeyboard,
            });
        }
    }
}
