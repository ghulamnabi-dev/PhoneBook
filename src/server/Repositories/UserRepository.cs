using PhoneBook.DBContext;
using PhoneBook.Models;
using Microsoft.EntityFrameworkCore;

namespace PhoneBook.Repositories
{
    public interface IUserRepository
    {
        public Task<User> AddUser(User user);
        public  Task<User> LoginUser(Login login);
    }
    public class UserRepositry:IUserRepository
    {
        private readonly UserContext _userContext;
        public UserRepositry(UserContext usercontext) {
        _userContext = usercontext;
       
        }
            public async Task<User> AddUser(User user){
            var newuser = user;
            _userContext.Users.Add(newuser);
            await _userContext.SaveChangesAsync();
            return newuser;
        }
        public async Task<User> LoginUser(Login login) { 
        
            var Userfound= await _userContext.Users.FirstOrDefaultAsync(l=> l.UserName == login.UserName);
            Console.WriteLine(Userfound);
            return Userfound;
        }
    }
}
