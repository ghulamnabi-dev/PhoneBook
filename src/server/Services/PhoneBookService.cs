
using PhoneBook.Models;
using System.Runtime.CompilerServices;

namespace PhoneBook.Services
{
    public class PhoneBookService:IphoneBookService
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
        { var contact = await unitofwork.phoneBookRepository.GetContact(id);
                     
                return contact;
        }
        
        public async Task<Contact> AddContact(Contact contact)
        {
            
            
           this._contact= await unitofwork.phoneBookRepository.AddContact(contact);
            await unitofwork.SaveChange();
            return _contact;
        }
       
        public async Task<Contact> UpdateContact(Contact contact)
        {
            Contact EditContact = await unitofwork.phoneBookRepository.GetContact(contact.id);
           
            if (EditContact != null)
            {

                EditContact.Name = contact.Name;
                EditContact.Phone = contact.Phone;
                EditContact.Country_code = contact.Country_code;
                await unitofwork.SaveChange();
                return EditContact;
            }
            else
            {
                return null;
            }
            
        }
       
        public async Task<bool> DeleteContact(int id)
        {
            Contact todelcontact = await unitofwork.phoneBookRepository.GetContact(id);
            if (todelcontact != null)
            {
                await unitofwork.phoneBookRepository.DeleteContact(todelcontact);
                return await unitofwork.SaveChange();
            }
            else
            {
                return false;
            }
            
        }
    



}
}
