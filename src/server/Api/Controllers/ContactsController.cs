using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PhoneBook.Application.Common;
using PhoneBook.Application.Contacts;

namespace PhoneBook.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/contacts")]
[Produces("application/json")]
public class ContactsController : ApiControllerBase
{
    private const string VCardContentType = "text/vcard";
    private const long MaxImportBytes = 5 * 1024 * 1024;

    private readonly IContactService _contacts;

    public ContactsController(IContactService contacts) => _contacts = contacts;

    /// <summary>Search, filter, sort and page the signed-in user's contacts.</summary>
    [HttpGet]
    public async Task<ActionResult<Paged<ContactSummary>>> Search([FromQuery] ContactQuery query, CancellationToken ct) =>
        Ok(await _contacts.SearchAsync(CurrentUserId, query, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<ContactDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContactDetail>> Get(int id, CancellationToken ct) =>
        Ok(await _contacts.GetAsync(CurrentUserId, id, ct));

    [HttpPost]
    [ProducesResponseType<ContactDetail>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ContactDetail>> Create(ContactInput input, CancellationToken ct)
    {
        var contact = await _contacts.CreateAsync(CurrentUserId, input, ct);
        return CreatedAtAction(nameof(Get), new { id = contact.Id }, contact);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<ContactDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContactDetail>> Update(int id, ContactInput input, CancellationToken ct) =>
        Ok(await _contacts.UpdateAsync(CurrentUserId, id, input, ct));

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await _contacts.DeleteAsync(CurrentUserId, id, ct);
        return NoContent();
    }

    [HttpPut("{id:int}/favourite")]
    [ProducesResponseType<ContactDetail>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContactDetail>> SetFavourite(int id, FavouriteInput input, CancellationToken ct) =>
        Ok(await _contacts.SetFavouriteAsync(CurrentUserId, id, input.IsFavourite, ct));

    /// <summary>Download contacts as one vCard 3.0 file (optionally only a group, or a comma-separated list of ids).</summary>
    [HttpGet("export")]
    [Produces(VCardContentType)]
    public async Task<IActionResult> Export([FromQuery] int? groupId, [FromQuery] string? ids, CancellationToken ct)
    {
        var idList = ParseIds(ids);
        var vcf = await _contacts.ExportAsync(CurrentUserId, groupId, idList, ct);
        return File(Encoding.UTF8.GetBytes(vcf), VCardContentType, "contacts.vcf");
    }

    /// <summary>Download one contact as a vCard.</summary>
    [HttpGet("{id:int}/vcard")]
    [Produces(VCardContentType)]
    public async Task<IActionResult> ExportOne(int id, CancellationToken ct)
    {
        var card = await _contacts.ExportOneAsync(CurrentUserId, id, ct);
        return File(Encoding.UTF8.GetBytes(card.Content), VCardContentType, card.FileName);
    }

    /// <summary>Import a .vcf file. All-or-nothing: if any card is invalid nothing is imported (400 with every problem).</summary>
    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxImportBytes + 64 * 1024)]
    [ProducesResponseType<ImportResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ImportResult>> Import(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw new ValidationException("File", "Choose a .vcf file to import.");
        if (file.Length > MaxImportBytes)
            throw new ValidationException("File", "The file is larger than 5 MB.");

        await using var stream = file.OpenReadStream();
        return Ok(await _contacts.ImportAsync(CurrentUserId, stream, ct));
    }

    private static IReadOnlyCollection<int>? ParseIds(string? ids)
    {
        if (string.IsNullOrWhiteSpace(ids)) return null;
        var result = new List<int>();
        foreach (var part in ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!int.TryParse(part, out var id))
                throw new ValidationException("Ids", "ids must be a comma-separated list of numbers.");
            result.Add(id);
        }
        return result;
    }
}
