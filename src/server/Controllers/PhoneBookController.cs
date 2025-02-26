using Microsoft.AspNetCore.Mvc;

namespace PhoneBook.Controllers
{
    public class PhoneBookController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
