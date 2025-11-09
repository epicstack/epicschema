
using System.Text.Json.Nodes;
using OpenSchema.Validation;

namespace OpenSchema;

public sealed class OpenSchemaValidator
{
    private readonly MetaSchemaValidator _meta = new();

    public IEnumerable<ValidationError> Validate(string jsonText)
    {
        JsonNode? node;
        try
        {
            node = JsonNode.Parse(jsonText);
        }
        catch (Exception ex)
        {
            return new[] { new ValidationError("/", "json.parse", ex.Message) };
        }

        if (node is null) return new[] { new ValidationError("/", "json.null", "Empty document.") };

        var metaErrors = _meta.Validate(node);
        if (metaErrors.Any()) return metaErrors;

        if (node is not JsonObject obj)
            return new[] { new ValidationError("/", "json.root", "Root must be a JSON object.") };

        var semantic = new SemanticValidator(obj);
        return semantic.Validate();
    }

    public IEnumerable<ValidationError> ValidateFile(string path) => Validate(File.ReadAllText(path));
}
