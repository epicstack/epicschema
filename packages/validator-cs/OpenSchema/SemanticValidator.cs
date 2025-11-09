using System.Text.Json.Nodes;
using OpenSchema.Validation;

namespace OpenSchema;

public sealed class SemanticValidator
{
    private readonly ValidationContext _ctx;

    public SemanticValidator(JsonObject document)
    {
        _ctx = new ValidationContext(document);
    }

    public IEnumerable<ValidationError> Validate()
    {
        ValidateTypeKinds();
        ValidateReferences();
        ValidateInheritance();
        ValidateInterfaces();
        ValidateDiscriminators();
        ValidateIdentity();
        ValidateEnums();
        ValidateAliases();
        return _ctx.Errors;
    }

    private void ValidateTypeKinds()
    {
        foreach (var (name, type) in _ctx.Types)
        {
            var kind = type.Kind();
            if (kind is null)
            {
                _ctx.Error($"/types/{name}", "kind.missing", "Type is missing 'kind'.");
                continue;
            }
            if (kind is not ("object" or "interface" or "enum" or "alias"))
            {
                _ctx.Error($"/types/{name}/kind", "kind.invalid", $"Unknown kind '{kind}'.");
            }
        }
    }

    private void ValidateReferences()
    {
        foreach (var (name, type) in _ctx.Types)
        {
            // extends
            var ext = type.TryGet("extends")?.ToString()?.Trim('"');
            if (!string.IsNullOrEmpty(ext) && !_ctx.Types.ContainsKey(ext!))
                _ctx.Error($"/types/{name}/extends", "ref.unknown", $"Unknown base type '{ext}'.");

            // implements
            foreach (var itf in type.TryGet("implements").StringArray())
                if (!_ctx.Types.TryGetValue(itf, out var t) || t.Kind() != "interface")
                    _ctx.Error($"/types/{name}/implements", "ref.interface", $"'{itf}' is not a known interface.");

            // property $ref, list, map
            var props = type.Properties();
            if (props is null) continue;

            foreach (var (pname, pnode) in props.Props())
            {
                if (pnode is not JsonObject p) continue;

                // $ref
                var r = p.TryGet("$ref")?.ToString()?.Trim('"');
                if (!string.IsNullOrEmpty(r) && !_ctx.Types.ContainsKey(r!))
                    _ctx.Error($"/types/{name}/properties/{pname}/$ref", "ref.unknown", $"Unknown type reference '{r}'.");

                // list
                if (p.TryGet("list") is JsonNode ln and not null and not JsonValue)
                {
                    var ls = ln.ToString().Trim('"');
                    if (!_ctx.Types.ContainsKey(ls))
                        _ctx.Error($"/types/{name}/properties/{pname}/list", "ref.unknown", $"Unknown list element type '{ls}'.");
                }

                // map
                if (p.TryGet("map") is JsonNode mn and not null and not JsonValue)
                {
                    var ms = mn.ToString().Trim('"');
                    if (!_ctx.Types.ContainsKey(ms))
                        _ctx.Error($"/types/{name}/properties/{pname}/map", "ref.unknown", $"Unknown map value type '{ms}'.");
                }
            }
        }
    }

