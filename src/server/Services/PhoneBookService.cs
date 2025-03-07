
using PhoneBook.Models;

namespace PhoneBook.Services
{
    public class PhoneBookService
    {
        readonly UnitOfWork unitofwork;
        Contact _contact;
        public PhoneBookService(UnitOfWork _unitofwork) {
            unitofwork = _unitofwork;
        }
     
        public async Task<List<Contact>> GetContacts()
        {

            return await unitofwork.phoneBookRepository.GetContacts();
        }
        
        public async Task<Contact> GetContact(int id)
        {
            return await unitofwork.phoneBookRepository.GetContact(id);

        }
        
        public async Task<Contact> AddContact(Contact contact)
        {
            
            
           this._contact= await unitofwork.phoneBookRepository.AddContact(contact);
            await unitofwork.SaveChange();
            return _contact;
        }
       
        public async Task<Contact> UpdateContact(Contact contact)
        {
            this._contact=await unitofwork.phoneBookRepository.UpdateContact(contact);
            await unitofwork.SaveChange();
            return _contact;
        }
       
        public async Task<bool> DeleteContact(int id)
        {
             await unitofwork.phoneBookRepository.DeleteContact(id);
            return await unitofwork.SaveChange();
        }
    



}
}
