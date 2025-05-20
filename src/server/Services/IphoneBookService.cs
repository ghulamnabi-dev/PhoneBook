using PhoneBook.Models;

namespace PhoneBook.Services
{
    public interface IphoneBookService
    {
        public  Task<List<Contact>> GetContacts();
        public  Task<Contact> GetContact(int id);
        public  Task<Contact> AddContact(Contact contact);
        public  Task<Contact> UpdateContact(Contact contact);
        public  Task<bool> DeleteContact(int id);
    }
}
