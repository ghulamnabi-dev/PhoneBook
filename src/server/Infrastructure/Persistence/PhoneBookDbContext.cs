using Microsoft.EntityFrameworkCore;
using PhoneBook.Domain;

namespace PhoneBook.Infrastructure.Persistence;

public class PhoneBookDbContext : DbContext
{
    public PhoneBookDbContext(DbContextOptions<PhoneBookDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<PhoneNumber> PhoneNumbers => Set<PhoneNumber>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<ContactGroup> ContactGroups => Set<ContactGroup>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Email).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
        });

        b.Entity<Contact>(e =>
        {
            e.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
            e.Property(x => x.LastName).HasMaxLength(80);
            e.Property(x => x.Company).HasMaxLength(120);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Notes).HasMaxLength(2000);
            e.HasIndex(x => new { x.OwnerId, x.LastName, x.FirstName });
            e.HasOne(x => x.Owner).WithMany(u => u.Contacts).HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Phones).WithOne(p => p.Contact).HasForeignKey(p => p.ContactId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.DisplayName);
        });

        b.Entity<PhoneNumber>(e =>
        {
            e.Property(x => x.Number).HasMaxLength(25).IsRequired();
            e.Property(x => x.NormalizedNumber).HasMaxLength(25).IsRequired();
            e.Property(x => x.Label).HasConversion<string>().HasMaxLength(10);
            e.HasIndex(x => x.NormalizedNumber);
        });

        b.Entity<Group>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(60).IsRequired();
            e.HasIndex(x => new { x.OwnerId, x.Name }).IsUnique();
            e.HasOne(x => x.Owner).WithMany(u => u.Groups).HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ContactGroup>(e =>
        {
            e.HasKey(x => new { x.ContactId, x.GroupId });
            e.HasOne(x => x.Contact).WithMany(c => c.ContactGroups).HasForeignKey(x => x.ContactId).OnDelete(DeleteBehavior.Cascade);
            // No cascade from Group: deleting a group must not delete contacts, and SQL Server rejects multiple cascade paths.
            e.HasOne(x => x.Group).WithMany(g => g.ContactGroups).HasForeignKey(x => x.GroupId).OnDelete(DeleteBehavior.ClientCascade);
        });
    }
}
