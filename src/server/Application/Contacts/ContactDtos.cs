using System.ComponentModel.DataAnnotations;
using PhoneBook.Domain;

namespace PhoneBook.Application.Contacts;

public record GroupRef(int Id, string Name);
public record PhoneDto(int Id, string Label, string Number);

public record ContactSummary(
    int Id, string FirstName, string? LastName, string DisplayName, string? Company, bool IsFavourite,
    string? PrimaryPhone, string? Email, IReadOnlyList<GroupRef> Groups, DateTime UpdatedAt);

public record ContactDetail(
    int Id, string FirstName, string? LastName, string DisplayName, string? Company, bool IsFavourite,
    string? PrimaryPhone, string? Email, IReadOnlyList<GroupRef> Groups, DateTime UpdatedAt,
    string? Notes, IReadOnlyList<PhoneDto> Phones, DateTime CreatedAt);

public class PhoneInput
{
    [Required, RegularExpression("^(Mobile|Home|Work|Other)$", ErrorMessage = "Label must be Mobile, Home, Work or Other.")]
    public string Label { get; set; } = "Mobile";

    [Required, StringLength(25, MinimumLength = 5)]
    public string Number { get; set; } = string.Empty;
}

public class ContactInput : IValidatableObject
{
    [Required, StringLength(80)]
    public string FirstName { get; set; } = string.Empty;

    [StringLength(80)]
    public string? LastName { get; set; }

    [StringLength(120)]
    public string? Company { get; set; }

    [EmailAddress, StringLength(200)]
    public string? Email { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }

    public bool IsFavourite { get; set; }

    [Required, MinLength(1, ErrorMessage = "Add at least one phone number.")]
    public List<PhoneInput> Phones { get; set; } = new();

    public List<int> GroupIds { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var duplicates = Phones.GroupBy(p => Phone.Normalize(p.Number)).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        if (duplicates.Count > 0)
            yield return new ValidationResult("The same number is listed more than once.", new[] { nameof(Phones) });
    }
}

public class FavouriteInput
{
    public bool IsFavourite { get; set; }
}

public class ContactQuery
{
    [StringLength(100)] public string? Q { get; set; }
    public int? GroupId { get; set; }
    public bool? Favourites { get; set; }
    [Range(1, int.MaxValue)] public int Page { get; set; } = 1;
    [Range(1, 200)] public int PageSize { get; set; } = 50;
    /// <summary>name (default) | recent</summary>
    public string Sort { get; set; } = "name";
}

public record Paged<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(Total / (double)PageSize);
}

public record ImportResult(int Imported, int Skipped, IReadOnlyList<string> Errors);
