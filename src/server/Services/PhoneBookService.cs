
using Microsoft.EntityFrameworkCore;
using PhoneBook.DBContext;
using PhoneBook.Models;

namespace PhoneBook.Services
{
    public class PhoneBookService
    {
        readonly PhoneBookContext context;
        public PhoneBookService(PhoneBookContext _context) {
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
            if (findcontact != null)
            {
                return findcontact;
            }
            else
            {
                return null;
            }
        }
        
        public async Task<Contact> AddContact(Contact contact)
        {
            context.Contacts.Add(contact);
            await context.SaveChangesAsync();
            return contact;
        }
       
        public async Task<Contact> UpdateContact(Contact contact)
        {
            Contact EditContact = await context.Contacts.FindAsync(contact.id);
            if (EditContact != null)
            {
                EditContact.Name = contact.Name;
                EditContact.Phone = contact.Phone;
                EditContact.Country_code = contact.Country_code;
                await context.SaveChangesAsync();
                return EditContact;
            }
            else
            {
                return null;
            }

        }
       
        public async Task<bool> DeleteContact(int id)
        {
            Contact todelcontact = await context.Contacts.FindAsync(id);
            if (todelcontact != null)
            {
                context.Contacts.Remove(todelcontact);
                await context.SaveChangesAsync();
                return true;
            }
            else
            {
                return false;
            }

        }
    



}
}
