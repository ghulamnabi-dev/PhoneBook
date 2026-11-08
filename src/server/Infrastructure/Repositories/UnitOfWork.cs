using Microsoft.EntityFrameworkCore.Storage;
using PhoneBook.Domain;
using PhoneBook.Infrastructure.Persistence;

namespace PhoneBook.Infrastructure.Repositories;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly PhoneBookDbContext _db;
    private IDbContextTransaction? _transaction;

    private IRepository<User>? _users;
    private IRepository<Contact>? _contacts;
    private IRepository<Group>? _groups;
    private IRepository<PhoneNumber>? _phones;
    private IRepository<ContactGroup>? _contactGroups;

    public UnitOfWork(PhoneBookDbContext db)
    {
        _db = db;
    }

    // Repositories are created lazily and share this unit's DbContext, so they share one change tracker.
    public IRepository<User> Users => _users ??= new EfRepository<User>(_db);
    public IRepository<Contact> Contacts => _contacts ??= new EfRepository<Contact>(_db);
    public IRepository<Group> Groups => _groups ??= new EfRepository<Group>(_db);
    public IRepository<PhoneNumber> PhoneNumbers => _phones ??= new EfRepository<PhoneNumber>(_db);
    public IRepository<ContactGroup> ContactGroups => _contactGroups ??= new EfRepository<ContactGroup>(_db);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction != null) throw new InvalidOperationException("A transaction is already open.");
        _transaction = await _db.Database.BeginTransactionAsync(ct);
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_transaction == null) throw new InvalidOperationException("No transaction to commit.");
        await _db.SaveChangesAsync(ct);
        await _transaction.CommitAsync(ct);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public async Task RollbackAsync(CancellationToken ct = default)
    {
        if (_transaction == null) return;
        await _transaction.RollbackAsync(ct);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public async ValueTask DisposeAsync()
    {
        if (_transaction != null) await _transaction.DisposeAsync();
    }
}
