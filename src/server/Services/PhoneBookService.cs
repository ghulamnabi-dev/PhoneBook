
using PhoneBook.Repositories;
using PhoneBook.Models;

namespace PhoneBook.Services
{
    public class PhoneBookService
    {
        readonly PhoneBookRepository repository;
        public PhoneBookService(PhoneBookRepository _repository) {
            repository = _repository;
        }
     
        public async Task<List<Contact>> GetContacts()
        {
             
            return await repository.GetContacts();
        }
        
        public async Task<Contact> GetContact(int id)
        {
            return await repository.GetContact(id);
            
        }
        
        public async Task<Contact> AddContact(Contact contact)
        {
            
            
            return await repository.AddContact(contact);
        }
       
        public async Task<Contact> UpdateContact(Contact contact)
        {
            return await repository.UpdateContact(contact);

        }
       
        public async Task<bool> DeleteContact(int id)
        {
            return await repository.DeleteContact(id);

        }
    



}
}
