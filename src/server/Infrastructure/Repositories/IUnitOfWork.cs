using PhoneBook.Domain;

namespace PhoneBook.Infrastructure.Repositories;

/// <summary>
/// One business operation = one unit of work. Repositories stage changes; this commits them.
/// <see cref="BeginTransactionAsync"/> is for operations that span several SaveChanges calls
/// and must be all-or-nothing (the vCard import).
/// </summary>
public interface IUnitOfWork : IAsyncDisposable
{
    IRepository<User> Users { get; }
    IRepository<Contact> Contacts { get; }
    IRepository<Group> Groups { get; }
    IRepository<PhoneNumber> PhoneNumbers { get; }
    IRepository<ContactGroup> ContactGroups { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);

    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
