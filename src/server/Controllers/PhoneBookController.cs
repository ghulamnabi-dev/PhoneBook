using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhoneBook.Services;
using PhoneBook.Models;

namespace PhoneBook.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PhoneBookController : ControllerBase
    {
        readonly PhoneBookService service;
       public PhoneBookController(PhoneBookService _Service) {
            service = _Service;
        }
        
        
        [HttpGet]
        public async Task<ActionResult<Contact>> GetContacts()
        {
            List<Contact> Contacts = await service.GetContacts();
            if (Contacts!=null) { 
            return Ok(Contacts);
            }
            else
            {
                return NoContent();
            }
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<Contact>> GetContact(int id)
        {
            Contact findcontact =await service.GetContact(id);
            if(findcontact!=null)
            {
                return Ok(findcontact);
            }
            else
            {
                return NotFound();
            }
        }
        [HttpPost]
        public async Task<IActionResult> AddContact([FromBody] Contact contact)
        {

            if (await service.AddContact(contact) != null)
            {
                return Ok(contact);
            }
            else
            {
                return BadRequest();
            }
        }
        [HttpPut]
        public async Task<IActionResult> UpdateContact(Contact contact)
        {
           Contact EditContact =await service.UpdateContact(contact);
            if(EditContact!=null)
            {
               return Ok(EditContact);
            }
            else
            {
                return NotFound();
            }
            
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteContact(int id)
        {
            
            if (await service.DeleteContact(id))
            {
                return NoContent();
            }
            else
            {
                return NotFound();
            }
            
        }
    }
}
