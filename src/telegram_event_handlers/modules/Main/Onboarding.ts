import { Command } from "../../Command";
import { Module } from "../Module";
import { IKBButton, IKeyboard } from "../../../Util";
import { ILocalisator } from "../../../ILocalisator";
import UnifiedMessageContext from "../../../TelegramSupport";
import { ONBOARDING_VERSION, OnboardingModel } from "../../../data/Models/OnboardingModel";

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

    build(userId: number, l: ILocalisator): StepData;
    postprocess?(userId: number, onboardingModel: OnboardingModel): Promise<void>;
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
        postprocess: finalPostProcess,
    },
};

interface StepData {
    step: OnboardingSteps;
    text: string;
    buttons: IKeyboard;
}

function buildEvent(userId: number, event: string): string {
    return `osu ob ${userId}:${event}`;
}

function openStepEvent(userId: number, step: OnboardingSteps): string {
    const action: Actions = "show";
    return buildEvent(userId, `${step}:${action}`);
}

function previousStepButton(userId: number, step: OnboardingSteps, l: ILocalisator): IKBButton {
    return {
        text: "⬅️ " + l.tr("previous-step-button-text"),
        command: openStepEvent(userId, step),
    };
}

function buildFlowButtons(userId: number, currentStep: OnboardingSteps, l: ILocalisator): IKeyboard {
    const info = stepFlow[currentStep];
    if (!info) {
        return [];
    }
    return [...(info.previous ? [[previousStepButton(userId, info.previous, l)]] : [])];
}

type LangParams = "ru" | "en" | "zh" | "auto";

function buildLangParamButton(userId: number, step: LanguageStep, text: string, param: LangParams) {
    const action: Actions = "set";
    const event = buildEvent(userId, `${step}:${action}:${param}`);

    return {
        text: text,
        command: event,
    };
}

function stepLang(userId: number, l: ILocalisator): StepData {
    const currentStep: LanguageStep = "language";
    return {
        step: currentStep,
        text: l.tr("onboarding-text-greeting") + "\n\n" + l.tr("onboarding-text-step-language"),
        buttons: [
            [buildLangParamButton(userId, currentStep, "🇷🇺 Русский", "ru")],
            [buildLangParamButton(userId, currentStep, "🇺🇸 English", "en")],
            [buildLangParamButton(userId, currentStep, "🇨🇳 简体中文", "zh")],
            [buildLangParamButton(userId, currentStep, "🌐 Auto", "auto")],
        ],
    };
}

type StyleParams = "oki-cards" | "legacy-text";

function buildOutputStyleButton(userId: number, step: OutputStyleStep, text: string, param: StyleParams) {
    const action: Actions = "set";
    const event = buildEvent(userId, `${step}:${action}:${param}`);

    return {
        text: text,
        command: event,
    };
}

function stepOutputStyle(userId: number, l: ILocalisator): StepData {
    const currentStep: OutputStyleStep = "output-style";
    return {
        step: currentStep,
        text: l.tr("onboarding-text-step-output-style"),
        buttons: [
            [buildOutputStyleButton(userId, currentStep, l.tr("output-style-oki-cards"), "oki-cards")],
            [buildOutputStyleButton(userId, currentStep, l.tr("output-style-text"), "legacy-text")],
        ],
    };
}

type BoolParams = "yes" | "no";

function buildBoolButton(userId: number, step: OnboardingStepsYesNo, value: boolean, l: ILocalisator) {
    const param: BoolParams = value ? "yes" : "no";
    const action: Actions = "set";
    const event = buildEvent(userId, `${step}:${action}:${param}`);

    return {
        text: value ? "✅ " + l.tr("boolean-true-button-text") : "❌ " + l.tr("boolean-false-button-text"),
        command: event,
    };
}

function stepBoolean(userId: number, currentStep: OnboardingStepsYesNo, text: string, l: ILocalisator): StepData {
    return {
        step: currentStep,
        text: text,
        buttons: [[buildBoolButton(userId, currentStep, true, l)], [buildBoolButton(userId, currentStep, false, l)]],
    };
}

function extractBoolFromParam(value: BoolParams): boolean {
    return value == "yes";
}

function stepAutoRender(userId: number, l: ILocalisator): StepData {
    const step: OnboardingStepsYesNo = "automatic-render";
    return stepBoolean(userId, step, l.tr("onboarding-text-step-automatic-render"), l);
}

function stepExperimentalRender(userId: number, l: ILocalisator): StepData {
    const step: OnboardingStepsYesNo = "experimental-renderer";
    return stepBoolean(userId, step, l.tr("onboarding-text-step-experimental-renderer"), l);
}

function stepFinal(userId: number, l: ILocalisator): StepData {
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

async function finalPostProcess(userId: number, onboardingModel: OnboardingModel) {
    await onboardingModel.userOnboarded(userId, ONBOARDING_VERSION);
}

export default class OnboardingCommand extends Command {
    onboardingModel: OnboardingModel;

    constructor(module: Module) {
        super(["onboarding", "start", "старт", "начать", "ыефке", "ob"], module, async (ctx, self, args) => {
            const startStep: OnboardingSteps = "language";

            const payload = args.fullString?.split(":");
            if (!ctx.messagePayload || !payload || payload.length < 2) {
                await this.replyWithStep(startStep, ctx, ctx, this.onboardingModel);
                return;
            }

            const userId = Number(payload.shift());
            if (userId != ctx.senderId) {
                return;
            }

            const currentStep: OnboardingSteps = payload[0] as OnboardingSteps;
            const action = payload[1];

            switch (action) {
                case "show":
                    await this.replyWithStep(currentStep, ctx, ctx, this.onboardingModel);
                    break;

                case "set":
                    if (payload.length >= 3) {
                        const value = payload[2];
                        await this.applyStepSet(currentStep as OnboardingStepsWithSetters, value, ctx);
                        await this.replyWithNextStep(currentStep, ctx, ctx, this.onboardingModel);
                    }
                    break;
            }
        });

        this.onboardingModel = module.bot.database.onboardingModel;
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

    async replyWithNextStep(
        step: OnboardingSteps,
        ctx: UnifiedMessageContext,
        l: ILocalisator,
        onboardingModel: OnboardingModel
    ) {
        const info = stepFlow[step];
        if (!info) {
            await ctx.reply("unknown-step-error");
        }

        return await this.replyWithStep(info.next, ctx, l, onboardingModel);
    }

    async replyWithStep(
        step: OnboardingSteps,
        ctx: UnifiedMessageContext,
        l: ILocalisator,
        onboardingModel: OnboardingModel
    ) {
        const info = stepFlow[step];
        if (!info) {
            await ctx.reply("unknown-step-error");
        }

        const stepData = info.build(ctx.senderId, l);
        const realKeyboard = [...stepData.buttons, ...buildFlowButtons(ctx.senderId, stepData.step, l)];
        if (ctx.messagePayload) {
            await ctx.edit(stepData.text, {
                keyboard: realKeyboard,
            });
        } else {
            await ctx.reply(stepData.text, {
                keyboard: realKeyboard,
            });
        }

        if (info.postprocess) {
            await info.postprocess(ctx.senderId, onboardingModel);
        }
    }
}
