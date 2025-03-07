using PhoneBook.DBContext;
using Microsoft.EntityFrameworkCore;
using PhoneBook.Services;
using PhoneBook.Repositories;
using PhoneBook;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<PhoneBookContext>(
    options=>options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
    
    );

builder.Services.AddScoped<PhoneBookService>();
builder.Services.AddScoped<PhoneBookRepository>();
builder.Services.AddScoped<UnitOfWork>();
// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
