using System.ComponentModel.DataAnnotations;

namespace PhoneBook.Application.Groups;

/// <summary>Contract: <c>{ id, name, contactCount }</c>.</summary>
public record GroupDto(int Id, string Name, int ContactCount);

public class GroupInput
{
    [Required, StringLength(60, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}
