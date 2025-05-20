using Microsoft.AspNetCore.Mvc;
using PhoneBook.Models;
using PhoneBook.DBContext;
using PhoneBook.Services;
using Microsoft.AspNetCore.Authorization;


namespace PhoneBook.Controllers
{
    [Route("api/Auth")]
    [ApiController]
    public class AuthController : Controller
    {
        private readonly IUserService _userservice;
        private JwtSetting _jwtsetting;
        public AuthController(IUserService userService , JwtSetting jwtsetting) {
            _userservice = userService;
            _jwtsetting = jwtsetting;
        }

        
        [HttpPost("Register")]
        public async Task<ActionResult<User>> Register(User newuser)
        {
            var AddedUser = await _userservice.AddUser(newuser);
            
            return Ok(AddedUser);
        }
        [HttpPost("Login")]
        public Task<string> Login(Login login) {

            return _userservice.LoginUser(login);
        }
        [Authorize]
        [HttpGet]
        public string protectedroute()
        {
            return "protected route got acces";
        }
    }
}
