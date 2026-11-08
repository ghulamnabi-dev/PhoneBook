namespace PhoneBook.Infrastructure.Persistence;

/// <summary>
/// "Database:Provider" = Sqlite (default, zero-setup dev) | SqlServer, plus "ConnectionStrings:DefaultConnection".
/// </summary>
public sealed record DatabaseSettings(string Provider, string ConnectionString)
{
    public const string DefaultSqliteConnection = "Data Source=phonebook.db";

    public bool IsSqlite => Provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase);

    /// <summary>An in-memory SQLite database (the integration tests) — its owner creates the schema.</summary>
    public bool IsInMemorySqlite => IsSqlite &&
        (ConnectionString.Contains("mode=memory", StringComparison.OrdinalIgnoreCase) ||
         ConnectionString.Contains(":memory:", StringComparison.OrdinalIgnoreCase));

    public static DatabaseSettings From(IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"];
        if (string.IsNullOrWhiteSpace(provider)) provider = "Sqlite";

        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
            return new DatabaseSettings("Sqlite", string.IsNullOrWhiteSpace(connectionString) ? DefaultSqliteConnection : connectionString);

        if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(connectionString))
                throw new InvalidOperationException(
                    "Database:Provider is SqlServer but ConnectionStrings:DefaultConnection is not configured. " +
                    "Set it with `dotnet user-secrets` or the ConnectionStrings__DefaultConnection environment variable.");
            return new DatabaseSettings("SqlServer", connectionString);
        }

        throw new InvalidOperationException($"Database:Provider '{provider}' is not supported. Use \"Sqlite\" or \"SqlServer\".");
    }
}
