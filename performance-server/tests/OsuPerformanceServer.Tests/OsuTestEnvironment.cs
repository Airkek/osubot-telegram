using NUnit.Framework;
using osu.Game.Beatmaps.Formats;

namespace OsuPerformanceServer.Tests;

[SetUpFixture]
public sealed class OsuTestEnvironment
{
    private BuiltInRulesetStore rulesetStore = null!;

    [OneTimeSetUp]
    public void InitialiseDecoders()
    {
        rulesetStore = new BuiltInRulesetStore();
        Decoder.RegisterDependencies(rulesetStore);
        LegacyDifficultyCalculatorBeatmapDecoder.Register();
    }

    [OneTimeTearDown]
    public void DisposeRulesets() => rulesetStore.Dispose();
}
