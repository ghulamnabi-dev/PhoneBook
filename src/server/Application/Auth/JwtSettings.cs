namespace PhoneBook.Application.Auth;

/// <summary>Bound from the "Jwt" configuration section and validated at startup.</summary>
public sealed class JwtSettings
{
    public const string SectionName = "Jwt";
    public const int MinimumSecretLength = 32;

    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "PhoneBook.Api";
    public string Audience { get; set; } = "PhoneBook.Client";
    public int ExpiryHours { get; set; } = 8;

    /// <summary>Fail fast: a missing or short signing key must never fall back to a default.</summary>
    public void EnsureValid()
    {
        if (string.IsNullOrWhiteSpace(Secret) || Secret.Length < MinimumSecretLength)
        {
            throw new InvalidOperationException(
                $"Jwt:Secret is missing or shorter than {MinimumSecretLength} characters. " +
                "Set it with `dotnet user-secrets set Jwt:Secret <value>` or the Jwt__Secret environment variable " +
                "(appsettings.Development.json carries a dev-only value).");
        }
        if (string.IsNullOrWhiteSpace(Issuer) || string.IsNullOrWhiteSpace(Audience))
            throw new InvalidOperationException("Jwt:Issuer and Jwt:Audience must be configured.");
        if (ExpiryHours <= 0)
            throw new InvalidOperationException("Jwt:ExpiryHours must be a positive number of hours.");
    }
}
