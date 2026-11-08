using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace PhoneBook.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>The signed-in user's id from the JWT "sub" claim (inbound claim mapping is off, so it stays "sub").</summary>
    protected int CurrentUserId =>
        int.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id)
            ? id
            : throw new UnauthorizedAccessException("The access token does not identify a user.");
}