    private void ValidateInheritance()
    {
        var parent = new Dictionary<string, string?>();
        foreach (var (name, type) in _ctx.Types)
        {
            var kind = type.Kind();
            var ext = type.TryGet("extends")?.ToString()?.Trim('"');
            if (!string.IsNullOrEmpty(ext))
            {
                if (kind != "object")
                    _ctx.Error($"/types/{name}/extends", "inherit.kind", "Only object types may extend.");
                else if (!_ctx.Types.TryGetValue(ext!, out var baseType) || baseType.Kind() != "object")
                    _ctx.Error($"/types/{name}/extends", "inherit.base", "Base type must be an object.");
                parent[name] = ext;
            }
            else parent[name] = null;
        }

        // Detect cycles in the inheritance graph
        foreach (var (name, _) in _ctx.Types)
        {
            var seen = new HashSet<string>();
            var cur = name;
            while (parent.TryGetValue(cur, out var p) && p is not null)
            {
                if (!seen.Add(p)) { _ctx.Error($"/types/{name}/extends", "inherit.cycle", "Inheritance cycle detected."); break; }
                cur = p;
            }
        }

        // Validate property redefinition and value-object rules
        foreach (var (name, type) in _ctx.Types)
        {
            if (!parent.TryGetValue(name, out var p) || p is null) continue;

            var props = type.Properties() ?? new JsonObject();
            var allBaseProps = GetAllProps(p);
            foreach (var (pn, pv) in props)
            {
                if (allBaseProps.TryGetValue(pn, out var baseProp))
                {
                    if (!JsonNode.DeepEquals(baseProp, pv))
                        _ctx.Error($"/types/{name}/properties/{pn}", "inherit.prop.redefine", $"Property '{pn}' redefined incompatibly.");
                }
            }

            var baseType = _ctx.Types[p];
            if (baseType.TryGet("valueObject")?.ToString() == "true")
                _ctx.Error($"/types/{name}/extends", "inherit.valueObject", "Value objects cannot be extended.");
        }
    }

    /// <summary>
    /// Collects all properties from the specified type, including those inherited via 'extends'.
    /// This implementation is cycle-safe: it tracks visited types and stops on repeat to avoid infinite loops.
    /// It also has a conservative max depth guard to prevent pathological inputs from hanging validation.
    /// </summary>
    private Dictionary<string, JsonNode> GetAllProps(string typeName)
    {
        const int MaxDepth = 1024;
        var map = new Dictionary<string, JsonNode>();
        var visited = new HashSet<string>();
        var cur = typeName;
        var depth = 0;

        while (_ctx.Types.TryGetValue(cur, out var t))
        {
            if (!visited.Add(cur))
            {
                // Cycle encountered; stop property collection here.
                break;
            }

            // Depth guard for extra safety
            depth++;
            if (depth > MaxDepth)
            {
                // Too deep/complex inheritance chain; stop collecting to avoid hangs.
                break;
            }

            var props = t.Properties();
            if (props is not null)
            {
                foreach (var kv in props)
                {
                    if (!map.ContainsKey(kv.Key))
                        map[kv.Key] = kv.Value!;
                }
            }

            var ext = t.TryGet("extends")?.ToString()?.Trim('"');
            if (string.IsNullOrEmpty(ext)) break;
            cur = ext!;
        }

        return map;
    }

    private void ValidateInterfaces()
    {
        foreach (var (name, type) in _ctx.Types)
        {
            foreach (var itf in type.TryGet("implements").StringArray())
            {
                if (!_ctx.Types.TryGetValue(itf, out var iface) || iface.Kind() != "interface") continue;

                var ifaceProps = iface.Properties() ?? new();
                var objProps = GetAllProps(name);

                foreach (var kv in ifaceProps)
                {
                    if (!objProps.TryGetValue(kv.Key, out var myProp))
                    {
                        _ctx.Error($"/types/{name}", "iface.missing", $"Missing property '{kv.Key}' from interface '{itf}'.");
                        continue;
                    }
                    if (!JsonNode.DeepEquals(kv.Value, myProp))
                    {
                        _ctx.Error($"/types/{name}/properties/{kv.Key}", "iface.mismatch", $"Property '{kv.Key}' does not match interface '{itf}'.");
                    }
                }
            }
        }
    }

