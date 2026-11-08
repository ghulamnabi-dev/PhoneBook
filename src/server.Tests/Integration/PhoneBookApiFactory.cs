using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PhoneBook.Application.Auth;
using PhoneBook.Infrastructure.Persistence;

namespace PhoneBook.Tests.Integration;

/// <summary>
/// Boots the real API on a private, shared-cache in-memory SQLite database. The connection held here keeps the
/// database alive for the factory's lifetime; every DbContext the app creates opens its own connection to it.
/// </summary>
public sealed class PhoneBookApiFactory : WebApplicationFactory<Program>
{
    public const string TestSecret = "integration-tests-only-secret-0123456789-abcdefghijklmnop";

    private readonly string _connectionString = $"DataSource=file:test{Guid.NewGuid():N}?mode=memory&cache=shared";
    private readonly SqliteConnection _keepAlive;

    public PhoneBookApiFactory()
    {
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var settings = new Dictionary<string, string?>
        {
            ["Database:Provider"] = "Sqlite",
            ["ConnectionStrings:DefaultConnection"] = _connectionString,
            ["Jwt:Secret"] = TestSecret,
            ["Jwt:Issuer"] = "PhoneBook.Tests",
            ["Jwt:Audience"] = "PhoneBook.Tests.Client",
        };

        builder.UseEnvironment("Testing");
        foreach (var (key, value) in settings) builder.UseSetting(key, value);
        // Added last, so it wins over appsettings*.json and environment variables.
        builder.ConfigureAppConfiguration(config => config.AddInMemoryCollection(settings));
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<PhoneBookDbContext>().Database.EnsureCreated();
        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _keepAlive.Dispose();
    }

    /// <summary>Registers a fresh user and returns a client that sends their bearer token.</summary>
    public async Task<HttpClient> CreateUserClientAsync(string? email = null, string password = "Passw0rd!")
    {
        var client = CreateClient();
        email ??= $"user-{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/auth/register", new { name = "Test User", email, password });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }
}
