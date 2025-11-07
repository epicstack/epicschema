
using System.Text.Json.Nodes;

namespace OpenSchema.Validation;

internal sealed class ValidationContext
{
    public JsonObject Document { get; }
    public Dictionary<string, JsonObject> Types { get; } = new();
    public List<ValidationError> Errors { get; } = new();

    public ValidationContext(JsonObject document)
    {
        Document = document;
        if (document["types"] is JsonObject typesObj)
        {
            foreach (var kv in typesObj)
            {
                if (kv.Value is JsonObject tobj)
                {
                    Types[kv.Key] = tobj;
                }
            }
        }
    }

    public void Error(string path, string code, string message) => Errors.Add(new ValidationError(path, code, message));

    public static string Jp(params string[] parts) => string.Join('/', parts.Select(p => p.Replace("~", "~0").Replace("/", "~1")));
}