    private void ValidateDiscriminators()
    {
        foreach (var (name, type) in _ctx.Types)
        {
            var disc = type.TryGet("discriminator") as JsonObject;
            if (disc is null) continue;

            var field = disc.TryGet("field")?.ToString()?.Trim('"');
            if (!string.IsNullOrEmpty(field))
            {
                var props = GetAllProps(name);
                if (!props.TryGetValue(field!, out var fldNode) || fldNode is not JsonObject obj || obj.TryGet("type")?.ToString().Trim('"') != "string")
                    _ctx.Error($"/types/{name}/discriminator/field", "disc.field", $"Discriminator field '{field}' must exist as a string property on the base type.");
            }

            if (disc.TryGet("mapping") is JsonObject map)
            {
                foreach (var m in map)
                {
                    var target = m.Value?.ToString()?.Trim('"');
                    if (string.IsNullOrEmpty(target) || !_ctx.Types.TryGetValue(target!, out var t))
                    {
                        _ctx.Error($"/types/{name}/discriminator/mapping/{m.Key}", "disc.mapping.unknown", $"Mapping references unknown type '{target}'.");
                        continue;
                    }
                    var baseName = t.TryGet("extends")?.ToString()?.Trim('"');
                    if (baseName != name)
                    {
                        _ctx.Error($"/types/{name}/discriminator/mapping/{m.Key}", "disc.mapping.extend", $"Mapped type '{target}' does not extend base '{name}'.");
                    }
                }
            }
        }

        var siblingsByBase = new Dictionary<string, Dictionary<string, string>>();
        foreach (var (name, type) in _ctx.Types)
        {
            var baseName = type.TryGet("extends")?.ToString()?.Trim('"');
            if (string.IsNullOrEmpty(baseName)) continue;

            var baseType = _ctx.Types[baseName!];
            var baseDisc = baseType.TryGet("discriminator") as JsonObject;
            if (baseDisc is null) continue;

            var val = (type.TryGet("discriminator") as JsonObject)?.TryGet("value")?.ToString()?.Trim('"');
            if (string.IsNullOrEmpty(val))
            {
                _ctx.Error($"/types/{name}/discriminator", "disc.value.missing", $"Derived type '{name}' must specify discriminator.value.");
                continue;
            }

            if (!siblingsByBase.TryGetValue(baseName!, out var map)) { map = new(); siblingsByBase[baseName!] = map; }
            if (map.TryGetValue(val!, out var other))
            {
                _ctx.Error($"/types/{name}/discriminator/value", "disc.value.duplicate", $"Discriminator value '{val}' already used by '{other}'.");
            }
            else map[val!] = name;

            var mapping = baseDisc.TryGet("mapping") as JsonObject;
            if (mapping is not null && !mapping.ContainsKey(val!))
            {
                _ctx.Error($"/types/{name}/discriminator/value", "disc.value.mapping", $"Value '{val}' not declared in base mapping.");
            }
        }
    }

    private void ValidateIdentity()
    {
        foreach (var (name, type) in _ctx.Types)
        {
            var idArr = type.TryGet("identity");
            if (idArr is null) continue;

            if (type.Kind() != "object")
            {
                _ctx.Error($"/types/{name}/identity", "identity.kind", "Only object types may define identity.");
                continue;
            }

            var props = GetAllProps(name);
            foreach (var id in idArr.StringArray())
            {
                if (!props.ContainsKey(id))
                {
                    _ctx.Error($"/types/{name}/identity", "identity.missing", $"Identity field '{id}' does not exist.");
                }
            }

            var baseName = type.TryGet("extends")?.ToString()?.Trim('"');
            if (!string.IsNullOrEmpty(baseName))
            {
                var baseId = _ctx.Types[baseName!].TryGet("identity");
                if (baseId is not null && baseId.ToJsonString() != idArr.ToJsonString())
                {
                    _ctx.Error($"/types/{name}/identity", "identity.override", "Derived types cannot redefine identity.");
                }
            }
        }
    }

    private void ValidateEnums()
    {
        foreach (var (name, type) in _ctx.Types)
        {
            if (type.Kind() != "enum") continue;
            foreach (var field in new[] { "properties", "extends", "implements", "identity", "valueObject", "discriminator" })
            {
                if (type.ContainsKey(field))
                    _ctx.Error($"/types/{name}", "enum.forbidden", $"Enum cannot define '{field}'.");
            }
        }
    }

    private void ValidateAliases()
    {
        foreach (var (name, type) in _ctx.Types)
        {
            if (type.Kind() != "alias") continue;
            foreach (var key in type.Select(kv => kv.Key))
            {
                if (key is not ("kind" or "description" or "annotations" or "type"))
                    _ctx.Error($"/types/{name}/{key}", "alias.forbidden", "Alias types may only declare 'type'.");
            }
        }
    }
}
