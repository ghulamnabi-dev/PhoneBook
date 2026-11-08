using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using PhoneBook.Application.Common;

namespace PhoneBook.Api.Errors;

/// <summary>
/// Maps the Application layer's exceptions to RFC 7807 responses. Anything else falls through to the default
/// handler (500 ProblemDetails, details only in Development).
/// </summary>
public sealed class AppExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetails;

    public AppExceptionHandler(IProblemDetailsService problemDetails) => _problemDetails = problemDetails;

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ProblemDetails? problem = exception switch
        {
            ValidationException v => new ValidationProblemDetails(v.Errors.ToDictionary(kv => kv.Key, kv => kv.Value))
            {
                Title = v.Message,
                Status = StatusCodes.Status400BadRequest,
            },
            NotFoundException => Problem(StatusCodes.Status404NotFound, "Not found", exception.Message),
            ConflictException => Problem(StatusCodes.Status409Conflict, "Conflict", exception.Message),
            AuthenticationFailedException => Problem(StatusCodes.Status401Unauthorized, "Unauthorized", exception.Message),
            UnauthorizedAccessException => Problem(StatusCodes.Status401Unauthorized, "Unauthorized", exception.Message),
            _ => null,
        };
        if (problem is null) return false;

        httpContext.Response.StatusCode = problem.Status!.Value;
        var written = await _problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
        if (!written)
            await httpContext.Response.WriteAsJsonAsync(problem, problem.GetType(), options: null, contentType: "application/problem+json", cancellationToken);
        return true;
    }

    private static ProblemDetails Problem(int status, string title, string detail) =>
        new() { Status = status, Title = title, Detail = detail };
}
