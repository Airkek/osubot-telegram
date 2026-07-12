export interface IOnboardingRepository {
    getUserOnboardingVersion(accountId: number): Promise<number>;
    isUserNeedOnboarding(accountId: number): Promise<boolean>;
    userOnboarded(accountId: number, version: number): Promise<void>;
    clearCache(): void;
}
