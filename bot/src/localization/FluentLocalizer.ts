import { FluentBundle, FluentResource, FluentVariable } from "@fluent/bundle";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { TranslateFunction } from "localization/ILocalizer";
import { TranslationVariables } from "localization/ILocalizer";
import { Language } from "core/Language";

export type TranslationContext = Record<string, FluentVariable | null | undefined>;

export class FluentLocalizer {
    private readonly bundles = new Map<Language, FluentBundle>();

    constructor(
        private readonly directory: string,
        private readonly fallbackLocale: Language = "en"
    ) {}

    initialize(locales: Language[] = ["en", "ru", "zh"]): void {
        for (const locale of locales) {
            this.getBundle(locale);
        }
    }

    translator(locale: Language | undefined, context: TranslationContext = {}): TranslateFunction {
        const selectedLocale = locale ?? this.fallbackLocale;
        return (key, variables) => this.translate(selectedLocale, key, variables, context);
    }

    private translate(
        locale: Language,
        key: string,
        variables: TranslationVariables | undefined,
        context: TranslationContext
    ): string {
        const bundle = this.getBundle(locale);
        const fallbackBundle = locale === this.fallbackLocale ? bundle : this.getBundle(this.fallbackLocale);
        const message = bundle.getMessage(key) ?? fallbackBundle.getMessage(key);
        if (!message?.value) {
            global.logger.error(`Missing Fluent translation '${key}' for locale '${locale}'`);
            return key;
        }

        const defaults = Object.fromEntries(
            Object.entries(context).filter(
                (entry): entry is [string, FluentVariable] => entry[1] !== null && entry[1] !== undefined
            )
        );
        const errors: Error[] = [];
        const result = (bundle.hasMessage(key) ? bundle : fallbackBundle).formatPattern(
            message.value,
            { ...defaults, ...variables },
            errors
        );
        if (errors.length > 0) {
            global.logger.error(`Failed to format Fluent translation '${key}' for locale '${locale}'`, errors);
        }
        return result;
    }

    private getBundle(locale: Language): FluentBundle {
        const cached = this.bundles.get(locale);
        if (cached) {
            return cached;
        }

        const bundle = new FluentBundle(locale, { useIsolating: false });
        const localeDirectory = path.join(this.directory, locale);
        const files = readdirSync(localeDirectory)
            .filter((file) => file.endsWith(".ftl"))
            .sort();
        for (const file of files) {
            const source = readFileSync(path.join(localeDirectory, file), "utf8");
            const errors = bundle.addResource(new FluentResource(source), { allowOverrides: true });
            if (errors.length > 0) {
                throw new Error(
                    `Failed to load Fluent resource ${path.join(localeDirectory, file)}: ${errors.join(", ")}`
                );
            }
        }

        this.bundles.set(locale, bundle);
        return bundle;
    }
}
