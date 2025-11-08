
using System.Text.Json.Nodes;

namespace OpenSchema;

internal static class JsonUtils
{
    public static string? Kind(this JsonObject type) => type["kind"]?.GetValue<string>();

    public static JsonObject? Properties(this JsonObject type) => type["properties"] as JsonObject;

    public static IEnumerable<string> Required(this JsonObject type)
        => (type["required"] as JsonArray)?.Select(x => x!.GetValue<string>()) ?? Enumerable.Empty<string>();

    public static IEnumerable<KeyValuePair<string, JsonNode?>> Props(this JsonObject obj)
        => obj.Select(kv => kv);

    public static JsonNode? TryGet(this JsonObject obj, string key) => obj.TryGetPropertyValue(key, out var n) ? n : null;

    public static string? String(this JsonNode? node) => node is null ? null : node.GetValue<string>();

    public static IEnumerable<string> StringArray(this JsonNode? node)
        => node is JsonArray arr ? arr.Select(x => x!.GetValue<string>()) : Enumerable.Empty<string>();
}
