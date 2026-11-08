using System.Text;
using Microsoft.EntityFrameworkCore;
using PhoneBook.Application.Common;
using PhoneBook.Application.VCard;
using PhoneBook.Domain;
using PhoneBook.Infrastructure.Repositories;

namespace PhoneBook.Application.Contacts;

/// <summary>A vCard ready to download.</summary>
public record VCardFile(string FileName, string Content);

/// <summary>
/// Every method takes the signed-in user's id and only ever touches that user's rows; a contact owned by someone
/// else is reported as 404, exactly like one that does not exist.
/// </summary>
public interface IContactService
{
    Task<Paged<ContactSummary>> SearchAsync(int ownerId, ContactQuery query, CancellationToken ct = default);
    Task<ContactDetail> GetAsync(int ownerId, int id, CancellationToken ct = default);
    Task<ContactDetail> CreateAsync(int ownerId, ContactInput input, CancellationToken ct = default);
    Task<ContactDetail> UpdateAsync(int ownerId, int id, ContactInput input, CancellationToken ct = default);
    Task DeleteAsync(int ownerId, int id, CancellationToken ct = default);
    Task<ContactDetail> SetFavouriteAsync(int ownerId, int id, bool isFavourite, CancellationToken ct = default);
    Task<string> ExportAsync(int ownerId, int? groupId = null, IReadOnlyCollection<int>? ids = null, CancellationToken ct = default);
    Task<VCardFile> ExportOneAsync(int ownerId, int id, CancellationToken ct = default);
    Task<ImportResult> ImportAsync(int ownerId, Stream vcf, CancellationToken ct = default);
}

public sealed class ContactService : IContactService
{
    private const int ImportBatchSize = 50;
    private static readonly System.ComponentModel.DataAnnotations.EmailAddressAttribute EmailValidator = new();

    private readonly IUnitOfWork _uow;

    public ContactService(IUnitOfWork uow) => _uow = uow;

    // -----------------------------------------------------------------------------------------------------------
    // Reads
    // -----------------------------------------------------------------------------------------------------------

    public async Task<Paged<ContactSummary>> SearchAsync(int ownerId, ContactQuery query, CancellationToken ct = default)
    {
        var contacts = _uow.Contacts.Query().AsNoTracking().Where(c => c.OwnerId == ownerId);

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim().ToLower();
            var digits = Phone.Normalize(term).TrimStart('+');
            if (digits.Length > 0)
            {
                // A locally dialled number ("0300 1234567") is stored internationally ("+92 300 1234567"):
                // also match with the trunk prefix dropped so both spellings find the contact.
                var trunkless = digits.Length > 1 && digits[0] == '0' ? digits[1..] : digits;
                contacts = contacts.Where(c =>
                    c.FirstName.ToLower().Contains(term) ||
                    (c.LastName != null && c.LastName.ToLower().Contains(term)) ||
                    (c.Company != null && c.Company.ToLower().Contains(term)) ||
                    (c.Email != null && c.Email.ToLower().Contains(term)) ||
                    c.Phones.Any(p => p.NormalizedNumber.Contains(digits) || p.NormalizedNumber.Contains(trunkless)));
            }
            else
            {
                contacts = contacts.Where(c =>
                    c.FirstName.ToLower().Contains(term) ||
                    (c.LastName != null && c.LastName.ToLower().Contains(term)) ||
                    (c.Company != null && c.Company.ToLower().Contains(term)) ||
                    (c.Email != null && c.Email.ToLower().Contains(term)));
            }
        }

        if (query.GroupId is int groupId)
            contacts = contacts.Where(c => c.ContactGroups.Any(cg => cg.GroupId == groupId));

        if (query.Favourites == true)
            contacts = contacts.Where(c => c.IsFavourite);

        var total = await contacts.CountAsync(ct);

        var page = await Sort(contacts, query.Sort)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Include(c => c.Phones)
            .Include(c => c.ContactGroups).ThenInclude(cg => cg.Group)
            .AsSplitQuery()
            .ToListAsync(ct);

        return new Paged<ContactSummary>(page.Select(ToSummary).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<ContactDetail> GetAsync(int ownerId, int id, CancellationToken ct = default)
    {
        var contact = await WithDetails(_uow.Contacts.Query().AsNoTracking())
            .FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == ownerId, ct)
            ?? throw NotFound(id);
        return ToDetail(contact);
    }

