using PhoneBook.DBContext;
using PhoneBook.Repositories;
namespace PhoneBook
{
    public class UnitOfWork
    {
        public PhoneBookRepository phoneBookRepository;
        readonly PhoneBookContext context;
        public UnitOfWork(PhoneBookRepository _phoneBookRepository,PhoneBookContext _context)
        {
            this.phoneBookRepository = _phoneBookRepository;
            this.context = _context;

        }

        public async Task<bool> SaveChange() {

            await context.SaveChangesAsync();
            return true;
        }
    }
}
