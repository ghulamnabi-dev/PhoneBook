namespace PhoneBook.Application.Common;

/// <summary>
/// Base for expected, client-caused failures. Services throw these; <c>AppExceptionHandler</c> turns them into
/// RFC 7807 ProblemDetails with the right status code, so controllers stay free of error plumbing.
/// </summary>
public abstract class AppException : Exception
{
    protected AppException(string message) : base(message) { }
}

/// <summary>404 — the resource does not exist <em>or belongs to another user</em> (never leak which).</summary>
public sealed class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message) { }
}

/// <summary>409 — duplicate e-mail on register, duplicate group name.</summary>
public sealed class ConflictException : AppException
{
    public ConflictException(string message) : base(message) { }
}

/// <summary>401 — bad credentials.</summary>
public sealed class AuthenticationFailedException : AppException
{
    public AuthenticationFailedException(string message) : base(message) { }
}

/// <summary>400 — business-rule validation that data annotations cannot express. Rendered as ValidationProblemDetails.</summary>
public sealed class ValidationException : AppException
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(string field, params string[] messages)
        : this(new Dictionary<string, string[]> { [field] = messages }) { }

    public ValidationException(IReadOnlyDictionary<string, string[]> errors, string message = "One or more fields are invalid.")
        : base(message)
    {
        Errors = errors;
    }
}
