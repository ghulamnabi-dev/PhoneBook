using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using PhoneBook.DTOs;
using PhoneBook.Models;
using PhoneBook.Repositories;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PhoneBook.Services
{
    public interface IUserService
    {
        public Task<UserDTO> AddUser(User user);
        public Task<string> LoginUser(Login login);


    }
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly JwtSetting _jwtsetting;
        public UserService(IUserRepository userRepository, IPasswordHasher<User> passwordHasher,JwtSetting jwtsetting)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _jwtsetting = jwtsetting;   
        }
        public async Task<UserDTO> AddUser(User user)
        {
            user.Password = _passwordHasher.HashPassword(user, user.Password);
            UserDTO userdto = new UserDTO();
            userdto.Name = user.Name;
            userdto.message = "user added successfully";

            await _userRepository.AddUser(user);
            return userdto;
        }
        public async Task<string> LoginUser(Login user)
        {

            var Userfound = await _userRepository.LoginUser(user);
            if (Userfound != null)
            {
                Userfound.Password=Userfound.Password.ToString();
                var compared = _passwordHasher.VerifyHashedPassword(Userfound, Userfound.Password, user.password);
                if (compared == PasswordVerificationResult.Success)
                {
                    var jwthandler = new JwtSecurityTokenHandler();
                    var key = Encoding.UTF8.GetBytes(_jwtsetting.SecretKey);
                    var jwtdescripter = new SecurityTokenDescriptor
                    {
                        Subject = new ClaimsIdentity(new[]  {
                            new Claim(ClaimTypes.Name,Userfound.Name),
                            new Claim(ClaimTypes.NameIdentifier,Userfound.id.ToString())

                        }),
                        Expires = DateTime.UtcNow.AddMinutes(_jwtsetting.ExpirationMinutes),
                        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key),
                        SecurityAlgorithms.HmacSha256Signature
                        )

                    };
                    var token = jwthandler.CreateToken(jwtdescripter);


                    return jwthandler.WriteToken(token);

                }
                else
                {
                    return "password not correct";
                }

            }
            else
            {
                return "user not found";
            }


        }
    }
}