    // -----------------------------------------------------------------------------------------------------------
    // Writes — one SaveChangesAsync per use case
    // -----------------------------------------------------------------------------------------------------------

    public async Task<ContactDetail> CreateAsync(int ownerId, ContactInput input, CancellationToken ct = default)
    {
        var groupIds = await ValidateGroupsAsync(ownerId, input.GroupIds, ct);
        var now = DateTime.UtcNow;

        var contact = new Contact { OwnerId = ownerId, CreatedAt = now, UpdatedAt = now };
        Apply(contact, input);
        AddPhones(contact, input.Phones.Select(p => (ParseLabel(p.Label), p.Number)));
        foreach (var gid in groupIds) contact.ContactGroups.Add(new ContactGroup { GroupId = gid });

        _uow.Contacts.Add(contact);
        await _uow.SaveChangesAsync(ct);

        return await GetAsync(ownerId, contact.Id, ct);
    }

    public async Task<ContactDetail> UpdateAsync(int ownerId, int id, ContactInput input, CancellationToken ct = default)
    {
        var contact = await _uow.Contacts.Query()
            .Include(c => c.Phones)
            .Include(c => c.ContactGroups)
            .FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == ownerId, ct)
            ?? throw NotFound(id);

        var groupIds = await ValidateGroupsAsync(ownerId, input.GroupIds, ct);

        Apply(contact, input);
        contact.UpdatedAt = DateTime.UtcNow;

        // Phones: replace the whole set (order matters, so ids are not preserved).
        _uow.PhoneNumbers.RemoveRange(contact.Phones.ToList());
        var order = 0;
        foreach (var p in input.Phones)
        {
            _uow.PhoneNumbers.Add(new PhoneNumber
            {
                ContactId = contact.Id,
                Label = ParseLabel(p.Label),
                Number = p.Number.Trim(),
                NormalizedNumber = Phone.Normalize(p.Number),
                SortOrder = order++,
            });
        }

        // Groups: diff against the requested set so unchanged memberships are left alone.
        foreach (var membership in contact.ContactGroups.Where(cg => !groupIds.Contains(cg.GroupId)).ToList())
            _uow.ContactGroups.Remove(membership);
        var existing = contact.ContactGroups.Select(cg => cg.GroupId).ToHashSet();
        foreach (var gid in groupIds.Where(g => !existing.Contains(g)))
            _uow.ContactGroups.Add(new ContactGroup { ContactId = contact.Id, GroupId = gid });

