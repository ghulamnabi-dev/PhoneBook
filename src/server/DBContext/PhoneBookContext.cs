using Microsoft.EntityFrameworkCore;
using PhoneBook.Models;
namespace PhoneBook.DBContext
{
    public class PhoneBookContext:DbContext
    {
       public PhoneBookContext(DbContextOptions options) : base(options)
        {
        }

         public DbSet<Contact> Contacts { get; set; }
        public DbSet<User> Users { get; set; }

    }
}
