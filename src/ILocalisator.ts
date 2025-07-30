import { FluentVariable } from "@fluent/bundle";

export type TranslationVariables<K extends string = string> = Record<K, FluentVariable>;
export type TranslateFunction = <K extends string>(key: string, variables?: TranslationVariables<K>) => string;

export interface ILocalisator {
    tr: TranslateFunction;
}
