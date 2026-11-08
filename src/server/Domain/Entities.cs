namespace PhoneBook.Domain;

/// <summary>An account. Passwords are stored as PBKDF2 hashes produced by ASP.NET Core's PasswordHasher.</summary>
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
    public ICollection<Group> Groups { get; set; } = new List<Group>();
}

public class Contact
{
    public int Id { get; set; }
    public int OwnerId { get; set; }
    public User? Owner { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? Company { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public bool IsFavourite { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PhoneNumber> Phones { get; set; } = new List<PhoneNumber>();
    public ICollection<ContactGroup> ContactGroups { get; set; } = new List<ContactGroup>();

    public string DisplayName => string.IsNullOrWhiteSpace(LastName) ? FirstName : $"{FirstName} {LastName}";
}

public enum PhoneLabel { Mobile, Home, Work, Other }

public class PhoneNumber
{
    public int Id { get; set; }
    public int ContactId { get; set; }
    public Contact? Contact { get; set; }
    public PhoneLabel Label { get; set; } = PhoneLabel.Mobile;
    public string Number { get; set; } = string.Empty;
    /// <summary>Digits only, for search ("0300 123-4567" → "03001234567").</summary>
    public string NormalizedNumber { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class Group
{
    public int Id { get; set; }
    public int OwnerId { get; set; }
    public User? Owner { get; set; }
    public string Name { get; set; } = string.Empty;
    public ICollection<ContactGroup> ContactGroups { get; set; } = new List<ContactGroup>();
}

/// <summary>Many-to-many join between contacts and groups.</summary>
public class ContactGroup
{
    public int ContactId { get; set; }
    public Contact? Contact { get; set; }
    public int GroupId { get; set; }
    public Group? Group { get; set; }
}

public static class Phone
{
    /// <summary>Keep digits (and a leading +) so "+92 300-1234567" and "0300 1234567" search alike.</summary>
    public static string Normalize(string number)
    {
        var digits = new string(number.Where(char.IsDigit).ToArray());
        return number.TrimStart().StartsWith('+') ? "+" + digits : digits;
    }
}
