import { Module } from "commands/Module";
import { IGameUserRepository } from "core/storage/IGameUserRepository";
import { IBeatmapProvider } from "games/IBeatmapProvider";
import { IGameApi } from "games/IGameApi";

export class ServerModule extends Module {
    link: string;
    api: IGameApi;
    db: IGameUserRepository;
    beatmapProvider?: IBeatmapProvider;
}
