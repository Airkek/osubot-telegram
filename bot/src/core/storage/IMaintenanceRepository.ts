import { GameServerName } from "core/storage/GameServerName";
import { MaintenanceTarget } from "core/storage/MaintenanceTarget";

export interface IMaintenanceRepository {
    count(target: MaintenanceTarget, server?: GameServerName): Promise<number>;
    clear(target: MaintenanceTarget, server?: GameServerName): Promise<number>;
}
