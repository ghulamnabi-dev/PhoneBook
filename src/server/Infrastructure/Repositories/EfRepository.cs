using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using PhoneBook.Infrastructure.Persistence;

namespace PhoneBook.Infrastructure.Repositories;

public class EfRepository<T> : IRepository<T> where T : class
{
    protected readonly PhoneBookDbContext Db;
    protected readonly DbSet<T> Set;

    public EfRepository(PhoneBookDbContext db)
    {
        Db = db;
        Set = db.Set<T>();
    }

    public Task<T?> GetByIdAsync(int id, CancellationToken ct = default) => Set.FindAsync(new object[] { id }, ct).AsTask();

    public Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default) => Set.FirstOrDefaultAsync(predicate, ct);

    public Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default) =>
        (predicate == null ? Set : Set.Where(predicate)).ToListAsync(ct);

    public Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default) => Set.AnyAsync(predicate, ct);

    public Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default) =>
        predicate == null ? Set.CountAsync(ct) : Set.CountAsync(predicate, ct);

    public IQueryable<T> Query() => Set.AsQueryable();

    public void Add(T entity) => Set.Add(entity);
    public void AddRange(IEnumerable<T> entities) => Set.AddRange(entities);
    public void Update(T entity) => Set.Update(entity);
    public void Remove(T entity) => Set.Remove(entity);
    public void RemoveRange(IEnumerable<T> entities) => Set.RemoveRange(entities);
}
