using Microsoft.AspNetCore.Mvc;
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
        public ActionResult<Contact> GetContacts()
        {
            List<Contact> Contacts = context.Contacts.ToList();
            return Ok(Contacts); 
        }
        [HttpGet("id")]
        public ActionResult<Contact> GetContact(int id)
        {
            Contact findcontact = context.Contacts.Find(id);
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
        public IActionResult AddContact(Contact contact)
        {
            
            return Ok();
        }
        [HttpPut]
        public IActionResult UpdateContact(Contact contact)
        {
            return Ok();
        }
        [HttpDelete("id")]
        public IActionResult DeleteContact(int id)
        {

            return Ok();
        }
    }
}
