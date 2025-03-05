using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhoneBook.DBContext;
using PhoneBook.Models;

namespace PhoneBook.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PhoneBookController : ControllerBase
    {
        readonly PhoneBookContext context;
       public PhoneBookController(PhoneBookContext _context) {
            context = _context;
        }
        
        
        [HttpGet]
        public async Task<ActionResult<Contact>> GetContacts()
        {
            List<Contact> Contacts = await context.Contacts.ToListAsync();
            return Ok(Contacts); 
        }
        [HttpGet("id")]
        public async Task<ActionResult<Contact>> GetContact(int id)
        {
            Contact findcontact =await context.Contacts.FindAsync(id);
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
        public async Task<IActionResult> AddContact(Contact contact)
        {
             context.Contacts.Add(contact);
            await context.SaveChangesAsync();
            return Ok();
        }
        [HttpPut]
        public async Task<IActionResult> UpdateContact(Contact contact)
        {
           Contact EditContact =await context.Contacts.FindAsync(contact.id);
            if(contact!=null)
            {
                EditContact.Name = contact.Name;
                EditContact.Phone = contact.Phone;
                EditContact.Country_code = contact.Country_code;
                await context.SaveChangesAsync();
                return Ok(EditContact);
            }
            else
            {
                return NotFound();
            }
            
        }
        [HttpDelete("id")]
        public async Task<IActionResult> DeleteContact(int id)
        {
            Contact todelcontact = await context.Contacts.FindAsync(id);
            if(todelcontact!=null)
            {
                context.Contacts.Remove(todelcontact);
                await context.SaveChangesAsync();
                return Ok();
            }
            else
            {
                return NotFound();
            }
            
        }
    }
}
