using PhoneBook.Models;

namespace PhoneBook.Repositories
{
    public interface IphonebookRepository
    {
        public  Task<List<Contact>> GetContacts();
        public Task<Contact> GetContact(int id);
        public Task<Contact> AddContact(Contact contact);
        public Task DeleteContact(Contact contact);
    }
}
