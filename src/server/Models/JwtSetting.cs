namespace PhoneBook.Models
{
    public class JwtSetting
    {
        public string SecretKey { get; set; }   
       public int ExpirationMinutes { get; set; }
    }
}
