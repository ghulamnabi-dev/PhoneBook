using System.ComponentModel.DataAnnotations;

namespace PhoneBook.Application.Auth;

public class RegisterRequest
{
    [Required, StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Contract: <c>{ token, name, email, expiresAt }</c>.</summary>
public record AuthResponse(string Token, string Name, string Email, DateTime ExpiresAt);

/// <summary>Contract: <c>GET /auth/me → { id, name, email }</c>.</summary>
public record UserDto(int Id, string Name, string Email);
