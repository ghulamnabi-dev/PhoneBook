using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using PhoneBook.Application.Auth;

namespace PhoneBook.Tests.Integration;

public class AuthApiTests : IClassFixture<PhoneBookApiFactory>
{
    private readonly PhoneBookApiFactory _factory;

    public AuthApiTests(PhoneBookApiFactory factory) => _factory = factory;

    private static string NewEmail() => $"auth-{Guid.NewGuid():N}@example.com";

    [Fact]
    public async Task Register_returns_a_token_with_sub_email_and_name_claims()
    {
        var client = _factory.CreateClient();
        var email = NewEmail();

        var response = await client.PostAsJsonAsync("/api/auth/register", new { name = "Ayesha", email, password = "Passw0rd!" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        auth!.Token.Should().NotBeNullOrWhiteSpace();
        auth.Name.Should().Be("Ayesha");
        auth.Email.Should().Be(email);
        auth.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(8), TimeSpan.FromMinutes(2));

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(auth.Token);
        jwt.Claims.Should().Contain(c => c.Type == "sub");
        jwt.Claims.Should().Contain(c => c.Type == "email" && c.Value == email);
        jwt.Claims.Should().Contain(c => c.Type == "name" && c.Value == "Ayesha");
        jwt.Header.Alg.Should().Be("HS256");
    }

    [Fact]
    public async Task Register_with_an_existing_email_is_409()
    {
        var client = _factory.CreateClient();
        var email = NewEmail();
        (await client.PostAsJsonAsync("/api/auth/register", new { name = "One", email, password = "Passw0rd!" })).EnsureSuccessStatusCode();

        var again = await client.PostAsJsonAsync("/api/auth/register", new { name = "Two", email = email.ToUpperInvariant(), password = "Passw0rd!" });

        again.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await again.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("status").GetInt32().Should().Be(409);
    }

    [Fact]
    public async Task Register_with_a_short_password_is_400_validation_problem()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new { name = "Short", email = NewEmail(), password = "1234567" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").TryGetProperty("Password", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Login_with_wrong_password_or_unknown_email_is_401_with_the_same_message()
    {
        var client = _factory.CreateClient();
        var email = NewEmail();
        (await client.PostAsJsonAsync("/api/auth/register", new { name = "Bilal", email, password = "Passw0rd!" })).EnsureSuccessStatusCode();

        var wrongPassword = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "not-the-password" });
        var unknownEmail = await client.PostAsJsonAsync("/api/auth/login", new { email = NewEmail(), password = "Passw0rd!" });

        wrongPassword.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        unknownEmail.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var a = await wrongPassword.Content.ReadFromJsonAsync<JsonElement>();
        var b = await unknownEmail.Content.ReadFromJsonAsync<JsonElement>();
        a.GetProperty("detail").GetString().Should().Be(b.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Login_then_me_returns_the_user()
    {
        var client = _factory.CreateClient();
        var email = NewEmail();
        (await client.PostAsJsonAsync("/api/auth/register", new { name = "Chand", email, password = "Passw0rd!" })).EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Passw0rd!" });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        var me = await client.GetFromJsonAsync<UserDto>("/api/auth/me");

        me!.Name.Should().Be("Chand");
        me.Email.Should().Be(email);
        me.Id.Should().BePositive();
    }

    [Fact]
    public async Task Protected_endpoints_require_a_token()
    {
        var client = _factory.CreateClient();

        (await client.GetAsync("/api/contacts")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.GetAsync("/api/groups")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Health_is_200_Healthy()
    {
        var response = await _factory.CreateClient().GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).Should().Be("Healthy");
    }
}
