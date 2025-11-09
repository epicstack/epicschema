
using System.Text.Json.Nodes;
using Json.Schema;
using OpenSchema.Validation;

namespace OpenSchema;

public sealed class MetaSchemaValidator
{
    private static readonly JsonSchema _meta = JsonSchema.FromText("{\"$id\": \"https://openschema.dev/meta/0.1\", \"$schema\": \"https://json-schema.org/draft/2020-12/schema\", \"title\": \"Open Schema v0.1 Meta-Schema\", \"type\": \"object\", \"required\": [\"openSchema\", \"types\"], \"properties\": {\"openSchema\": {\"type\": \"string\", \"const\": \"0.1\"}, \"types\": {\"type\": \"object\", \"patternProperties\": {\"^[A-Z][A-Za-z0-9_]*$\": {\"$ref\": \"#/$defs/typeDefinition\"}}, \"additionalProperties\": false}}, \"$defs\": {\"typeDefinition\": {\"type\": \"object\", \"required\": [\"kind\"], \"properties\": {\"kind\": {\"type\": \"string\", \"enum\": [\"object\", \"interface\", \"enum\", \"alias\"]}, \"description\": {\"type\": \"string\"}, \"annotations\": {\"type\": \"object\"}, \"properties\": {\"type\": \"object\", \"patternProperties\": {\"^[a-zA-Z_][A-Za-z0-9_]*$\": {\"$ref\": \"#/$defs/propertyDefinition\"}}, \"additionalProperties\": false}, \"required\": {\"type\": \"array\", \"items\": {\"type\": \"string\", \"pattern\": \"^[a-zA-Z_][A-Za-z0-9_]*$\"}, \"uniqueItems\": true}, \"extends\": {\"type\": \"string\", \"pattern\": \"^[A-Z][A-Za-z0-9_]*$\"}, \"implements\": {\"type\": \"array\", \"items\": {\"type\": \"string\", \"pattern\": \"^[A-Z][A-Za-z0-9_]*$\"}, \"uniqueItems\": true}, \"abstract\": {\"type\": \"boolean\"}, \"identity\": {\"type\": \"array\", \"items\": {\"type\": \"string\", \"pattern\": \"^[a-zA-Z_][A-Za-z0-9_]*$\"}, \"uniqueItems\": true}, \"valueObject\": {\"type\": \"boolean\"}, \"discriminator\": {\"$ref\": \"#/$defs/discriminatorDefinition\"}, \"values\": {\"type\": \"array\", \"items\": {\"type\": \"string\"}, \"uniqueItems\": true}, \"type\": {\"$ref\": \"#/$defs/simpleType\"}}, \"allOf\": [{\"if\": {\"properties\": {\"kind\": {\"const\": \"object\"}}}, \"then\": {\"required\": [\"properties\"]}}, {\"if\": {\"properties\": {\"kind\": {\"const\": \"enum\"}}}, \"then\": {\"required\": [\"values\"]}}, {\"if\": {\"properties\": {\"kind\": {\"const\": \"alias\"}}}, \"then\": {\"required\": [\"type\"]}}], \"additionalProperties\": false}, \"propertyDefinition\": {\"type\": \"object\", \"required\": [\"type\"], \"properties\": {\"description\": {\"type\": \"string\"}, \"type\": {\"oneOf\": [{\"$ref\": \"#/$defs/simpleType\"}, {\"$ref\": \"#/$defs/referenceType\"}, {\"$ref\": \"#/$defs/listType\"}, {\"$ref\": \"#/$defs/mapType\"}]}, \"min\": {\"type\": \"number\"}, \"max\": {\"type\": \"number\"}, \"minLength\": {\"type\": \"integer\", \"minimum\": 0}, \"maxLength\": {\"type\": \"integer\", \"minimum\": 0}, \"pattern\": {\"type\": \"string\"}, \"minItems\": {\"type\": \"integer\", \"minimum\": 0}, \"maxItems\": {\"type\": \"integer\", \"minimum\": 0}, \"format\": {\"type\": \"string\"}}, \"additionalProperties\": false}, \"simpleType\": {\"type\": \"string\", \"enum\": [\"string\", \"int\", \"long\", \"float\", \"double\", \"bool\", \"bytes\", \"date\", \"datetime\"]}, \"referenceType\": {\"type\": \"object\", \"required\": [\"$ref\"], \"properties\": {\"$ref\": {\"type\": \"string\", \"pattern\": \"^[A-Z][A-Za-z0-9_]*$\"}}, \"additionalProperties\": false}, \"listType\": {\"type\": \"object\", \"required\": [\"list\"], \"properties\": {\"list\": {\"oneOf\": [{\"$ref\": \"#/$defs/simpleType\"}, {\"type\": \"string\", \"pattern\": \"^[A-Z][A-Za-z0-9_]*$\"}]}}, \"additionalProperties\": false}, \"mapType\": {\"type\": \"object\", \"required\": [\"map\"], \"properties\": {\"map\": {\"oneOf\": [{\"$ref\": \"#/$defs/simpleType\"}, {\"type\": \"string\", \"pattern\": \"^[A-Z][A-Za-z0-9_]*$\"}]}}, \"additionalProperties\": false}, \"discriminatorDefinition\": {\"type\": \"object\", \"properties\": {\"field\": {\"type\": \"string\"}, \"value\": {\"type\": \"string\"}, \"mapping\": {\"type\": \"object\", \"additionalProperties\": {\"type\": \"string\", \"pattern\": \"^[A-Z][A-Za-z0-9_]*$\"}}}, \"additionalProperties\": false}}}");

    public IEnumerable<ValidationError> Validate(JsonNode document)
    {
        var options = new EvaluationOptions { OutputFormat = OutputFormat.List };
        var result = _meta.Evaluate(document, options);

        if (result.IsValid || !result.HasErrors || !result.HasDetails)
        {
            yield break;
        }

        foreach (var detail in result.Details)
        {
            var path = detail.InstanceLocation.ToString();

            foreach (var error in detail.Errors!)
            {
                var msg = error.Value ?? "Invalid";

                yield return new ValidationError(path, "meta", msg);
            }
        }
    }
}
