using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PhoneBook.Domain;
using PhoneBook.Infrastructure.Persistence;
using PhoneBook.Infrastructure.Repositories;

namespace PhoneBook.Tests.Unit;

/// <summary>Runs the real UnitOfWork against SQLite in-memory; the open connection keeps the database alive.</summary>
public sealed class UnitOfWorkTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<PhoneBookDbContext> _options;

    public UnitOfWorkTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<PhoneBookDbContext>().UseSqlite(_connection).Options;
        using var db = new PhoneBookDbContext(_options);
        db.Database.EnsureCreated();
    }

    public void Dispose() => _connection.Dispose();

    /// <summary>Counts rows through a fresh context, i.e. what is really in the database.</summary>
    private int CountInDatabase<T>() where T : class
    {
        using var db = new PhoneBookDbContext(_options);
        return db.Set<T>().Count();
    }

    private static User NewUser(string email = "a@example.com") => new() { Name = "A", Email = email, PasswordHash = "x" };

    [Fact]
    public async Task Repositories_only_stage_changes_until_SaveChangesAsync()
    {
        await using var db = new PhoneBookDbContext(_options);
        await using var uow = new UnitOfWork(db);

        var user = NewUser();
        uow.Users.Add(user);
        uow.Contacts.Add(new Contact { Owner = user, FirstName = "Staged", Phones = { new PhoneNumber { Number = "0300 1234567", NormalizedNumber = "03001234567" } } });

        CountInDatabase<User>().Should().Be(0);
        CountInDatabase<Contact>().Should().Be(0);

        var written = await uow.SaveChangesAsync();

        written.Should().Be(3);
        CountInDatabase<User>().Should().Be(1);
        CountInDatabase<Contact>().Should().Be(1);
        CountInDatabase<PhoneNumber>().Should().Be(1);
    }

    [Fact]
    public async Task Rolled_back_transaction_leaves_no_rows_even_after_SaveChangesAsync()
    {
        await using (var db = new PhoneBookDbContext(_options))
        await using (var uow = new UnitOfWork(db))
        {
            await uow.BeginTransactionAsync();
            uow.Users.Add(NewUser());
            await uow.SaveChangesAsync();          // flushed inside the transaction...
            uow.Users.Add(NewUser("b@example.com"));
            await uow.SaveChangesAsync();
            await uow.RollbackAsync();             // ...and undone
        }

        CountInDatabase<User>().Should().Be(0);
    }

    [Fact]
    public async Task Committed_transaction_persists_all_steps()
    {
        await using (var db = new PhoneBookDbContext(_options))
        await using (var uow = new UnitOfWork(db))
        {
            await uow.BeginTransactionAsync();
            uow.Users.Add(NewUser());
            await uow.SaveChangesAsync();
            uow.Users.Add(NewUser("b@example.com"));  // flushed by CommitAsync
            await uow.CommitAsync();
        }

        CountInDatabase<User>().Should().Be(2);
    }

    [Fact]
    public async Task Disposing_without_commit_discards_the_transaction()
    {
        await using (var db = new PhoneBookDbContext(_options))
        await using (var uow = new UnitOfWork(db))
        {
            await uow.BeginTransactionAsync();
            uow.Users.Add(NewUser());
            await uow.SaveChangesAsync();
        }

        CountInDatabase<User>().Should().Be(0);
    }

    [Fact]
    public async Task Only_one_transaction_can_be_open()
    {
        await using var db = new PhoneBookDbContext(_options);
        await using var uow = new UnitOfWork(db);
        await uow.BeginTransactionAsync();

        var second = () => uow.BeginTransactionAsync();

        await second.Should().ThrowAsync<InvalidOperationException>();
        await uow.RollbackAsync();
    }
}
