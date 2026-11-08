using System.Linq.Expressions;

namespace PhoneBook.Infrastructure.Repositories;

/// <summary>
/// Generic repository: a thin, intention-revealing wrapper over a DbSet.
/// It never calls SaveChanges — persisting is the Unit of Work's job, so a service can
/// touch several repositories and commit them together (or not at all).
/// </summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
    /// <summary>Composable query for anything the simple methods don't cover (includes, paging, projections).</summary>
    IQueryable<T> Query();
    void Add(T entity);
    void AddRange(IEnumerable<T> entities);
    void Update(T entity);
    void Remove(T entity);
    void RemoveRange(IEnumerable<T> entities);
}
