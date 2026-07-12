import { Module } from "commands/Module";
import { IBotRuntime } from "core/IBotRuntime";

export type ModuleBuilderFunc = (runtime: IBotRuntime) => Module;
