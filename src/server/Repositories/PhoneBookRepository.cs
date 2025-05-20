using Microsoft.EntityFrameworkCore;
using PhoneBook.DBContext;
using PhoneBook.Models;

namespace PhoneBook.Repositories
{
    public class PhoneBookRepository:IphonebookRepository
    {
        readonly PhoneBookContext context;
        public PhoneBookRepository(PhoneBookContext _context)
        {
            context = _context;
        }

        public async Task<List<Contact>> GetContacts()
        {
            List<Contact> Contacts = await context.Contacts.ToListAsync();
            return Contacts;
        }

        public async Task<Contact> GetContact(int id)
        {
            Contact findcontact = await context.Contacts.FindAsync(id);
            return findcontact;
                      
        }

        public async Task<Contact> AddContact(Contact contact)
        {
            context.Contacts.Add(contact);
           
            return contact;
        }

        public async Task DeleteContact(Contact contact)
        {
                context.Contacts.Remove(contact);
        }


    }
}
