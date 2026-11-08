using Microsoft.EntityFrameworkCore;
using PhoneBook.Application.Common;
using PhoneBook.Domain;
using PhoneBook.Infrastructure.Repositories;

namespace PhoneBook.Application.Groups;

public interface IGroupService
{
    Task<IReadOnlyList<GroupDto>> ListAsync(int ownerId, CancellationToken ct = default);
    Task<GroupDto> CreateAsync(int ownerId, GroupInput input, CancellationToken ct = default);
    Task<GroupDto> RenameAsync(int ownerId, int id, GroupInput input, CancellationToken ct = default);
    Task DeleteAsync(int ownerId, int id, CancellationToken ct = default);
}

public sealed class GroupService : IGroupService
{
    private readonly IUnitOfWork _uow;

    public GroupService(IUnitOfWork uow) => _uow = uow;

    public async Task<IReadOnlyList<GroupDto>> ListAsync(int ownerId, CancellationToken ct = default) =>
        await _uow.Groups.Query().AsNoTracking()
            .Where(g => g.OwnerId == ownerId)
            .OrderBy(g => g.Name)
            .Select(g => new GroupDto(g.Id, g.Name, g.ContactGroups.Count))
            .ToListAsync(ct);

    public async Task<GroupDto> CreateAsync(int ownerId, GroupInput input, CancellationToken ct = default)
    {
        var name = input.Name.Trim();
        await EnsureNameIsFreeAsync(ownerId, name, exceptId: null, ct);

        var group = new Group { OwnerId = ownerId, Name = name };
        _uow.Groups.Add(group);
        await _uow.SaveChangesAsync(ct);

        return new GroupDto(group.Id, group.Name, 0);
    }

    public async Task<GroupDto> RenameAsync(int ownerId, int id, GroupInput input, CancellationToken ct = default)
    {
        var group = await FindOwnedAsync(ownerId, id, ct);
        var name = input.Name.Trim();
        await EnsureNameIsFreeAsync(ownerId, name, exceptId: id, ct);

        group.Name = name;
        await _uow.SaveChangesAsync(ct);

        var count = await _uow.ContactGroups.CountAsync(cg => cg.GroupId == id, ct);
        return new GroupDto(group.Id, group.Name, count);
    }

    public async Task DeleteAsync(int ownerId, int id, CancellationToken ct = default)
    {
        var group = await FindOwnedAsync(ownerId, id, ct);

        // Contacts stay; only their membership rows go. Both deletes are committed by the single SaveChanges below.
        var memberships = await _uow.ContactGroups.ListAsync(cg => cg.GroupId == id, ct);
        _uow.ContactGroups.RemoveRange(memberships);
        _uow.Groups.Remove(group);
        await _uow.SaveChangesAsync(ct);
    }

    private async Task<Group> FindOwnedAsync(int ownerId, int id, CancellationToken ct) =>
        await _uow.Groups.FirstOrDefaultAsync(g => g.Id == id && g.OwnerId == ownerId, ct)
        ?? throw new NotFoundException($"Group {id} was not found.");

    private async Task EnsureNameIsFreeAsync(int ownerId, string name, int? exceptId, CancellationToken ct)
    {
        var lowered = name.ToLower();
        var taken = await _uow.Groups.AnyAsync(g => g.OwnerId == ownerId && g.Name.ToLower() == lowered && (exceptId == null || g.Id != exceptId), ct);
        if (taken) throw new ConflictException($"A group named \"{name}\" already exists.");
    }
}