        await _uow.SaveChangesAsync(ct);
        return await GetAsync(ownerId, id, ct);
    }

    public async Task DeleteAsync(int ownerId, int id, CancellationToken ct = default)
    {
        var contact = await FindOwnedAsync(ownerId, id, ct);
        _uow.Contacts.Remove(contact); // phones and memberships cascade in the database
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<ContactDetail> SetFavouriteAsync(int ownerId, int id, bool isFavourite, CancellationToken ct = default)
    {
        var contact = await FindOwnedAsync(ownerId, id, ct);
        if (contact.IsFavourite != isFavourite)
        {
            contact.IsFavourite = isFavourite;
            contact.UpdatedAt = DateTime.UtcNow;
            await _uow.SaveChangesAsync(ct);
        }
        return await GetAsync(ownerId, id, ct);
    }

    // -----------------------------------------------------------------------------------------------------------
    // vCard
    // -----------------------------------------------------------------------------------------------------------

    public async Task<string> ExportAsync(int ownerId, int? groupId = null, IReadOnlyCollection<int>? ids = null, CancellationToken ct = default)
    {
        var contacts = _uow.Contacts.Query().AsNoTracking().Where(c => c.OwnerId == ownerId);
        if (groupId is int gid) contacts = contacts.Where(c => c.ContactGroups.Any(cg => cg.GroupId == gid));
        if (ids is { Count: > 0 })
        {
            var idList = ids.Distinct().ToList();
            contacts = contacts.Where(c => idList.Contains(c.Id));
        }

        var list = await Sort(contacts, "name").Include(c => c.Phones).ToListAsync(ct);
        foreach (var c in list) NormalizeKinds(c);
        return VCardSerializer.Serialize(list);
    }

    public async Task<VCardFile> ExportOneAsync(int ownerId, int id, CancellationToken ct = default)
    {
        var contact = await _uow.Contacts.Query().AsNoTracking()
            .Include(c => c.Phones)
            .FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == ownerId, ct)
            ?? throw NotFound(id);
        NormalizeKinds(contact);
        return new VCardFile(FileNameFor(contact), VCardSerializer.Serialize(contact));
    }

    /// <summary>
    /// All-or-nothing: every card is staged and flushed inside one transaction; if any card is invalid (or the
    /// database rejects a batch) the transaction is rolled back and nothing is imported.
    /// </summary>
    public async Task<ImportResult> ImportAsync(int ownerId, Stream vcf, CancellationToken ct = default)
    {
        string text;
        using (var reader = new StreamReader(vcf, Encoding.UTF8, detectEncodingFromByteOrderMarks: true))
            text = await reader.ReadToEndAsync(ct);

        var entries = VCardSerializer.Parse(text);
        if (entries.Count == 0)
            throw new ValidationException("File", "The file does not contain any vCards (BEGIN:VCARD … END:VCARD).");

        var errors = new List<string>();
        int imported = 0, skipped = 0, pending = 0;
        var now = DateTime.UtcNow;

        await _uow.BeginTransactionAsync(ct);
        try
        {
            for (var i = 0; i < entries.Count; i++)
            {
                var entry = entries[i];
                if (string.IsNullOrWhiteSpace(entry.FirstName) && entry.Phones.Count == 0)
                {
                    skipped++;
                    continue;
                }

                var problems = Validate(entry);
                if (problems.Count > 0)
                {
                    var who = string.IsNullOrWhiteSpace(entry.FirstName) ? "" : $" ({Truncate(entry.FirstName, 40)})";
                    errors.AddRange(problems.Select(p => $"Card {i + 1}{who}: {p}"));
                    continue; // keep going so the user sees every problem at once
                }
                if (errors.Count > 0) continue; // already failing; no point writing more rows

                var contact = new Contact
                {
                    OwnerId = ownerId,
                    FirstName = entry.FirstName.Trim(),
                    LastName = Clean(entry.LastName),
                    Company = Clean(entry.Company),
                    Email = Clean(entry.Email),
                    Notes = string.IsNullOrWhiteSpace(entry.Notes) ? null : entry.Notes,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                AddPhones(contact, entry.Phones);
                _uow.Contacts.Add(contact);
                imported++;

                if (++pending >= ImportBatchSize)
                {
                    await _uow.SaveChangesAsync(ct);
                    pending = 0;
                }
            }

            if (errors.Count > 0)
            {
                await _uow.RollbackAsync(ct);
                throw new ValidationException(
                    new Dictionary<string, string[]> { ["File"] = errors.ToArray() },
                    "The import was cancelled; no contacts were imported.");
            }

            await _uow.CommitAsync(ct); // flushes the last batch, then commits
            return new ImportResult(imported, skipped, Array.Empty<string>());
        }
        catch (ValidationException)
        {
            throw;
        }
        catch
        {
            await _uow.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    // -----------------------------------------------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------------------------------------------

    private async Task<Contact> FindOwnedAsync(int ownerId, int id, CancellationToken ct) =>
        await _uow.Contacts.FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == ownerId, ct) ?? throw NotFound(id);

    private static NotFoundException NotFound(int id) => new($"Contact {id} was not found.");

    private async Task<HashSet<int>> ValidateGroupsAsync(int ownerId, IEnumerable<int>? requested, CancellationToken ct)
    {
        var ids = (requested ?? Enumerable.Empty<int>()).Distinct().ToList();
        if (ids.Count == 0) return new HashSet<int>();

        var owned = await _uow.Groups.CountAsync(g => g.OwnerId == ownerId && ids.Contains(g.Id), ct);
        if (owned != ids.Count)
            throw new ValidationException(nameof(ContactInput.GroupIds), "One or more groups do not exist.");
        return ids.ToHashSet();
    }

    private static IQueryable<Contact> WithDetails(IQueryable<Contact> q) =>
        q.Include(c => c.Phones).Include(c => c.ContactGroups).ThenInclude(cg => cg.Group).AsSplitQuery();

    private static IQueryable<Contact> Sort(IQueryable<Contact> q, string? sort) =>
        string.Equals(sort, "recent", StringComparison.OrdinalIgnoreCase)
            ? q.OrderByDescending(c => c.UpdatedAt).ThenByDescending(c => c.Id)
            : q.OrderBy(c => c.LastName == null || c.LastName == "" ? 1 : 0) // contacts without a last name go last
               .ThenBy(c => c.LastName!.ToLower())
               .ThenBy(c => c.FirstName.ToLower())
               .ThenBy(c => c.Id);

    private static void Apply(Contact contact, ContactInput input)
    {
        contact.FirstName = input.FirstName.Trim();
        contact.LastName = Clean(input.LastName);
        contact.Company = Clean(input.Company);
        contact.Email = Clean(input.Email);
        contact.Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes;
        contact.IsFavourite = input.IsFavourite;
    }

    private static void AddPhones(Contact contact, IEnumerable<(PhoneLabel Label, string Number)> phones)
    {
        var order = 0;
        var seen = new HashSet<string>();
        foreach (var (label, number) in phones)
        {
            var normalized = Phone.Normalize(number);
            if (!seen.Add(normalized)) continue;
            contact.Phones.Add(new PhoneNumber
            {
                Label = label,
                Number = number.Trim(),
                NormalizedNumber = normalized,
                SortOrder = order++,
            });
        }
    }

    /// <summary>Same limits as <see cref="ContactInput"/>, applied to a parsed card.</summary>
    private static List<string> Validate(VCardEntry e)
    {
        var problems = new List<string>();
        if (string.IsNullOrWhiteSpace(e.FirstName)) problems.Add("a name is required.");
        else if (e.FirstName.Trim().Length > 80) problems.Add("first name is longer than 80 characters.");
        if (e.LastName?.Trim().Length > 80) problems.Add("last name is longer than 80 characters.");
        if (e.Company?.Trim().Length > 120) problems.Add("company is longer than 120 characters.");
        if (!string.IsNullOrWhiteSpace(e.Email) && (e.Email.Trim().Length > 200 || !EmailValidator.IsValid(e.Email.Trim())))
            problems.Add($"\"{Truncate(e.Email, 60)}\" is not a valid e-mail address.");
        if (e.Notes?.Length > 2000) problems.Add("notes are longer than 2000 characters.");
        foreach (var (_, number) in e.Phones)
        {
            var n = number.Trim();
            if (n.Length < 5 || n.Length > 25) problems.Add($"phone number \"{Truncate(n, 30)}\" must be 5–25 characters.");
            else if (Phone.Normalize(n).TrimStart('+').Length == 0) problems.Add($"phone number \"{n}\" contains no digits.");
        }
        return problems;
    }

    private static PhoneLabel ParseLabel(string label) =>
        Enum.TryParse<PhoneLabel>(label, ignoreCase: true, out var parsed) ? parsed : PhoneLabel.Other;

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max] + "…";

    /// <summary>"firstname-lastname.vcf", keeping letters/digits of any script.</summary>
    private static string FileNameFor(Contact c)
    {
        var raw = string.IsNullOrWhiteSpace(c.LastName) ? c.FirstName : $"{c.FirstName}-{c.LastName}";
        var sb = new StringBuilder();
        foreach (var ch in raw.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }
        var name = sb.ToString().Trim('-');
        return (name.Length == 0 ? "contact" : name) + ".vcf";
    }

    /// <summary>SQLite hands DateTimes back as Unspecified; everything is stored as UTC, so say so.</summary>
    private static DateTime Utc(DateTime value) => value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static void NormalizeKinds(Contact c)
    {
        c.CreatedAt = Utc(c.CreatedAt);
        c.UpdatedAt = Utc(c.UpdatedAt);
    }

    private static IReadOnlyList<GroupRef> GroupsOf(Contact c) =>
        c.ContactGroups.Where(cg => cg.Group != null)
            .Select(cg => new GroupRef(cg.GroupId, cg.Group!.Name))
            .OrderBy(g => g.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static string? PrimaryPhone(Contact c) => c.Phones.OrderBy(p => p.SortOrder).Select(p => p.Number).FirstOrDefault();

    private static ContactSummary ToSummary(Contact c) => new(
        c.Id, c.FirstName, c.LastName, c.DisplayName, c.Company, c.IsFavourite,
        PrimaryPhone(c), c.Email, GroupsOf(c), Utc(c.UpdatedAt));

    private static ContactDetail ToDetail(Contact c) => new(
        c.Id, c.FirstName, c.LastName, c.DisplayName, c.Company, c.IsFavourite,
        PrimaryPhone(c), c.Email, GroupsOf(c), Utc(c.UpdatedAt),
        c.Notes,
        c.Phones.OrderBy(p => p.SortOrder).Select(p => new PhoneDto(p.Id, p.Label.ToString(), p.Number)).ToList(),
        Utc(c.CreatedAt));
}
