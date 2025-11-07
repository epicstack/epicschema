using OpenSchema;

if (args.Length < 2 || args[0] != "validate")
{
    Console.Error.WriteLine("Usage: openschema validate <file.os.json>");
    Environment.Exit(2);
}

var path = args[1];
if (!File.Exists(path))
{
    Console.Error.WriteLine($"File not found: {path}");
    Environment.Exit(2);
}

var validator = new OpenSchemaValidator();
var errors = validator.ValidateFile(path).ToList();
if (!errors.Any())
{
    Console.WriteLine("Valid ✅");
    Environment.Exit(0);
}

Console.Error.WriteLine("Invalid ❌");
foreach (var e in errors)
{
    Console.Error.WriteLine($" - {e}");
}
Environment.Exit(1);
