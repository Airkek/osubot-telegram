using osu.Game.Online.API;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Catch;
using osu.Game.Rulesets.Mania;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Osu;
using osu.Game.Rulesets.Taiko;

namespace OsuPerformanceServer;

internal static class RulesetHelper
{
    public static Ruleset FromLegacyId(int id) => id switch
    {
        0 => new OsuRuleset(),
        1 => new TaikoRuleset(),
        2 => new CatchRuleset(),
        3 => new ManiaRuleset(),
        _ => throw new ArgumentOutOfRangeException(nameof(id), id, "Unsupported osu! ruleset")
    };

    public static Mod[] ParseMods(Ruleset ruleset, IEnumerable<ApiModInput> inputs) => inputs
        .Select(input => new APIMod
        {
            Acronym = input.Acronym,
            Settings = input.Settings
        }.ToMod(ruleset))
        .ToArray();
}

internal sealed class BuiltInRulesetStore : RulesetStore
{
    private readonly RulesetInfo[] rulesets =
    [
        new OsuRuleset().RulesetInfo,
        new TaikoRuleset().RulesetInfo,
        new CatchRuleset().RulesetInfo,
        new ManiaRuleset().RulesetInfo
    ];

    public override IEnumerable<RulesetInfo> AvailableRulesets => rulesets;
}
