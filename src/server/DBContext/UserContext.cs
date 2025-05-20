using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhoneBook.Models;
namespace PhoneBook.DBContext
{
    public class UserContext : DbContext
    {
       public UserContext(DbContextOptions<UserContext> options):base(options) {


        }
        public DbSet<User> Users { get; set; }
    }
}
