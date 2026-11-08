using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PhoneBook.Application.Common;
using PhoneBook.Domain;
using PhoneBook.Infrastructure.Repositories;

namespace PhoneBook.Application.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<UserDto> MeAsync(int userId, CancellationToken ct = default);
}

public sealed class AuthService : IAuthService
{
    private const string InvalidCredentials = "Invalid e-mail or password.";

    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtSettings _jwt;

    // Verifying against a real hash when the e-mail is unknown keeps response time similar for both failure cases.
    private static readonly Lazy<string> DummyHash = new(() => new PasswordHasher<User>().HashPassword(new User(), Guid.NewGuid().ToString()));

    public AuthService(IUnitOfWork uow, IPasswordHasher<User> hasher, IOptions<JwtSettings> jwt)
    {
        _uow = uow;
        _hasher = hasher;
        _jwt = jwt.Value;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = NormalizeEmail(request.Email);
        if (await _uow.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException("An account with this e-mail already exists.");

        var user = new User { Name = request.Name.Trim(), Email = email, CreatedAt = DateTime.UtcNow };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        _uow.Users.Add(user);
        await _uow.SaveChangesAsync(ct);

        return IssueToken(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = NormalizeEmail(request.Email);
        var user = await _uow.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null)
        {
            _hasher.VerifyHashedPassword(new User(), DummyHash.Value, request.Password);
            throw new AuthenticationFailedException(InvalidCredentials);
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new AuthenticationFailedException(InvalidCredentials);

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, request.Password);
            await _uow.SaveChangesAsync(ct);
        }

        return IssueToken(user);
    }

    public async Task<UserDto> MeAsync(int userId, CancellationToken ct = default)
    {
        var user = await _uow.Users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("User not found.");
        return new UserDto(user.Id, user.Name, user.Email);
    }

    private AuthResponse IssueToken(User user)
    {
        var expires = DateTime.UtcNow.AddHours(_jwt.ExpiryHours);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(_jwt.Issuer, _jwt.Audience, claims, notBefore: DateTime.UtcNow, expires: expires, signingCredentials: credentials);

        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), user.Name, user.Email, expires);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
