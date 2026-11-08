using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PhoneBook.Application.Groups;

namespace PhoneBook.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/groups")]
[Produces("application/json")]
public class GroupsController : ApiControllerBase
{
    private readonly IGroupService _groups;

    public GroupsController(IGroupService groups) => _groups = groups;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GroupDto>>> List(CancellationToken ct) =>
        Ok(await _groups.ListAsync(CurrentUserId, ct));

    [HttpPost]
    [ProducesResponseType<GroupDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDto>> Create(GroupInput input, CancellationToken ct)
    {
        var group = await _groups.CreateAsync(CurrentUserId, input, ct);
        return Created($"/api/groups/{group.Id}", group);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<GroupDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupDto>> Rename(int id, GroupInput input, CancellationToken ct) =>
        Ok(await _groups.RenameAsync(CurrentUserId, id, input, ct));

    /// <summary>Delete a group; its contacts stay, they just leave the group.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await _groups.DeleteAsync(CurrentUserId, id, ct);
        return NoContent();
    }
}
